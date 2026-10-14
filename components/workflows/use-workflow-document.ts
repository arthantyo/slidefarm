'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import type { Project, Template, Workflow } from '@/types';
import { STARTER_TEMPLATES } from '@/lib/canvas/templates';
import { extractPlaceholderKeys } from '@/lib/canvas/template-filler';
import { useCustomTemplateStore } from '@/stores/custom-template-store';
import { useProjectStore } from '@/stores/project-store';
import { defaultPositions } from './workflow-canvas';
import type { NodeStatus } from './workflow-canvas';
import { canConnect, defaultWorkflowConnections, nodeType } from '@/lib/workflows/graph';
import type { NodeId, NodeType } from '@/lib/workflows/graph';

const newWorkflow = (): Workflow => ({
  id: nanoid(10), name: 'Untitled workflow', sourceType: 'json', sourceJson: '{}', nodes: [],
  systemPrompt: 'Create clear, engaging social media content for this template.',
  templateId: '', exportFormat: 'zip', createdAt: Date.now(), updatedAt: Date.now(),
});

export function useWorkflowDocument(workflowId: string) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [draft, setDraft] = useState<Workflow | null>(() => workflowId === 'new' ? newWorkflow() : null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [statuses, setStatuses] = useState<Partial<Record<NodeId, NodeStatus>>>({});
  const [reviewProject, setReviewProject] = useState<Project | null>(null);
  const [reviewSlideIndex, setReviewSlideIndex] = useState(0);
  const customTemplates = useCustomTemplateStore((state) => state.templates);
  const loadTemplates = useCustomTemplateStore((state) => state.load);
  const folders = useProjectStore((state) => state.folders);
  const loadProjects = useProjectStore((state) => state.load);
  const projects = useProjectStore((state) => state.projects);
  const templates: Template[] = useMemo(() => [...STARTER_TEMPLATES, ...customTemplates], [customTemplates]);
  const template = useMemo(() => templates.find((item) => item.id === draft?.templateId), [templates, draft?.templateId]);
  const keys = useMemo(() => template ? extractPlaceholderKeys(template.slides) : [], [template]);
  const nodeIds = draft?.nodes;
  const connectionData = draft?.connections;
  const hasDraft = Boolean(draft);
  const nodes: NodeId[] = useMemo(() => nodeIds ?? (hasDraft ? ['source', 'template', 'export'] : []), [nodeIds, hasDraft]);
  const connections = useMemo(() => connectionData ?? (hasDraft ? defaultWorkflowConnections(nodes) : []), [connectionData, hasDraft, nodes]);
  const position = useCallback((node: NodeId) => draft?.nodePositions?.[node] ?? (nodeType(node) === 'export' && !nodes.includes('project') ? { x: 840, y: 100 } : defaultPositions[nodeType(node)]), [draft?.nodePositions, nodes]);
  const update = (change: Partial<Workflow>) => setDraft((current) => current ? { ...current, ...change } : current);
  const addNode = (node: NodeType, at: { x: number; y: number }) => {
    if (!draft || (node !== 'export' && nodes.includes(node))) return;
    const id: NodeId = node === 'export' && nodes.includes('export') ? `export:${nanoid(8)}` : node;
    const nextNodes = [...nodes, id];
    update({ nodes: nextNodes, connections, nodePositions: { ...draft.nodePositions, [id]: at } });
  };
  const removeNode = (node: NodeId) => update({ nodes: nodes.filter((item) => item !== node), connections: connections.filter((edge) => edge.from !== node && edge.to !== node) });
  const connect = (from: NodeId, to: NodeId) => {
    if (canConnect(nodes, connections, from, to)) update({ connections: [...connections, { from, to }] });
  };
  const disconnect = (from: NodeId, to: NodeId) => update({ connections: connections.filter((edge) => edge.from !== from || edge.to !== to) });
  const selectTemplate = (id: string) => {
    const next = templates.find((item) => item.id === id);
    if (!next) return;
    const counts = new Map<string, number>();
    for (const slide of next.slides) for (const element of slide.elements) {
      if ((element.type === 'text' || element.type === 'image') && element.placeholder) counts.set(element.placeholder, (counts.get(element.placeholder) ?? 0) + 1);
    }
    const sourceJson = JSON.stringify(
      Object.fromEntries(Array.from(counts, ([key, count]) => [
        key,
        count > 1 ? Array(count).fill('') : '',
      ])),
      null,
      2,
    );
    update({ templateId: id, sourceJson });
  };

  useEffect(() => {
    void loadTemplates();
    void loadProjects();
    void fetch('/api/workflows', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Could not load workflows.');
      return response.json() as Promise<{ workflows: Workflow[] }>;
    }).then((result) => {
      setWorkflows(result.workflows);
      if (workflowId !== 'new') {
        const selected = result.workflows.find((item) => item.id === workflowId);
        if (selected) {
          setDraft(selected);
          if (selected.pendingProjectId) setStatuses({ source: 'complete', template: 'complete', project: 'paused' });
        } else setError('Workflow not found.');
      }
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load workflows.'))
      .finally(() => setLoaded(true));
  }, [loadTemplates, loadProjects, workflowId]);

  useEffect(() => {
    if (!draft?.pendingProjectId || !useProjectStore.getState().loaded) return;
    const pending = useProjectStore.getState().get(draft.pendingProjectId);
    if (pending) setReviewProject(pending);
    else setError('The project waiting for review could not be found.');
  }, [draft?.pendingProjectId, projects]);

  const updateReviewText = (slideId: string, elementId: string, text: string) => {
    setReviewProject((project) => project ? { ...project, slides: project.slides.map((slide) => slide.id === slideId ? { ...slide, elements: slide.elements.map((element) => element.type === 'text' && element.id === elementId ? { ...element, text } : element) } : slide) } : project);
  };
  const persist = async (next: Workflow[]) => {
    const response = await fetch('/api/workflows', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
    if (!response.ok) throw new Error('Could not save workflows.');
    setWorkflows(next);
  };
  const save = async () => {
    if (!draft) return false;
    if (!draft.name.trim()) { setError('Give the workflow a name.'); return false; }
    setBusy(true); setSaving(true); setError(''); setMessage('');
    try {
      const saved = { ...draft, name: draft.name.trim(), updatedAt: Date.now() };
      await persist(workflows.some((item) => item.id === saved.id) ? workflows.map((item) => item.id === saved.id ? saved : item) : [...workflows, saved]);
      setDraft(saved);
      if (workflowId === 'new') router.replace(`/workflows/${saved.id}`);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save workflow.');
      return false;
    } finally { setBusy(false); setSaving(false); }
  };
  const setNodeStatus = (node: NodeId, status: NodeStatus) => setStatuses((current) => ({ ...current, [node]: status }));
  return { workflows, draft, setDraft, loaded, busy, saving, setBusy, error, setError, message, setMessage, statuses, setStatuses, setNodeStatus, reviewProject, setReviewProject, reviewSlideIndex, setReviewSlideIndex, folders, templates, template, keys, nodes, connections, position, update, addNode, removeNode, connect, disconnect, selectTemplate, updateReviewText, persist, save };
}

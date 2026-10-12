'use client';

import { useRouter } from 'next/navigation';
import { fillTemplateFromData } from '@/lib/canvas/template-filler';
import { parseSourceJson, sourceToTemplateData } from '@/lib/workflows/data';
import { exportWorkflowToMedia } from '@/lib/workflows/export-media';
import { useProjectStore } from '@/stores/project-store';
import { nodeType, reachableNodes, workflowConnections } from '@/lib/workflows/graph';
import type { NodeId } from '@/lib/workflows/graph';
import type { useWorkflowDocument } from './use-workflow-document';

export function useWorkflowExecution(workflowId: string, document: ReturnType<typeof useWorkflowDocument>, onReviewOpen: () => void) {
  const router = useRouter();
  const { draft, workflows, nodes, template, keys, folders, reviewProject, setDraft, setReviewProject, setReviewSlideIndex, persist, setBusy, setError, setMessage, setStatuses, setNodeStatus } = document;
  const exportNodes = (afterReview: boolean): NodeId[] => {
    if (!draft) return [];
    const edges = workflowConnections(draft);
    const fromProject = new Set<NodeId>(['project']);
    const queue: NodeId[] = ['project'];
    while (queue.length) {
      const id = queue.shift()!;
      for (const edge of edges.filter((item) => item.from === id)) if (!fromProject.has(edge.to)) { fromProject.add(edge.to); queue.push(edge.to); }
    }
    const reachable = reachableNodes(draft);
    return nodes.filter((id) => nodeType(id) === 'export' && reachable.has(id) && fromProject.has(id) === afterReview);
  };
  const runExports = async (project: NonNullable<typeof reviewProject>, ids: NodeId[]) => {
    if (!draft) return;
    for (const id of ids) {
      setNodeStatus(id, 'processing');
      await exportWorkflowToMedia(project, { ...draft, exportFormat: draft.exportFormats?.[id] ?? draft.exportFormat });
      setNodeStatus(id, 'complete');
    }
  };

  const continueWorkflow = async () => {
    if (!draft || !reviewProject) return;
    setBusy(true); setError('');
    try {
      if (!(await useProjectStore.getState().save(reviewProject))) throw new Error('Could not save reviewed project.');
      setNodeStatus('project', 'complete');
      await runExports(reviewProject, exportNodes(true));
      const saved = { ...draft, pendingProjectId: null, updatedAt: Date.now() };
      await persist(workflows.map((item) => item.id === saved.id ? saved : item));
      setDraft(saved);
      setReviewProject(null);
      setMessage(exportNodes(true).length ? 'Review complete. Exports saved to Media.' : 'Review complete. Project saved.');
    } catch (cause) {
      setStatuses((current) => { const active = (Object.keys(current) as NodeId[]).find((id) => current[id] === 'processing'); return active ? { ...current, [active]: 'error' } : current; });
      setError(cause instanceof Error ? cause.message : 'Could not continue workflow.');
    } finally { setBusy(false); }
  };
  const openFullEditor = async () => {
    if (!reviewProject) return;
    setBusy(true); setError('');
    try {
      if (!(await useProjectStore.getState().save(reviewProject))) throw new Error('Could not save reviewed project.');
      router.push(`/editor/${reviewProject.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open project.');
    } finally { setBusy(false); }
  };
  const run = async () => {
    if (!draft) return;
    setError(''); setMessage(''); setBusy(true);
    try {
      if (draft.pendingProjectId) throw new Error('Finish the queued review before starting another run.');
      if (!draft.name.trim()) throw new Error('Give the workflow a name.');
      const reachable = reachableNodes(draft);
      if (!reachable.has('template') || !workflowConnections(draft).some((edge) => edge.from === 'source' && edge.to === 'template')) throw new Error('Connect Source to Template.');
      const hasReview = reachable.has('project') && workflowConnections(draft).some((edge) => edge.from === 'template' && edge.to === 'project');
      const immediateExports = exportNodes(false).filter((id) => workflowConnections(draft).some((edge) => edge.from === 'template' && edge.to === id));
      if (!hasReview && !immediateExports.length) throw new Error('Connect Template to a review queue or export node.');
      if (!template) throw new Error('Choose a template.');
      if (template.slides.length === 0) throw new Error('The template has no slides.');
      setStatuses({ source: 'processing' });
      await new Promise((resolve) => setTimeout(resolve, 150));
      const source = parseSourceJson(draft.sourceJson);
      let data = draft.sourceType === 'json' ? sourceToTemplateData(source) : {};
      if (draft.sourceType === 'ai') {
        if (!draft.systemPrompt.trim()) throw new Error('Enter an AI system prompt.');
        if (!keys.length) throw new Error('This template has no placeholders for the AI agent to fill.');
        const imageSubjectKeys = Array.from(new Set(template.slides.flatMap((slide) => slide.elements.flatMap((element) => element.type === 'image' && element.placeholder && element.aiPlaceholderPrompt?.trim() ? [element.placeholder] : []))));
        const response = await fetch('/api/ai/workflow-content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemPrompt: draft.systemPrompt, source, placeholderKeys: keys, imageSubjectKeys }) });
        const result = await response.json() as { data?: Record<string, string | string[]>; error?: string };
        if (!response.ok || !result.data) throw new Error(result.error || 'AI generation failed.');
        data = result.data;
      }
      if (keys.length && keys.some((key) => !(key in data))) throw new Error(`Missing template values: ${keys.filter((key) => !(key in data)).join(', ')}`);
      setNodeStatus('source', 'complete');
      setNodeStatus('template', 'processing');
      await new Promise((resolve) => setTimeout(resolve, 150));
      const project = fillTemplateFromData(template, data, `${draft.name} - ${new Date().toLocaleString()}`);
      const imageOccurrences = new Map<string, number>();
      for (let slideIndex = 0; slideIndex < template.slides.length; slideIndex++) {
        for (let elementIndex = 0; elementIndex < template.slides[slideIndex].elements.length; elementIndex++) {
          const original = template.slides[slideIndex].elements[elementIndex];
          const target = project.slides[slideIndex].elements[elementIndex];
          if (original.type !== 'image' || target.type !== 'image' || !original.placeholder || !original.aiPlaceholderPrompt?.trim()) continue;
          const value = data[original.placeholder];
          const index = imageOccurrences.get(original.placeholder) ?? 0;
          imageOccurrences.set(original.placeholder, index + 1);
          const subject = (Array.isArray(value) ? value[index] : value)?.trim();
          if (!subject) throw new Error(`Missing image subject for ${original.placeholder}.`);
          const prompt = `${original.aiPlaceholderPrompt.trim()} ${subject}`;
          const response = await fetch('/api/ai/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, width: original.width, height: original.height }) });
          const result = await response.json() as { src?: string; error?: string };
          if (!response.ok || !result.src) throw new Error(result.error || `Could not generate image for ${original.placeholder}.`);
          target.src = result.src;
          target.imagePrompt = prompt;
        }
      }
      setNodeStatus('template', 'complete');
      await runExports(project, immediateExports);
      if (hasReview) {
        setNodeStatus('project', 'processing');
        if (draft.projectFolderId && !folders.some((folder) => folder.id === draft.projectFolderId)) throw new Error('Choose an existing project folder.');
        project.folderId = draft.projectFolderId ?? null;
        if (!(await useProjectStore.getState().save(project))) throw new Error(useProjectStore.getState().storageError ?? 'Could not save project.');
      }
      const saved = { ...draft, name: draft.name.trim(), pendingProjectId: hasReview ? project.id : null, updatedAt: Date.now() };
      await persist(workflows.some((item) => item.id === saved.id) ? workflows.map((item) => item.id === saved.id ? saved : item) : [...workflows, saved]);
      setDraft(saved);
      if (hasReview) {
        setReviewProject(project);
        setReviewSlideIndex(0);
        onReviewOpen();
        setNodeStatus('project', 'paused');
        setMessage('Workflow paused for review. Check the slides, make changes, then continue.');
        if (workflowId === 'new') router.replace(`/workflows/${saved.id}`);
        return;
      }
      setMessage('Exports saved to Media.');
    } catch (cause) {
      setStatuses((current) => {
        const active = (Object.keys(current) as NodeId[]).find((node) => current[node] === 'processing');
        return active ? { ...current, [active]: 'error' } : current;
      });
      setError(cause instanceof Error ? cause.message : 'Workflow failed.');
    } finally { setBusy(false); }
  };
  return { run, continueWorkflow, openFullEditor };
}

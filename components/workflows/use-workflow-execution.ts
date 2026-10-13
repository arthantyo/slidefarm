'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fillTemplateFromData } from '@/lib/canvas/template-filler';
import { exportWorkflowToMedia } from '@/lib/workflows/export-media';
import { useProjectStore } from '@/stores/project-store';
import { nodeType, reachableNodes, workflowConnections } from '@/lib/workflows/graph';
import type { NodeId } from '@/lib/workflows/graph';
import type { useWorkflowDocument } from './use-workflow-document';

export function useWorkflowExecution(workflowId: string, document: ReturnType<typeof useWorkflowDocument>, onReviewOpen: () => void) {
  const router = useRouter();
  const resumed = useRef(false);
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
      const jobKey = `slidefarm-workflow-job:${draft.id}`;
      let jobId = localStorage.getItem(jobKey);
      if (!jobId) {
        const queued = await fetch('/api/workflow-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflow: draft, template }) });
        const result = await queued.json() as { jobId?: string; error?: string };
        if (!queued.ok || !result.jobId) throw new Error(result.error || 'Could not queue workflow.');
        jobId = result.jobId;
        localStorage.setItem(jobKey, jobId);
      }
      setMessage('Workflow queued. Generating content in the background.');
      let job: { status: string; data?: Record<string, string | string[]>; images?: Record<string, string>; error?: string };
      do {
        const response = await fetch(`/api/workflow-jobs/${jobId}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load workflow job.');
        ({ job } = await response.json() as { job: typeof job });
        if (job.status === 'failed') { localStorage.removeItem(jobKey); throw new Error(job.error || 'Workflow failed.'); }
        if (job.status !== 'ready' && job.status !== 'complete') await new Promise((resolve) => setTimeout(resolve, 2000));
      } while (job.status !== 'ready' && job.status !== 'complete');
      if (!job.data) throw new Error('Workflow job has no generated data.');
      const data = job.data;
      setNodeStatus('source', 'complete');
      setNodeStatus('template', 'processing');
      const project = fillTemplateFromData(template, data, `${draft.name} - ${new Date().toLocaleString()}`);
      for (const [location, src] of Object.entries(job.images ?? {})) {
        const [slideIndex, elementIndex] = location.split(':').map(Number);
        const target = project.slides[slideIndex]?.elements[elementIndex];
        const original = template.slides[slideIndex]?.elements[elementIndex];
        if (target?.type === 'image' && original?.type === 'image') {
          target.src = src;
          const value = data[original.placeholder ?? ''];
          const subject = Array.isArray(value) ? value[0] : value;
          target.imagePrompt = `${original.aiPlaceholderPrompt?.trim() ?? ''} ${subject ?? ''}`.trim();
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
      const completed = await fetch(`/api/workflow-jobs/${jobId}`, { method: 'PATCH' });
      if (!completed.ok) throw new Error('Could not mark workflow job complete.');
      localStorage.removeItem(jobKey);
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
  useEffect(() => {
    if (!document.loaded || !draft || resumed.current) return;
    if (!localStorage.getItem(`slidefarm-workflow-job:${draft.id}`)) return;
    resumed.current = true;
    void run();
    // Resume the saved job once when the workflow document loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.loaded, draft?.id]);
  return { run, continueWorkflow, openFullEditor };
}

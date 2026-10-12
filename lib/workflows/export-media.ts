import type { Project, Workflow } from '@/types';
import { exportProject, exportSlide } from '@/lib/export';

export async function exportWorkflowToMedia(project: Project, workflow: Workflow): Promise<void> {
  const output = await exportProject(project, workflow.exportFormat);
  const preview = await exportSlide(project.slides[0], project.dimensions.width, project.dimensions.height, 'png');
  const form = new FormData();
  form.append('workflowId', workflow.id);
  form.append('workflowName', workflow.name);
  form.append('projectName', project.name);
  form.append('format', workflow.exportFormat);
  form.append('output', output, `output.${workflow.exportFormat}`);
  form.append('preview', preview, 'preview.png');
  const response = await fetch('/api/media', { method: 'POST', body: form });
  if (!response.ok) throw new Error('Could not save exported media.');
}

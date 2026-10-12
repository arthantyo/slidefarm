import type { Project } from '@/types';
import { useProjectStore } from '@/stores/project-store';
import { useCustomTemplateStore } from '@/stores/custom-template-store';
import { updateCustomTemplateFromProject } from './template-filler';

export function editingTemplateId(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('editTemplate');
}

/** Save the open document. Template editing writes the template and does not create a project. */
export async function saveEditorProject(project: Project): Promise<boolean> {
  const templateId = editingTemplateId();
  if (!templateId) return useProjectStore.getState().save(project);

  const templateStore = useCustomTemplateStore.getState();
  await templateStore.load();
  const existing = templateStore.get(templateId);
  if (!existing) {
    useCustomTemplateStore.setState({ storageError: 'Could not find the template being edited.' });
    return false;
  }
  return templateStore.save(updateCustomTemplateFromProject(project, existing));
}

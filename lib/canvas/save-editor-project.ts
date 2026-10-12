import type { Project } from '@/types';
import { useProjectStore } from '@/stores/project-store';
import { useCustomTemplateStore } from '@/stores/custom-template-store';
import { updateCustomTemplateFromProject } from './template-filler';

/** Save the working project and, when editing a template, its source template. */
export async function saveEditorProject(project: Project): Promise<boolean> {
  if (!await useProjectStore.getState().save(project)) return false;
  if (typeof window === 'undefined') return true;

  const templateId = new URLSearchParams(window.location.search).get('editTemplate');
  if (!templateId) return true;

  const templateStore = useCustomTemplateStore.getState();
  await templateStore.load();
  const existing = templateStore.get(templateId);
  if (!existing) {
    useCustomTemplateStore.setState({ storageError: 'Could not find the template being edited.' });
    return false;
  }
  return templateStore.save(updateCustomTemplateFromProject(project, existing));
}

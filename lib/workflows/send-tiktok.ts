import type { Project, Workflow } from '@/types';
import { exportSlide } from '@/lib/export';

export async function sendWorkflowToTikTok(project: Project, workflow: Workflow, node: 'draft' | 'post'): Promise<void> {
  const settings = workflow.tiktok?.[node];
  if (!settings?.openId || !settings.uploadConsent) throw new Error(`Configure the TikTok ${node} node and agree to upload its slides.`);
  if (!project.slides.length || project.slides.length > 35) throw new Error('TikTok requires 1–35 slides.');
  const form = new FormData();
  for (let index = 0; index < project.slides.length; index++) {
    const image = await exportSlide(project.slides[index], project.dimensions.width, project.dimensions.height, 'jpg', 0.92);
    form.append('images', image, `slide-${index + 1}.jpg`);
  }
  const uploaded = await fetch('/api/tiktok/assets', { method: 'POST', body: form });
  const uploadResult = await uploaded.json() as { urls?: string[]; error?: string };
  if (!uploaded.ok || !uploadResult.urls) throw new Error(uploadResult.error || 'Could not upload TikTok slides.');
  const response = await fetch(`/api/tiktok/${node}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(node === 'draft' ? {
      openId: settings.openId, title: settings.title, description: settings.description,
      images: uploadResult.urls, isAigc: settings.isAigc, uploadConsent: true,
    } : {
      openId: settings.openId, title: settings.title, description: settings.description,
      images: uploadResult.urls, isAigc: settings.isAigc, privacyLevel: settings.privacyLevel,
      disableComment: false, autoAddMusic: false, brandContent: false, brandOrganic: false,
    }),
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error || `Could not send TikTok ${node}.`);
}

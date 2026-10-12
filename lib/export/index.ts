import type { Project, Slide } from '@/types';
import { slideToDataURL, dataUrlToBlob } from './svg-renderer';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

export type ExportFormat = 'png' | 'jpg' | 'pdf' | 'zip' | 'json';

export async function exportSlide(
  slide: Slide,
  width: number,
  height: number,
  format: 'png' | 'jpg',
  quality = 1,
): Promise<Blob> {
  const dataUrl = await slideToDataURL(slide, width, height, format === 'jpg' ? 'jpeg' : 'png', quality);
  return dataUrlToBlob(dataUrl);
}

export async function exportProject(
  project: Project,
  format: ExportFormat,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const { width, height } = project.dimensions;

  if (format === 'json') {
    const json = JSON.stringify(project, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  if (format === 'pdf') {
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
    });

    for (let i = 0; i < project.slides.length; i++) {
      onProgress?.(i + 1, project.slides.length);
      const dataUrl = await slideToDataURL(project.slides[i], width, height, 'jpeg', 0.92);
      if (i > 0) pdf.addPage([width, height], width > height ? 'landscape' : 'portrait');
      pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
    }

    return pdf.output('blob');
  }

  if (format === 'zip') {
    const zip = new JSZip();
    for (let i = 0; i < project.slides.length; i++) {
      onProgress?.(i + 1, project.slides.length);
      const dataUrl = await slideToDataURL(project.slides[i], width, height, 'png');
      const base64 = dataUrl.split(',')[1];
      zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, base64, { base64: true });
    }
    return zip.generateAsync({ type: 'blob' });
  }

  // Single image — export first slide
  return exportSlide(project.slides[0], width, height, format);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase();
}

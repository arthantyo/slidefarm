import type { Slide, Theme, CanvasElement, BackgroundElement, TextElement, ShapeElement, ImageElement } from '@/types';

function renderElementToSVG(el: CanvasElement, width: number, height: number): string {
  if (!el.visible) return '';

  const transform = el.rotation ? ` transform="rotate(${el.rotation} ${el.x + el.width / 2} ${el.y + el.height / 2})"` : '';
  const opacity = el.opacity !== 1 ? ` opacity="${el.opacity}"` : '';

  if (el.type === 'background') {
    const bg = el as BackgroundElement;
    if (bg.fillType === 'gradient' && bg.gradientColor2) {
      const angle = bg.gradientAngle ?? 135;
      const rad = (angle * Math.PI) / 180;
      const x2 = width * Math.cos(rad);
      const y2 = height * Math.sin(rad);
      return `<defs><linearGradient id="bg-${bg.id}" x1="0" y1="0" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${bg.fill}"/><stop offset="1" stop-color="${bg.gradientColor2}"/></linearGradient></defs><rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg-${bg.id})"/>`;
    }
    return `<rect x="0" y="0" width="${width}" height="${height}" fill="${bg.fill}"/>`;
  }

  if (el.type === 'text') {
    const t = el as TextElement;
    const fontStyle = t.fontStyle === 'bold-italic' ? 'bold italic'
      : t.fontStyle === 'bold' ? 'bold'
      : t.fontStyle === 'italic' ? 'italic'
      : 'normal';
    const fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal';
    const fontStyleAttr = fontStyle.includes('italic') ? 'italic' : 'normal';
    const anchor = t.align === 'center' ? 'middle' : t.align === 'right' ? 'end' : 'start';
    const textX = t.align === 'center' ? t.x + t.width / 2 : t.align === 'right' ? t.x + t.width - t.padding : t.x + t.padding;
    const textY = t.verticalAlign === 'middle' ? t.y + t.height / 2 : t.verticalAlign === 'bottom' ? t.y + t.height - t.padding : t.y + t.padding;

    // Split text into lines for proper rendering
    const lines = t.text.split('\n');
    const lineHeight = t.fontSize * t.lineHeight;

    return `<g${transform}${opacity}>${lines.map((line, i) => {
      const y = t.verticalAlign === 'middle'
        ? textY - ((lines.length - 1) * lineHeight) / 2 + i * lineHeight
        : textY + i * lineHeight;
      return `<text x="${textX}" y="${y}" font-family="${t.fontFamily}" font-size="${t.fontSize}" font-weight="${fontWeight}" font-style="${fontStyleAttr}" fill="${t.fill}" text-anchor="${anchor}" letter-spacing="${t.letterSpacing}">${escapeXML(line)}</text>`;
    }).join('')}</g>`;
  }

  if (el.type === 'image') {
    const img = el as ImageElement;
    const clipPath = img.cornerRadius > 0
      ? `<clipPath id="clip-${img.id}"><rect x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" rx="${img.cornerRadius}"/></clipPath>`
      : '';
    const clipAttr = img.cornerRadius > 0 ? ` clip-path="url(#clip-${img.id})"` : '';
    return `${clipPath}<image x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" href="${img.src}"${clipAttr}${transform}${opacity} preserveAspectRatio="${img.objectFit === 'cover' ? 'xMidYMid slice' : img.objectFit === 'contain' ? 'xMidYMid meet' : 'none'}"/>`;
  }

  if (el.type === 'shape') {
    const s = el as ShapeElement;
    const stroke = s.strokeWidth > 0 ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth}"` : '';

    if (s.shape === 'rect') {
      return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.cornerRadius}" fill="${s.fill}"${stroke}${transform}${opacity}/>`;
    }
    if (s.shape === 'ellipse') {
      return `<ellipse cx="${s.x + s.width / 2}" cy="${s.y + s.height / 2}" rx="${s.width / 2}" ry="${s.height / 2}" fill="${s.fill}"${stroke}${transform}${opacity}/>`;
    }
    if (s.shape === 'triangle') {
      const cx = s.x + s.width / 2;
      return `<polygon points="${cx},${s.y} ${s.x + s.width},${s.y + s.height} ${s.x},${s.y + s.height}" fill="${s.fill}"${stroke}${transform}${opacity}/>`;
    }
    if (s.shape === 'star' || s.shape === 'polygon') {
      const sides = s.sides ?? 5;
      const cx = s.x + s.width / 2;
      const cy = s.y + s.height / 2;
      const r = Math.min(s.width, s.height) / 2;
      const pts = Array.from({ length: sides }, (_, i) => {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="${s.fill}"${stroke}${transform}${opacity}/>`;
    }
    if (s.shape === 'line') {
      return `<line x1="${s.x}" y1="${s.y + s.height / 2}" x2="${s.x + s.width}" y2="${s.y + s.height / 2}" stroke="${s.fill}" stroke-width="${s.strokeWidth || 4}"${transform}${opacity} stroke-linecap="round"/>`;
    }
  }

  return '';
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function slideToSVG(slide: Slide, width: number, height: number): string {
  const elements = slide.elements.map((el) => renderElementToSVG(el, width, height)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${elements}</svg>`;
}

export function slideToDataURL(slide: Slide, width: number, height: number, type: 'png' | 'jpeg' = 'png', quality = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const svg = slideToSVG(slide, width, height);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL(type === 'png' ? 'image/png' : 'image/jpeg', quality);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render slide'));
    };
    img.src = url;
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

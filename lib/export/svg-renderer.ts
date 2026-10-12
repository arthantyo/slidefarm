import type { Slide, CanvasElement, BackgroundElement, TextElement, ShapeElement, ImageElement } from '@/types';
import { getWrappedLines } from './text-wrap';
import { renderSlideToCanvas } from './canvas-renderer';
import { getTextFontWeight, isTextItalic } from '@/lib/canvas/text-style';
import { elementsInLayerOrder } from '@/lib/canvas/layers';

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
    const fontWeight = getTextFontWeight(t);
    const fontStyleAttr = isTextItalic(t) ? 'italic' : 'normal';

    const padding = t.padding || 0;
    const maxWidth = Math.max(10, t.width - padding * 2);

    const lines = getWrappedLines(
      t.text,
      maxWidth,
      t.fontFamily,
      t.fontSize,
      String(fontWeight),
      fontStyleAttr,
      t.letterSpacing
    );

    const lineHeight = t.fontSize * (t.lineHeight || 1.3);
    const totalTextHeight = lines.length * lineHeight;
    const availableHeight = Math.max(10, t.height - padding * 2);

    let startY = t.y + padding;
    if (t.verticalAlign === 'middle') {
      startY = t.y + padding + (availableHeight - totalTextHeight) / 2;
    } else if (t.verticalAlign === 'bottom') {
      startY = t.y + t.height - padding - totalTextHeight;
    }

    const anchor = t.align === 'center' ? 'middle' : t.align === 'right' ? 'end' : 'start';
    const textX = t.align === 'center' ? t.x + t.width / 2 : t.align === 'right' ? t.x + t.width - padding : t.x + padding;
    const stroke = t.strokeWidth ? ` stroke="${t.stroke ?? '#000000'}" stroke-width="${t.strokeWidth}" paint-order="stroke fill" stroke-linejoin="round"` : '';

    return `<g${transform}${opacity}>${lines.map((line, i) => {
      const y = startY + i * lineHeight;
      return `<text x="${textX}" y="${y}" font-family="${t.fontFamily}" font-size="${t.fontSize}" font-weight="${fontWeight}" font-style="${fontStyleAttr}" fill="${t.fill}"${stroke} text-anchor="${anchor}" letter-spacing="${t.letterSpacing}" dominant-baseline="hanging">${escapeXML(line)}</text>`;
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
  const elements = elementsInLayerOrder(slide.elements).map((el) => renderElementToSVG(el, width, height)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${elements}</svg>`;
}

export async function slideToDataURL(
  slide: Slide,
  width: number,
  height: number,
  type: 'png' | 'jpeg' = 'png',
  quality = 1
): Promise<string> {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    await renderSlideToCanvas(slide, canvas, width, height);
    return canvas.toDataURL(type === 'png' ? 'image/png' : 'image/jpeg', quality);
  }
  return '';
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

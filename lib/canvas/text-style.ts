import type { TextElement } from '@/types';

export function getTextFontWeight(element: Pick<TextElement, 'fontStyle' | 'fontWeight'>): number {
  return element.fontWeight ?? (element.fontStyle === 'bold' || element.fontStyle === 'bold-italic' ? 700 : 400);
}

export function isTextItalic(element: Pick<TextElement, 'fontStyle'>): boolean {
  return element.fontStyle === 'italic' || element.fontStyle === 'bold-italic';
}

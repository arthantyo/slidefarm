import { nanoid } from 'nanoid';
import type {
  CanvasElement,
  TextElement,
  ImageElement,
  ShapeElement,
  BackgroundElement,
  ShapeKind,
} from '@/types';

export function createTextElement(partial: Partial<TextElement> & {
  x: number; y: number; width: number; height: number;
}): TextElement {
  return {
    id: nanoid(10),
    type: 'text',
    text: 'Double-click to edit',
    fontSize: 48,
    fontFamily: 'Inter',
    fontStyle: 'normal',
    textDecoration: 'none',
    fill: '#1a1a2e',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.3,
    letterSpacing: 0,
    wrap: 'word',
    padding: 16,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    name: 'Text',
    shadow: null,
    ...partial,
  };
}

export function createImageElement(partial: Partial<ImageElement> & {
  x: number; y: number; width: number; height: number; src: string;
}): ImageElement {
  return {
    id: nanoid(10),
    type: 'image',
    objectFit: 'cover',
    cornerRadius: 0,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    name: 'Image',
    shadow: null,
    ...partial,
  };
}

export function createShapeElement(partial: Partial<ShapeElement> & {
  x: number; y: number; width: number; height: number;
}): ShapeElement {
  return {
    id: nanoid(10),
    type: 'shape',
    shape: 'rect',
    fill: '#6366f1',
    stroke: '',
    strokeWidth: 0,
    cornerRadius: 0,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    name: 'Shape',
    shadow: null,
    ...partial,
  };
}

export function createBackgroundElement(partial: Partial<BackgroundElement>): BackgroundElement {
  return {
    id: 'background',
    type: 'background',
    fillType: 'solid',
    fill: '#ffffff',
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
    rotation: 0,
    opacity: 1,
    locked: true,
    visible: true,
    name: 'Background',
    gradientAngle: 135,
    gradientColor2: '#1a1a2e',
    ...partial,
  };
}

export function createElement(type: CanvasElement['type'], partial: Record<string, unknown>): CanvasElement | null {
  switch (type) {
    case 'text':
      return createTextElement(partial as Partial<TextElement> & { x: number; y: number; width: number; height: number });
    case 'image':
      return createImageElement(partial as Partial<ImageElement> & { x: number; y: number; width: number; height: number; src: string });
    case 'shape': {
      const el = createShapeElement(partial as Partial<ShapeElement> & { x: number; y: number; width: number; height: number });
      if (partial.shape) el.shape = partial.shape as ShapeKind;
      return el;
    }
    case 'background':
      return createBackgroundElement(partial as Partial<BackgroundElement>);
    default:
      return null;
  }
}

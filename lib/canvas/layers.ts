import type { CanvasElement } from '@/types';

export type LayerMove = 'forward' | 'backward' | 'front' | 'back';

export function elementsInLayerOrder(elements: CanvasElement[]): CanvasElement[] {
  return [
    ...elements.filter((element) => element.type === 'background'),
    ...elements.filter((element) => element.type !== 'background'),
  ];
}

export function moveElementLayer(
  elements: CanvasElement[],
  elementId: string,
  move: LayerMove,
): CanvasElement[] {
  const content = elements.filter((element) => element.type !== 'background');
  const index = content.findIndex((element) => element.id === elementId);
  if (index === -1) return elements;

  const target = move === 'front' ? content.length - 1
    : move === 'back' ? 0
    : move === 'forward' ? Math.min(content.length - 1, index + 1)
    : Math.max(0, index - 1);
  if (target === index) return elements;

  const [element] = content.splice(index, 1);
  content.splice(target, 0, element);
  return [...elements.filter((item) => item.type === 'background'), ...content];
}

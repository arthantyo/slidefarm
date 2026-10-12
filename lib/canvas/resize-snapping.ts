import type { CanvasElement } from '@/types';
import type { GuideLine, ResizeSnapResult } from './snapping-types';

interface ResizeSnappingOptions {
  elementId: string;
  handlePosition: string;
  x: number;
  y: number;
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  allElements: CanvasElement[];
  threshold?: number;
}

interface MatchResult {
  snappedPos: number;
  label: string;
  guide: GuideLine;
}

function findSnapMatch(
  edge: number,
  orientation: 'vertical' | 'horizontal',
  canvasDim: number,
  candidates: { pos: number; label: string; origin: 'canvas' | 'element'; id: string }[],
  threshold: number
): MatchResult | null {
  // First check canvas center and margins
  for (const c of candidates.filter((item) => item.origin === 'canvas')) {
    if (Math.abs(edge - c.pos) <= threshold) {
      return {
        snappedPos: c.pos,
        label: c.label,
        guide: {
          id: c.id,
          orientation,
          position: c.pos,
          origin: 'canvas',
          label: c.label,
        },
      };
    }
  }

  // Then check other elements
  for (const c of candidates.filter((item) => item.origin === 'element')) {
    if (Math.abs(edge - c.pos) <= threshold) {
      return {
        snappedPos: c.pos,
        label: c.label,
        guide: {
          id: c.id,
          orientation,
          position: c.pos,
          origin: 'element',
          label: c.label,
        },
      };
    }
  }

  return null;
}

export function calculateResizeSnapping({
  elementId,
  handlePosition,
  x,
  y,
  width,
  height,
  canvasWidth,
  canvasHeight,
  allElements,
  threshold = 8,
}: ResizeSnappingOptions): ResizeSnapResult {
  let snappedX = x;
  let snappedY = y;
  let snappedW = width;
  let snappedH = height;
  let snapLabelX: string | undefined;
  let snapLabelY: string | undefined;
  const guides: GuideLine[] = [];

  const others = allElements.filter(
    (el) => el.id !== elementId && el.visible && el.type !== 'background'
  );

  // 1. Horizontal Snapping (East / West)
  if (handlePosition.includes('e') || handlePosition.includes('w')) {
    const isEast = handlePosition.includes('e');
    const edge = isEast ? x + width : x;

    const xCandidates: { pos: number; label: string; origin: 'canvas' | 'element'; id: string }[] = [
      { pos: 0, label: 'Left Margin', origin: 'canvas', id: 'resize-canvas-left' },
      { pos: canvasWidth / 2, label: 'Canvas Center', origin: 'canvas', id: 'resize-canvas-center-x' },
      { pos: canvasWidth, label: 'Right Margin', origin: 'canvas', id: 'resize-canvas-right' },
    ];

    for (const other of others) {
      xCandidates.push(
        { pos: other.x, label: `Align Left (${other.name})`, origin: 'element', id: `resize-l-${other.id}` },
        { pos: other.x + other.width / 2, label: `Align Center (${other.name})`, origin: 'element', id: `resize-cx-${other.id}` },
        { pos: other.x + other.width, label: `Align Right (${other.name})`, origin: 'element', id: `resize-r-${other.id}` }
      );
    }

    const match = findSnapMatch(edge, 'vertical', canvasWidth, xCandidates, threshold);
    if (match) {
      if (isEast) {
        snappedW = Math.max(10, match.snappedPos - x);
      } else {
        const fixedRight = x + width;
        snappedX = match.snappedPos;
        snappedW = Math.max(10, fixedRight - match.snappedPos);
      }
      snapLabelX = match.label;
      guides.push(match.guide);
    }
  }

  // 2. Vertical Snapping (South / North)
  if (handlePosition.includes('s') || handlePosition.includes('n')) {
    const isSouth = handlePosition.includes('s');
    const edge = isSouth ? y + height : y;

    const yCandidates: { pos: number; label: string; origin: 'canvas' | 'element'; id: string }[] = [
      { pos: 0, label: 'Top Margin', origin: 'canvas', id: 'resize-canvas-top' },
      { pos: canvasHeight / 2, label: 'Canvas Center', origin: 'canvas', id: 'resize-canvas-center-y' },
      { pos: canvasHeight, label: 'Bottom Margin', origin: 'canvas', id: 'resize-canvas-bottom' },
    ];

    for (const other of others) {
      yCandidates.push(
        { pos: other.y, label: `Align Top (${other.name})`, origin: 'element', id: `resize-t-${other.id}` },
        { pos: other.y + other.height / 2, label: `Align Middle (${other.name})`, origin: 'element', id: `resize-cy-${other.id}` },
        { pos: other.y + other.height, label: `Align Bottom (${other.name})`, origin: 'element', id: `resize-b-${other.id}` }
      );
    }

    const match = findSnapMatch(edge, 'horizontal', canvasHeight, yCandidates, threshold);
    if (match) {
      if (isSouth) {
        snappedH = Math.max(10, match.snappedPos - y);
      } else {
        const fixedBottom = y + height;
        snappedY = match.snappedPos;
        snappedH = Math.max(10, fixedBottom - match.snappedPos);
      }
      snapLabelY = match.label;
      guides.push(match.guide);
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    width: snappedW,
    height: snappedH,
    guides,
    snappedX: !!snapLabelX,
    snappedY: !!snapLabelY,
    snapLabelX,
    snapLabelY,
  };
}

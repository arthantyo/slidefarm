import type { CanvasElement } from '@/types';
import type { GuideLine, SnapResult } from './snapping-types';

export type { GuideLine, SnapResult, ResizeSnapResult } from './snapping-types';
export { calculateResizeSnapping } from './resize-snapping';

interface SnappingOptions {
  draggedId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  allElements: CanvasElement[];
  threshold?: number;
}

export function calculateSnapping({
  draggedId,
  x,
  y,
  width,
  height,
  canvasWidth,
  canvasHeight,
  allElements,
  threshold = 8,
}: SnappingOptions): SnapResult {
  let snappedX = x;
  let snappedY = y;
  let hasSnappedX = false;
  let hasSnappedY = false;
  let snapLabelX: string | undefined;
  let snapLabelY: string | undefined;
  const guides: GuideLine[] = [];

  const dragCenterX = x + width / 2;
  const dragRight = x + width;
  const dragCenterY = y + height / 2;
  const dragBottom = y + height;

  // 1. Check vertical alignment against Canvas
  const canvasCenterX = canvasWidth / 2;
  if (Math.abs(dragCenterX - canvasCenterX) <= threshold) {
    snappedX = canvasCenterX - width / 2;
    hasSnappedX = true;
    snapLabelX = 'Center';
    guides.push({
      id: 'canvas-center-x',
      orientation: 'vertical',
      position: canvasCenterX,
      origin: 'canvas',
      label: 'Canvas Center',
    });
  } else if (Math.abs(x - 0) <= threshold) {
    snappedX = 0;
    hasSnappedX = true;
    snapLabelX = 'Left';
    guides.push({
      id: 'canvas-left',
      orientation: 'vertical',
      position: 0,
      origin: 'canvas',
      label: 'Left Margin',
    });
  } else if (Math.abs(dragRight - canvasWidth) <= threshold) {
    snappedX = canvasWidth - width;
    hasSnappedX = true;
    snapLabelX = 'Right';
    guides.push({
      id: 'canvas-right',
      orientation: 'vertical',
      position: canvasWidth,
      origin: 'canvas',
      label: 'Right Margin',
    });
  }

  // 2. Check horizontal alignment against Canvas
  const canvasCenterY = canvasHeight / 2;
  if (Math.abs(dragCenterY - canvasCenterY) <= threshold) {
    snappedY = canvasCenterY - height / 2;
    hasSnappedY = true;
    snapLabelY = 'Center';
    guides.push({
      id: 'canvas-center-y',
      orientation: 'horizontal',
      position: canvasCenterY,
      origin: 'canvas',
      label: 'Canvas Center',
    });
  } else if (Math.abs(y - 0) <= threshold) {
    snappedY = 0;
    hasSnappedY = true;
    snapLabelY = 'Top';
    guides.push({
      id: 'canvas-top',
      orientation: 'horizontal',
      position: 0,
      origin: 'canvas',
      label: 'Top Margin',
    });
  } else if (Math.abs(dragBottom - canvasHeight) <= threshold) {
    snappedY = canvasHeight - height;
    hasSnappedY = true;
    snapLabelY = 'Bottom';
    guides.push({
      id: 'canvas-bottom',
      orientation: 'horizontal',
      position: canvasHeight,
      origin: 'canvas',
      label: 'Bottom Margin',
    });
  }

  // 3. Check against other visible elements if not already snapped to canvas
  const otherElements = allElements.filter(
    (el) => el.id !== draggedId && el.visible && el.type !== 'background'
  );

  for (const other of otherElements) {
    const otherCenterX = other.x + other.width / 2;
    const otherRight = other.x + other.width;
    const otherCenterY = other.y + other.height / 2;
    const otherBottom = other.y + other.height;

    // Vertical snaps
    if (!hasSnappedX) {
      if (Math.abs(dragCenterX - otherCenterX) <= threshold) {
        snappedX = otherCenterX - width / 2;
        hasSnappedX = true;
        snapLabelX = 'Aligned Center';
        guides.push({
          id: `el-center-x-${other.id}`,
          orientation: 'vertical',
          position: otherCenterX,
          origin: 'element',
          label: other.name,
        });
      } else if (Math.abs(x - other.x) <= threshold) {
        snappedX = other.x;
        hasSnappedX = true;
        snapLabelX = 'Aligned Left';
        guides.push({
          id: `el-left-${other.id}`,
          orientation: 'vertical',
          position: other.x,
          origin: 'element',
        });
      } else if (Math.abs(dragRight - otherRight) <= threshold) {
        snappedX = otherRight - width;
        hasSnappedX = true;
        snapLabelX = 'Aligned Right';
        guides.push({
          id: `el-right-${other.id}`,
          orientation: 'vertical',
          position: otherRight,
          origin: 'element',
        });
      }
    }

    // Horizontal snaps
    if (!hasSnappedY) {
      if (Math.abs(dragCenterY - otherCenterY) <= threshold) {
        snappedY = otherCenterY - height / 2;
        hasSnappedY = true;
        snapLabelY = 'Aligned Middle';
        guides.push({
          id: `el-center-y-${other.id}`,
          orientation: 'horizontal',
          position: otherCenterY,
          origin: 'element',
          label: other.name,
        });
      } else if (Math.abs(y - other.y) <= threshold) {
        snappedY = other.y;
        hasSnappedY = true;
        snapLabelY = 'Aligned Top';
        guides.push({
          id: `el-top-${other.id}`,
          orientation: 'horizontal',
          position: other.y,
          origin: 'element',
        });
      } else if (Math.abs(dragBottom - otherBottom) <= threshold) {
        snappedY = otherBottom - height;
        hasSnappedY = true;
        snapLabelY = 'Aligned Bottom';
        guides.push({
          id: `el-bottom-${other.id}`,
          orientation: 'horizontal',
          position: otherBottom,
          origin: 'element',
        });
      }
    }

    if (hasSnappedX && hasSnappedY) break;
  }

  return {
    x: snappedX,
    y: snappedY,
    guides,
    snappedX: hasSnappedX,
    snappedY: hasSnappedY,
    snapLabelX,
    snapLabelY,
  };
}

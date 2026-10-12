'use client';

import React from 'react';
import type { Slide, Theme, CanvasElement } from '@/types';
import { CanvasViewport } from './viewport/canvas-viewport';

interface CanvasStageWrapperProps {
  slide: Slide;
  width: number;
  height: number;
  theme: Theme;
  zoom: number;
  selectedElementIds: string[];
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeselectAll: () => void;
}

export function CanvasStage({
  slide,
  width,
  height,
  selectedElementIds,
  onSelectElement,
  onUpdateElement,
  onDeselectAll,
}: CanvasStageWrapperProps) {
  return (
    <CanvasViewport
      slide={slide}
      width={width}
      height={height}
      selectedElementIds={selectedElementIds}
      onSelectElement={onSelectElement}
      onUpdateElement={onUpdateElement}
      onDeselectAll={onDeselectAll}
    />
  );
}

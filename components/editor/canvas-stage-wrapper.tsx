'use client';

import dynamic from 'next/dynamic';
import type { Slide, Theme, CanvasElement } from '@/types';

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

const CanvasStageInner = dynamic(() => import('./canvas-stage-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-sm text-muted-foreground">Loading canvas...</div>
    </div>
  ),
});

export function CanvasStage(props: CanvasStageWrapperProps) {
  return <CanvasStageInner {...props} />;
}

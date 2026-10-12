'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/stores/editor-store';

interface CanvasResizeHandlesProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
}

export function CanvasResizeHandles({
  canvasWidth,
  canvasHeight,
  zoom,
}: CanvasResizeHandlesProps) {
  const { updateDimensions } = useEditorStore();
  const [activeDrag, setActiveDrag] = useState<{
    dir: 'w' | 'h' | 'both';
    tempW: number;
    tempH: number;
  } | null>(null);

  const startResize = (dir: 'w' | 'h' | 'both', e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = canvasWidth;
    const initialH = canvasHeight;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startX) / zoom;
      const dy = (moveEvt.clientY - startY) / zoom;

      let nextW = initialW;
      let nextH = initialH;

      if (dir === 'w' || dir === 'both') {
        nextW = Math.max(300, Math.round(initialW + dx));
      }
      if (dir === 'h' || dir === 'both') {
        nextH = Math.max(300, Math.round(initialH + dy));
      }

      setActiveDrag({ dir, tempW: nextW, tempH: nextH });
      updateDimensions({ width: nextW, height: nextH, aspectRatio: 'custom' });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <>
      {/* Right Edge Handle */}
      <div
        onPointerDown={(e) => startResize('w', e)}
        className="group absolute right-[-8px] top-1/2 -translate-y-1/2 z-30 flex h-16 w-3 cursor-ew-resize items-center justify-center"
        title="Drag to resize canvas width"
      >
        <div className="h-8 w-1.5 rounded-full bg-border shadow group-hover:bg-primary transition-colors" />
      </div>

      {/* Bottom Edge Handle */}
      <div
        onPointerDown={(e) => startResize('h', e)}
        className="group absolute bottom-[-8px] left-1/2 -translate-x-1/2 z-30 flex h-3 w-16 cursor-ns-resize items-center justify-center"
        title="Drag to resize canvas height"
      >
        <div className="h-1.5 w-8 rounded-full bg-border shadow group-hover:bg-primary transition-colors" />
      </div>

      {/* Corner Handle */}
      <div
        onPointerDown={(e) => startResize('both', e)}
        className="group absolute bottom-[-8px] right-[-8px] z-30 flex h-4 w-4 cursor-nwse-resize items-center justify-center"
        title="Drag to resize canvas dimensions"
      >
        <div className="h-2.5 w-2.5 rounded-sm border border-border bg-card shadow group-hover:border-primary group-hover:bg-primary transition-colors" />
      </div>

      {/* Live Dimension Tooltip when dragging */}
      {activeDrag && (
        <div
          className="pointer-events-none absolute bottom-4 right-4 z-50 rounded bg-black/80 px-2 py-1 text-[11px] font-mono text-white shadow"
        >
          {activeDrag.tempW} × {activeDrag.tempH} px
        </div>
      )}
    </>
  );
}

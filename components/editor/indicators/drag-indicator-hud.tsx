'use client';

import React from 'react';

interface DragIndicatorHUDProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  zoom?: number;
  mode: 'drag' | 'resize' | 'rotate';
  snapLabelX?: string;
  snapLabelY?: string;
}

export function DragIndicatorHUD({
  x,
  y,
  width,
  height,
  rotation,
  zoom = 1,
  mode,
  snapLabelX,
  snapLabelY,
}: DragIndicatorHUDProps) {
  // Scale compensation so the indicator is big and readable even when zoomed out
  const scale = Math.max(1, 0.85 / Math.max(0.1, zoom));
  const topOffset = 48 * scale;

  return (
    <div
      className="pointer-events-none absolute z-50 flex items-center gap-2.5 rounded-2xl border-2 border-border/90 bg-background/95 px-4 py-2 text-sm font-semibold text-foreground shadow-2xl backdrop-blur-md ring-1 ring-black/10"
      style={{
        left: `${x}px`,
        top: `${y - topOffset}px`,
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: 'bottom center',
      }}
    >
      {mode === 'drag' && (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-muted-foreground font-normal">X:</span>
          <span className="font-bold text-foreground">{Math.round(x)}</span>
          <span className="text-muted-foreground font-normal ml-1">Y:</span>
          <span className="font-bold text-foreground">{Math.round(y)}</span>
        </div>
      )}

      {mode === 'resize' && width !== undefined && height !== undefined && (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-muted-foreground font-normal">W:</span>
          <span className="font-bold text-foreground">{Math.round(width)}px</span>
          <span className="text-muted-foreground font-normal ml-1">H:</span>
          <span className="font-bold text-foreground">{Math.round(height)}px</span>
        </div>
      )}

      {mode === 'rotate' && rotation !== undefined && (
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-muted-foreground font-normal">Angle:</span>
          <span className="font-bold text-foreground">{Math.round(rotation)}°</span>
        </div>
      )}

      {(snapLabelX || snapLabelY) && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
          🎯 {[snapLabelX, snapLabelY].filter(Boolean).join(' • ')}
        </span>
      )}
    </div>
  );
}

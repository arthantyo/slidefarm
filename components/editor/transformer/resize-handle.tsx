'use client';

import React from 'react';

export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface ResizeHandleProps {
  position: HandlePosition;
  onPointerDown: (position: HandlePosition, e: React.PointerEvent) => void;
}

const CURSOR_MAP: Record<HandlePosition, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

const POSITION_STYLES: Record<HandlePosition, React.CSSProperties> = {
  nw: { top: -7, left: -7 },
  n: { top: -7, left: '50%', transform: 'translateX(-50%)' },
  ne: { top: -7, right: -7 },
  e: { top: '50%', right: -7, transform: 'translateY(-50%)' },
  se: { bottom: -7, right: -7 },
  s: { bottom: -7, left: '50%', transform: 'translateX(-50%)' },
  sw: { bottom: -7, left: -7 },
  w: { top: '50%', left: -7, transform: 'translateY(-50%)' },
};

export function ResizeHandle({ position, onPointerDown }: ResizeHandleProps) {
  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(position, e);
      }}
      className="absolute h-3.5 w-3.5 rounded-sm border-2 border-primary bg-background shadow-md transition-transform hover:scale-130 active:scale-110"
      style={{
        ...POSITION_STYLES[position],
        cursor: CURSOR_MAP[position],
        touchAction: 'none',
      }}
    />
  );
}

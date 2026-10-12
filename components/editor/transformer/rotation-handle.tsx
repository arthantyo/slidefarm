'use client';

import React from 'react';
import { RotateCw } from 'lucide-react';

interface RotationHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
}

export function RotationHandle({ onPointerDown }: RotationHandleProps) {
  return (
    <div
      className="absolute left-1/2 -top-8 flex -translate-x-1/2 flex-col items-center"
      style={{ touchAction: 'none' }}
    >
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e);
        }}
        className="group flex h-6 w-6 cursor-grab items-center justify-center rounded-full border-2 border-primary bg-background shadow-md transition-transform hover:scale-125 active:cursor-grabbing"
        title="Drag to rotate"
      >
        <RotateCw className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="h-2.5 w-0.5 bg-primary/80" />
    </div>
  );
}

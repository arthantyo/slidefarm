'use client';

import React from 'react';
import type { CanvasElement } from '@/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PositionSizeProps {
  element: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}

export function PositionSize({ element, onUpdate }: PositionSizeProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Position & Size</Label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-muted-foreground">X (px)</span>
          <Input
            type="number"
            value={Math.round(element.x)}
            onChange={(e) => onUpdate({ x: Number(e.target.value) })}
            className="h-7 text-xs font-mono"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Y (px)</span>
          <Input
            type="number"
            value={Math.round(element.y)}
            onChange={(e) => onUpdate({ y: Number(e.target.value) })}
            className="h-7 text-xs font-mono"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Width (px)</span>
          <Input
            type="number"
            value={Math.round(element.width)}
            onChange={(e) => onUpdate({ width: Number(e.target.value) })}
            className="h-7 text-xs font-mono"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Height (px)</span>
          <Input
            type="number"
            value={Math.round(element.height)}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
            className="h-7 text-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
}

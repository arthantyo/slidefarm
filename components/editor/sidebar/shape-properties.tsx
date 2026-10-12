'use client';

import React from 'react';
import type { ShapeElement } from '@/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ColorPicker } from './style-controls';

interface ShapePropertiesProps {
  element: ShapeElement;
  onUpdate: (updates: Partial<ShapeElement>) => void;
}

export function ShapeProperties({ element, onUpdate }: ShapePropertiesProps) {
  return (
    <div className="space-y-3">
      <ColorPicker
        label="Fill Color"
        value={element.fill}
        onChange={(c) => onUpdate({ fill: c })}
      />

      <div className="space-y-1.5">
        <Label className="text-xs">Stroke Color</Label>
        <Input
          type="color"
          value={element.stroke || '#000000'}
          onChange={(e) => onUpdate({ stroke: e.target.value })}
          className="h-8 w-full cursor-pointer"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Stroke Width</Label>
        <Slider
          value={[element.strokeWidth]}
          onValueChange={(v) => onUpdate({ strokeWidth: v[0] })}
          min={0}
          max={50}
          step={1}
        />
      </div>

      {element.shape === 'rect' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Corner Radius</Label>
          <Slider
            value={[element.cornerRadius]}
            onValueChange={(v) => onUpdate({ cornerRadius: v[0] })}
            min={0}
            max={200}
            step={1}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import type { BackgroundElement } from '@/types';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColorPicker } from './style-controls';

interface BackgroundPropertiesProps {
  element: BackgroundElement;
  onUpdate: (updates: Partial<BackgroundElement>) => void;
}

export function BackgroundProperties({
  element,
  onUpdate,
}: BackgroundPropertiesProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Fill Type</Label>
        <Select
          value={element.fillType}
          onValueChange={(v) => onUpdate({ fillType: v as 'solid' | 'gradient' })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ColorPicker
        label="Background Color"
        value={element.fill}
        onChange={(c) => onUpdate({ fill: c })}
      />

      {element.fillType === 'gradient' && (
        <>
          <ColorPicker
            label="Gradient Color 2"
            value={element.gradientColor2 || '#000000'}
            onChange={(c) => onUpdate({ gradientColor2: c })}
          />
          <div className="space-y-1.5">
            <Label className="text-xs">Gradient Angle</Label>
            <Slider
              value={[element.gradientAngle ?? 135]}
              onValueChange={(v) => onUpdate({ gradientAngle: v[0] })}
              min={0}
              max={360}
              step={1}
            />
          </div>
        </>
      )}
    </div>
  );
}

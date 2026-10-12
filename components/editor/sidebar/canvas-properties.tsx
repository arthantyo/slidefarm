'use client';

import React from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { CANVAS_SIZE_PRESETS } from '../canvas-size/canvas-size-presets';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeftRight, Check, Frame, Sparkles } from 'lucide-react';
import { BackgroundProperties } from './background-properties';
import type { BackgroundElement } from '@/types';

export function CanvasProperties() {
  const { project, currentSlideId, updateDimensions, updateElement } = useEditorStore();

  if (!project) return null;

  const currentW = project.dimensions.width;
  const currentH = project.dimensions.height;

  const currentSlide = project.slides.find((s) => s.id === currentSlideId);
  const background = currentSlide?.elements.find(
    (el) => el.type === 'background'
  ) as BackgroundElement | undefined;

  const handleSwapOrientation = () => {
    updateDimensions({
      width: currentH,
      height: currentW,
      aspectRatio: 'custom',
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Frame className="h-3.5 w-3.5 text-primary" /> Canvas Dimensions
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Adjust the overall slide canvas size and orientation.
        </p>
      </div>

      {/* Numeric inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Width (px)</Label>
          <Input
            type="number"
            value={currentW}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 100) {
                updateDimensions({ width: val, height: currentH, aspectRatio: 'custom' });
              }
            }}
            className="h-8 text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Height (px)</Label>
          <Input
            type="number"
            value={currentH}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 100) {
                updateDimensions({ width: currentW, height: val, aspectRatio: 'custom' });
              }
            }}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleSwapOrientation}
        className="w-full gap-2 text-xs"
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Flip Orientation (Rotate 90°)
      </Button>

      {/* Popular Presets */}
      <div className="space-y-1.5 pt-1">
        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Presets
        </Label>
        <div className="space-y-1">
          {CANVAS_SIZE_PRESETS.map((preset) => {
            const isSelected = currentW === preset.width && currentH === preset.height;
            return (
              <button
                key={preset.id}
                onClick={() =>
                  updateDimensions({
                    width: preset.width,
                    height: preset.height,
                    aspectRatio: preset.aspectRatio,
                  })
                }
                className={`flex w-full items-center justify-between rounded-md border p-2 text-left text-xs transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border/60 hover:bg-accent'
                }`}
              >
                <div>
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {preset.width} × {preset.height} ({preset.aspectRatio})
                  </div>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Slide Background Settings */}
      {background && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold">Slide Background</h4>
          <BackgroundProperties
            element={background}
            onUpdate={(updates) => updateElement(background.id, updates)}
          />
        </div>
      )}
    </div>
  );
}

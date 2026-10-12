'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { CANVAS_SIZE_PRESETS } from './canvas-size-presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ArrowLeftRight, Check, ChevronDown, Frame, Lock, Unlock } from 'lucide-react';
import type { AspectRatioKey } from '@/types';

export function CanvasSizePopover() {
  const { project, updateDimensions } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);
  const [lockRatio, setLockRatio] = useState(false);

  if (!project) return null;

  const currentW = project.dimensions.width;
  const currentH = project.dimensions.height;

  const handleWidthChange = (valStr: string) => {
    const newW = parseInt(valStr, 10);
    if (isNaN(newW) || newW < 100) return;

    let newH = currentH;
    if (lockRatio) {
      newH = Math.round(newW * (currentH / currentW));
    }
    updateDimensions({
      width: newW,
      height: newH,
      aspectRatio: 'custom',
    });
  };

  const handleHeightChange = (valStr: string) => {
    const newH = parseInt(valStr, 10);
    if (isNaN(newH) || newH < 100) return;

    let newW = currentW;
    if (lockRatio) {
      newW = Math.round(newH * (currentW / currentH));
    }
    updateDimensions({
      width: newW,
      height: newH,
      aspectRatio: 'custom',
    });
  };

  const handleSwapOrientation = () => {
    let nextRatio: AspectRatioKey = 'custom';
    if (project.dimensions.aspectRatio === '9:16') nextRatio = '16:9';
    else if (project.dimensions.aspectRatio === '16:9') nextRatio = '9:16';

    updateDimensions({
      width: currentH,
      height: currentW,
      aspectRatio: nextRatio,
    });
  };

  const currentPreset = CANVAS_SIZE_PRESETS.find(
    (p) => p.width === currentW && p.height === currentH
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-full border-border/80 bg-background/90 px-3 text-xs font-medium shadow-sm backdrop-blur hover:bg-accent"
        >
          <Frame className="h-3.5 w-3.5 text-primary" />
          <span>
            {currentW} × {currentH} px
          </span>
          <span className="text-muted-foreground">
            ({currentPreset?.name ?? project.dimensions.aspectRatio})
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="center" className="w-80 p-3 shadow-xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-semibold">Canvas Dimensions</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleSwapOrientation}
              title="Flip orientation (Portrait / Landscape)"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Width & Height numeric controls */}
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Width (px)</Label>
              <Input
                type="number"
                value={currentW}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="mt-4 h-7 w-7 text-muted-foreground"
              onClick={() => setLockRatio(!lockRatio)}
              title={lockRatio ? 'Ratio locked' : 'Ratio unlocked'}
            >
              {lockRatio ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5" />}
            </Button>

            <div className="flex-1 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Height (px)</Label>
              <Input
                type="number"
                value={currentH}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* Presets List */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Popular Presets
            </span>
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {CANVAS_SIZE_PRESETS.map((preset) => {
                const isSelected = currentW === preset.width && currentH === preset.height;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      updateDimensions({
                        width: preset.width,
                        height: preset.height,
                        aspectRatio: preset.aspectRatio,
                      });
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-accent text-foreground'
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
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import type { ImageElement } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DEFAULT_IMAGE_FILTERS, getImageFilterValues, type ImageFilters } from "@/lib/canvas/image-filters";
import { readSavedImagePrompts, SAVED_IMAGE_PROMPTS_EVENT, SAVED_IMAGE_PROMPTS_KEY } from "@/lib/canvas/saved-image-prompts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ImagePropertiesProps {
  element: ImageElement;
  onUpdate: (updates: Partial<ImageElement>) => void;
}

const FILTER_PRESETS: Record<string, ImageFilters | undefined> = {
  none: undefined,
  grayscale: { grayscale: 100 },
  sepia: { sepia: 100 },
  invert: { invert: 100 },
  vintage: { sepia: 45, saturate: 75, contrast: 110 },
};

export function ImageProperties({ element, onUpdate }: ImagePropertiesProps) {
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const filterValues = getImageFilterValues(element.filters);
  const selectedPreset = Object.entries(FILTER_PRESETS).find(([, preset]) => {
    const values = getImageFilterValues(preset);
    return (Object.keys(DEFAULT_IMAGE_FILTERS) as (keyof ImageFilters)[]).every((key) => filterValues[key] === values[key]);
  })?.[0];
  const filterControls: { key: keyof ImageFilters; label: string; min: number; max: number; unit: string }[] = [
    { key: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%' },
    { key: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%' },
    { key: 'saturate', label: 'Saturation', min: 0, max: 200, unit: '%' },
    { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, unit: '%' },
    { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' },
    { key: 'invert', label: 'Invert', min: 0, max: 100, unit: '%' },
    { key: 'hueRotate', label: 'Hue', min: -180, max: 180, unit: '°' },
    { key: 'blur', label: 'Blur', min: 0, max: 20, unit: 'px' },
  ];

  useEffect(() => {
    const refresh = () => setSavedPrompts(readSavedImagePrompts());
    const onStorage = (event: StorageEvent) => {
      if (event.key === SAVED_IMAGE_PROMPTS_KEY) refresh();
    };
    refresh();
    window.addEventListener(SAVED_IMAGE_PROMPTS_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SAVED_IMAGE_PROMPTS_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Object fit */}
      <div className="space-y-1.5">
        <Label className="text-xs">Fit</Label>
        <Select
          value={element.objectFit}
          onValueChange={(v) =>
            onUpdate({ objectFit: v as ImageElement["objectFit"] })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Corner radius */}
      <div className="space-y-1.5">
        <Label className="text-xs">Corner Radius</Label>
        <Slider
          value={[element.cornerRadius]}
          onValueChange={(v) => onUpdate({ cornerRadius: v[0] })}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Image filters</Label>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onUpdate({ filters: undefined })}>
            Reset
          </Button>
        </div>
        <Select value={selectedPreset ?? ''} onValueChange={(preset) => onUpdate({ filters: FILTER_PRESETS[preset] })}>
          <SelectTrigger className="h-8 text-xs" aria-label="Apply image filter preset">
            <SelectValue placeholder="Apply preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="grayscale">Grayscale</SelectItem>
            <SelectItem value="sepia">Sepia</SelectItem>
            <SelectItem value="invert">Invert</SelectItem>
            <SelectItem value="vintage">Vintage</SelectItem>
          </SelectContent>
        </Select>
        {filterControls.map(({ key, label, min, max, unit }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor={`image-filter-${key}-${element.id}`} className="text-xs">{label}</Label>
              <span className="tabular-nums text-muted-foreground">{filterValues[key]}{unit}</span>
            </div>
            <Slider
              id={`image-filter-${key}-${element.id}`}
              aria-label={label}
              value={[filterValues[key]]}
              min={min}
              max={max}
              step={1}
              onValueChange={([value]) => onUpdate({ filters: { ...element.filters, [key]: value } })}
            />
          </div>
        ))}
      </div>

      {/* Replace URL */}
      <div className="space-y-1.5">
        <Label className="text-xs">Image URL</Label>
        <Input
          value={element.src}
          onChange={(e) => onUpdate({ src: e.target.value })}
          className="h-8 text-xs font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Image placeholder key</Label>
        <Input
          value={element.placeholder ?? ""}
          onChange={(e) =>
            onUpdate({ placeholder: e.target.value || undefined })
          }
          placeholder="hero_image"
          className="h-8 text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Use a subject when the AI image toggle is on. Otherwise, use an image URL or data URL.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">AI image base prompt</Label>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`image-subject-${element.id}`} className="text-xs">
            Use placeholder as AI image subject
          </Label>
          <Switch
            id={`image-subject-${element.id}`}
            checked={element.usePlaceholderAsSubject ?? Boolean(element.aiPlaceholderPrompt?.trim())}
            onCheckedChange={(checked) => onUpdate({ usePlaceholderAsSubject: checked })}
          />
        </div>
        {savedPrompts.length > 0 && (
          <Select value={savedPrompts.includes(element.aiPlaceholderPrompt ?? '') ? element.aiPlaceholderPrompt : undefined} onValueChange={(prompt) => onUpdate({ aiPlaceholderPrompt: prompt })}>
            <SelectTrigger className="h-8 min-w-0 text-xs" aria-label="Choose a saved base prompt" title={element.aiPlaceholderPrompt}>
              <SelectValue placeholder="Choose a saved prompt" />
            </SelectTrigger>
            <SelectContent className="max-w-[min(20rem,calc(100vw-2rem))]">
              {savedPrompts.map((prompt) => (
                <SelectItem key={prompt} value={prompt} title={prompt} className="min-w-0 max-w-full truncate">
                  {prompt.length > 48 ? `${prompt.slice(0, 48)}…` : prompt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Textarea
          value={element.aiPlaceholderPrompt ?? ""}
          onChange={(e) => onUpdate({ aiPlaceholderPrompt: e.target.value || undefined })}
          placeholder="Editorial watercolor illustration of"
          className="min-h-24 resize-y text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          When enabled, workflows generate an image from this prompt and the placeholder subject. When disabled, the placeholder value is used as an image URL or data URL.
        </p>
      </div>
    </div>
  );
}

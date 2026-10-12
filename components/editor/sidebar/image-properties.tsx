"use client";

import React, { useEffect, useState } from "react";
import type { ImageElement } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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

export function ImageProperties({ element, onUpdate }: ImagePropertiesProps) {
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);

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
          The workflow fills this slot with a subject when an AI base prompt is set.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">AI image base prompt</Label>
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
          Set this and a placeholder key to generate an image from the base prompt followed by the subject.
        </p>
      </div>
    </div>
  );
}

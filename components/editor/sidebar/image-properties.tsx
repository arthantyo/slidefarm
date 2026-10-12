"use client";

import React from "react";
import type { ImageElement } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
        <Label className="text-xs">Manual image placeholder key</Label>
        <Input
          value={element.placeholder ?? ""}
          onChange={(e) =>
            onUpdate({ placeholder: e.target.value || undefined })
          }
          placeholder="hero_image"
          className="h-8 text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Image sources are not changed by JSON fill.
        </p>
      </div>
    </div>
  );
}

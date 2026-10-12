'use client';

import React, { useState } from 'react';
import type { TextElement, TextAlign, FontStyle } from '@/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Wand2,
  Loader2,
} from 'lucide-react';
import { FONT_OPTIONS } from '@/lib/canvas/themes';
import { StyleButton, ColorPicker } from './style-controls';

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (updates: Partial<TextElement>) => void;
}

export function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  const [isRewriting, setIsRewriting] = useState(false);

  const toggleBold = () => {
    const isBold = element.fontStyle === 'bold' || element.fontStyle === 'bold-italic';
    const next: FontStyle = isBold
      ? element.fontStyle === 'bold-italic' ? 'italic' : 'normal'
      : element.fontStyle === 'italic' ? 'bold-italic' : 'bold';
    onUpdate({ fontStyle: next });
  };

  const toggleItalic = () => {
    const isItalic = element.fontStyle === 'italic' || element.fontStyle === 'bold-italic';
    const next: FontStyle = isItalic
      ? element.fontStyle === 'bold-italic' ? 'bold' : 'normal'
      : element.fontStyle === 'bold' ? 'bold-italic' : 'italic';
    onUpdate({ fontStyle: next });
  };

  const aiRewrite = async (instruction: string) => {
    setIsRewriting(true);
    try {
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: element.text, instruction }),
      });
      const data = await res.json();
      if (data.text) onUpdate({ text: data.text });
    } catch {
      // ignore
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Text content */}
      <div className="space-y-1.5">
        <Label className="text-xs">Text</Label>
        <Textarea
          value={element.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="min-h-[60px] resize-none text-sm"
        />
      </div>

      {/* AI rewrite */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs">
          <Wand2 className="h-3 w-3 text-primary" /> AI Rewrite
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {['Make shorter', 'Make engaging', 'Make professional'].map((inst) => (
            <button
              key={inst}
              disabled={isRewriting}
              onClick={() => aiRewrite(inst)}
              className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {isRewriting ? <Loader2 className="h-3 w-3 animate-spin" /> : inst}
            </button>
          ))}
        </div>
      </div>

      {/* Font family */}
      <div className="space-y-1.5">
        <Label className="text-xs">Font</Label>
        <Select value={element.fontFamily} onValueChange={(v) => onUpdate({ fontFamily: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font size */}
      <div className="space-y-1.5">
        <Label className="text-xs">Size</Label>
        <div className="flex items-center gap-2">
          <Slider
            value={[element.fontSize]}
            onValueChange={(v) => onUpdate({ fontSize: v[0] })}
            min={8}
            max={200}
            step={1}
            className="flex-1"
          />
          <span className="w-10 text-right text-xs text-muted-foreground">
            {element.fontSize}px
          </span>
        </div>
      </div>

      {/* Style buttons */}
      <div className="flex gap-1">
        <StyleButton
          active={element.fontStyle === 'bold' || element.fontStyle === 'bold-italic'}
          onClick={toggleBold}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </StyleButton>
        <StyleButton
          active={element.fontStyle === 'italic' || element.fontStyle === 'bold-italic'}
          onClick={toggleItalic}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </StyleButton>
        <StyleButton
          active={element.textDecoration === 'underline'}
          onClick={() =>
            onUpdate({
              textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline',
            })
          }
          title="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </StyleButton>
        <StyleButton
          active={element.textDecoration === 'line-through'}
          onClick={() =>
            onUpdate({
              textDecoration: element.textDecoration === 'line-through' ? 'none' : 'line-through',
            })
          }
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </StyleButton>
      </div>

      {/* Alignment */}
      <div className="flex gap-1">
        {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
          <StyleButton
            key={align}
            active={element.align === align}
            onClick={() => onUpdate({ align })}
            title={`Align ${align}`}
          >
            {align === 'left' ? (
              <AlignLeft className="h-3.5 w-3.5" />
            ) : align === 'center' ? (
              <AlignCenter className="h-3.5 w-3.5" />
            ) : (
              <AlignRight className="h-3.5 w-3.5" />
            )}
          </StyleButton>
        ))}
      </div>

      {/* Line height */}
      <div className="space-y-1.5">
        <Label className="text-xs">Line Height</Label>
        <Slider
          value={[element.lineHeight * 100]}
          onValueChange={(v) => onUpdate({ lineHeight: v[0] / 100 })}
          min={80}
          max={250}
          step={5}
        />
      </div>

      {/* Color */}
      <ColorPicker
        label="Text Color"
        value={element.fill}
        onChange={(c) => onUpdate({ fill: c })}
      />
    </div>
  );
}

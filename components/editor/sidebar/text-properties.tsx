"use client";

import { aiRequestHeaders } from '@/lib/ai/user-key';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TextElement, TextAlign, FontStyle } from "@/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { FONT_OPTIONS } from "@/lib/canvas/themes";
import { getTextFontWeight } from "@/lib/canvas/text-style";
import { StyleButton, ColorPicker } from "./style-controls";
import { Input } from "@/components/ui/input";

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (updates: Partial<TextElement>) => void;
}

const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 9999;

function clampFontSize(value: number) {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)));
}

function ExpandableTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const floorRef = useRef(72);
  const resizeOrigin = useRef<number | null>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const needed = Math.max(el.scrollHeight, 72);
    el.style.height = `${Math.max(needed, floorRef.current)}px`;
  }, []);

  useLayoutEffect(() => {
    fit();
  }, [fit, value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPointerDown={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (e.clientY >= rect.bottom - 14) resizeOrigin.current = el.offsetHeight;
      }}
      onPointerUp={() => {
        const el = ref.current;
        if (!el || resizeOrigin.current === null) return;
        if (el.offsetHeight !== resizeOrigin.current) {
          floorRef.current = Math.max(72, el.offsetHeight);
          fit();
        }
        resizeOrigin.current = null;
      }}
      className="min-h-[72px] resize-y overflow-hidden text-sm"
    />
  );
}

export function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  const [isRewriting, setIsRewriting] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState(String(element.fontSize));
  const fontSizeFocused = useRef(false);

  useEffect(() => {
    if (!fontSizeFocused.current) setFontSizeInput(String(element.fontSize));
  }, [element.fontSize]);

  const toggleBold = () => {
    onUpdate({ fontWeight: getTextFontWeight(element) >= 700 ? 400 : 700 });
  };

  const toggleItalic = () => {
    const isItalic =
      element.fontStyle === "italic" || element.fontStyle === "bold-italic";
    const next: FontStyle = isItalic
      ? element.fontStyle === "bold-italic"
        ? "bold"
        : "normal"
      : element.fontStyle === "bold"
        ? "bold-italic"
        : "italic";
    onUpdate({ fontStyle: next });
  };

  const aiRewrite = async (instruction: string) => {
    setIsRewriting(true);
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiRequestHeaders() },
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
        <ExpandableTextarea
          value={element.text}
          onChange={(text) => onUpdate({ text })}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">JSON placeholder key</Label>
        <Input
          value={element.placeholder ?? ""}
          onChange={(e) =>
            onUpdate({ placeholder: e.target.value || undefined })
          }
          placeholder="headline"
          className="h-8 text-xs"
        />
      </div>

      {/* AI rewrite */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs">
          <Wand2 className="h-3 w-3 text-primary" /> AI Rewrite
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {["Make shorter", "Make engaging", "Make professional"].map(
            (inst) => (
              <button
                key={inst}
                disabled={isRewriting}
                onClick={() => aiRewrite(inst)}
                className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {isRewriting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  inst
                )}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Font family */}
      <div className="space-y-1.5">
        <Label className="text-xs">Font</Label>
        <Select
          value={element.fontFamily}
          onValueChange={(v) => onUpdate({ fontFamily: v })}
        >
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
            min={Math.min(8, element.fontSize)}
            max={Math.max(200, element.fontSize)}
            step={1}
            className="flex-1"
          />
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              value={fontSizeInput}
              onFocus={() => {
                fontSizeFocused.current = true;
              }}
              onChange={(e) => {
                const raw = e.target.value;
                setFontSizeInput(raw);
                if (raw.trim() === "") return;
                const next = Number(raw);
                if (!Number.isFinite(next)) return;
                if (next < MIN_FONT_SIZE || next > MAX_FONT_SIZE) return;
                onUpdate({ fontSize: clampFontSize(next) });
              }}
              onBlur={() => {
                fontSizeFocused.current = false;
                const next = Number(fontSizeInput);
                if (fontSizeInput.trim() === "" || !Number.isFinite(next)) {
                  setFontSizeInput(String(element.fontSize));
                  return;
                }
                const size = clampFontSize(next);
                onUpdate({ fontSize: size });
                setFontSizeInput(String(size));
              }}
              aria-label="Font size"
              className="h-7 w-16 px-2 text-xs font-mono"
            />
            <span className="text-[10px] text-muted-foreground">px</span>
          </div>
        </div>
      </div>

      {/* Style buttons */}
      <div className="flex gap-1">
        <StyleButton
          active={getTextFontWeight(element) >= 700}
          onClick={toggleBold}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </StyleButton>
        <StyleButton
          active={
            element.fontStyle === "italic" ||
            element.fontStyle === "bold-italic"
          }
          onClick={toggleItalic}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </StyleButton>
        <StyleButton
          active={element.textDecoration === "underline"}
          onClick={() =>
            onUpdate({
              textDecoration:
                element.textDecoration === "underline" ? "none" : "underline",
            })
          }
          title="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </StyleButton>
        <StyleButton
          active={element.textDecoration === "line-through"}
          onClick={() =>
            onUpdate({
              textDecoration:
                element.textDecoration === "line-through"
                  ? "none"
                  : "line-through",
            })
          }
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </StyleButton>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Weight</Label>
        <Select
          value={String(getTextFontWeight(element))}
          onValueChange={(value) => onUpdate({ fontWeight: Number(value) })}
        >
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[
              [100, "Thin"], [200, "Extra Light"], [300, "Light"],
              [400, "Regular"], [500, "Medium"], [600, "Semibold"],
              [700, "Bold"], [800, "Extra Bold"], [900, "Black"],
            ].map(([weight, label]) => (
              <SelectItem key={weight} value={String(weight)}>{label} ({weight})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alignment */}
      <div className="flex gap-1">
        {(["left", "center", "right"] as TextAlign[]).map((align) => (
          <StyleButton
            key={align}
            active={element.align === align}
            onClick={() => onUpdate({ align })}
            title={`Align ${align}`}
          >
            {align === "left" ? (
              <AlignLeft className="h-3.5 w-3.5" />
            ) : align === "center" ? (
              <AlignCenter className="h-3.5 w-3.5" />
            ) : (
              <AlignRight className="h-3.5 w-3.5" />
            )}
          </StyleButton>
        ))}
      </div>

      {/* Line height */}
      <div className="space-y-1.5">
        <Label className="text-xs">Line Height ({element.lineHeight.toFixed(2)})</Label>
        <Slider
          value={[element.lineHeight * 100]}
          onValueChange={(v) => onUpdate({ lineHeight: v[0] / 100 })}
          min={80}
          max={250}
          step={5}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Letter Spacing ({element.letterSpacing}px)</Label>
        <Slider
          value={[element.letterSpacing]}
          onValueChange={(value) => onUpdate({ letterSpacing: value[0] })}
          min={-5}
          max={20}
          step={0.5}
        />
      </div>

      {/* Color */}
      <ColorPicker
        label="Text Color"
        value={element.fill}
        onChange={(c) => onUpdate({ fill: c })}
      />
      <div className="space-y-1.5">
        <Label className="text-xs">Text Stroke ({element.strokeWidth ?? 0}px)</Label>
        <Slider
          value={[element.strokeWidth ?? 0]}
          onValueChange={(value) => onUpdate({ strokeWidth: value[0] })}
          min={0}
          max={Math.max(30, element.strokeWidth ?? 0)}
          step={1}
        />
        <ColorPicker
          label="Stroke Color"
          value={element.stroke ?? "#000000"}
          onChange={(stroke) => onUpdate({ stroke })}
        />
      </div>
    </div>
  );
}

'use client';

import { useEditorStore } from '@/stores/editor-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  Copy, Trash2, Lock, Unlock, Eye, EyeOff,
  Wand2, Loader2,
} from 'lucide-react';
import { FONT_OPTIONS, COLOR_PALETTE } from '@/lib/canvas/themes';
import type {
  CanvasElement, TextElement, ImageElement, ShapeElement, BackgroundElement,
  TextAlign, FontStyle,
} from '@/types';
import { useState } from 'react';

export function RightSidebar() {
  const { project, currentSlideId, selectedElementIds } = useEditorStore();
  const {
    updateElement, deleteElement, duplicateElement,
    toggleElementLock, toggleElementVisibility,
    bringForward, sendBackward, bringToFront, sendToBack,
  } = useEditorStore();

  if (!project) return null;

  const slide = project.slides.find((s) => s.id === currentSlideId);
  if (!slide) return null;

  const selectedId = selectedElementIds[0];
  const element = slide.elements.find((el) => el.id === selectedId);

  if (!element) {
    return (
      <div className="flex w-72 flex-col border-l border-border bg-card">
        <div className="p-4">
          <h3 className="text-sm font-semibold">Properties</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Select an element on the canvas to edit its properties.
          </p>
        </div>
      </div>
    );
  }

  const isBackground = element.type === 'background';

  return (
    <div className="flex w-72 flex-col border-l border-border bg-card">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{element.name || element.type}</h3>
            <div className="flex gap-1">
              <button
                onClick={() => toggleElementLock(element.id)}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title={element.locked ? 'Unlock' : 'Lock'}
              >
                {element.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => toggleElementVisibility(element.id)}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title={element.visible ? 'Hide' : 'Show'}
              >
                {element.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Text-specific properties */}
          {element.type === 'text' && (
            <TextProperties element={element as TextElement} onUpdate={(u) => updateElement(element.id, u)} />
          )}

          {/* Image-specific properties */}
          {element.type === 'image' && (
            <ImageProperties element={element as ImageElement} onUpdate={(u) => updateElement(element.id, u)} />
          )}

          {/* Shape-specific properties */}
          {element.type === 'shape' && (
            <ShapeProperties element={element as ShapeElement} onUpdate={(u) => updateElement(element.id, u)} />
          )}

          {/* Background-specific properties */}
          {element.type === 'background' && (
            <BackgroundProperties element={element as BackgroundElement} onUpdate={(u) => updateElement(element.id, u)} />
          )}

          {/* Common: Position & Size */}
          {!isBackground && (
            <>
              <Separator />
              <PositionSize element={element} onUpdate={(u) => updateElement(element.id, u)} />
            </>
          )}

          {/* Common: Opacity & Rotation */}
          {!isBackground && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Opacity</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.opacity * 100]}
                      onValueChange={(v) => updateElement(element.id, { opacity: v[0] / 100 })}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-10 text-right text-xs text-muted-foreground">{Math.round(element.opacity * 100)}%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rotation</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.rotation]}
                      onValueChange={(v) => updateElement(element.id, { rotation: v[0] })}
                      min={-180}
                      max={180}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-10 text-right text-xs text-muted-foreground">{Math.round(element.rotation)}°</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Layer order */}
          {!isBackground && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs">Arrange</Label>
                <div className="grid grid-cols-4 gap-1">
                  <Button variant="outline" size="icon" onClick={() => bringToFront(element.id)} title="Bring to front">
                    <ChevronsUp className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => bringForward(element.id)} title="Bring forward">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => sendBackward(element.id)} title="Send backward">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => sendToBack(element.id)} title="Send to back">
                    <ChevronsDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          {!isBackground && (
            <>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => duplicateElement(element.id)}>
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/10" onClick={() => deleteElement(element.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Text Properties ─────────────────────────────────────────────────────────

function TextProperties({ element, onUpdate }: { element: TextElement; onUpdate: (u: Partial<TextElement>) => void }) {
  const [isRewriting, setIsRewriting] = useState(false);

  const toggleBold = () => {
    const styles: FontStyle[] = ['normal', 'bold', 'italic', 'bold-italic'];
    const current = styles.indexOf(element.fontStyle);
    const isBold = element.fontStyle === 'bold' || element.fontStyle === 'bold-italic';
    const next = isBold
      ? element.fontStyle === 'bold-italic' ? 'italic' : 'normal'
      : element.fontStyle === 'italic' ? 'bold-italic' : 'bold';
    onUpdate({ fontStyle: next });
  };

  const toggleItalic = () => {
    const isItalic = element.fontStyle === 'italic' || element.fontStyle === 'bold-italic';
    const next = isItalic
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
        <Label className="text-xs flex items-center gap-1.5">
          <Wand2 className="h-3 w-3" /> AI Rewrite
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
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
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
          <span className="w-10 text-right text-xs text-muted-foreground">{element.fontSize}px</span>
        </div>
      </div>

      {/* Style buttons */}
      <div className="flex gap-1">
        <StyleButton active={element.fontStyle === 'bold' || element.fontStyle === 'bold-italic'} onClick={toggleBold}>
          <Bold className="h-3.5 w-3.5" />
        </StyleButton>
        <StyleButton active={element.fontStyle === 'italic' || element.fontStyle === 'bold-italic'} onClick={toggleItalic}>
          <Italic className="h-3.5 w-3.5" />
        </StyleButton>
        <StyleButton active={element.textDecoration === 'underline'} onClick={() => onUpdate({ textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline' })}>
          <Underline className="h-3.5 w-3.5" />
        </StyleButton>
        <StyleButton active={element.textDecoration === 'line-through'} onClick={() => onUpdate({ textDecoration: element.textDecoration === 'line-through' ? 'none' : 'line-through' })}>
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
          >
            {align === 'left' ? <AlignLeft className="h-3.5 w-3.5" /> : align === 'center' ? <AlignCenter className="h-3.5 w-3.5" /> : <AlignRight className="h-3.5 w-3.5" />}
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

// ─── Image Properties ────────────────────────────────────────────────────────

function ImageProperties({ element, onUpdate }: { element: ImageElement; onUpdate: (u: Partial<ImageElement>) => void }) {
  return (
    <div className="space-y-3">
      {/* Object fit */}
      <div className="space-y-1.5">
        <Label className="text-xs">Fit</Label>
        <Select value={element.objectFit} onValueChange={(v) => onUpdate({ objectFit: v as ImageElement['objectFit'] })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

// ─── Shape Properties ────────────────────────────────────────────────────────

function ShapeProperties({ element, onUpdate }: { element: ShapeElement; onUpdate: (u: Partial<ShapeElement>) => void }) {
  return (
    <div className="space-y-3">
      <ColorPicker label="Fill" value={element.fill} onChange={(c) => onUpdate({ fill: c })} />

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

// ─── Background Properties ───────────────────────────────────────────────────

function BackgroundProperties({ element, onUpdate }: { element: BackgroundElement; onUpdate: (u: Partial<BackgroundElement>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Fill Type</Label>
        <Select value={element.fillType} onValueChange={(v) => onUpdate({ fillType: v as 'solid' | 'gradient' })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ColorPicker label="Color" value={element.fill} onChange={(c) => onUpdate({ fill: c })} />

      {element.fillType === 'gradient' && (
        <>
          <ColorPicker label="Gradient Color 2" value={element.gradientColor2 || '#000000'} onChange={(c) => onUpdate({ gradientColor2: c })} />
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

// ─── Position & Size ─────────────────────────────────────────────────────────

function PositionSize({ element, onUpdate }: { element: CanvasElement; onUpdate: (u: Partial<CanvasElement>) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Position & Size</Label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-muted-foreground">X</span>
          <Input
            type="number"
            value={Math.round(element.x)}
            onChange={(e) => onUpdate({ x: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Y</span>
          <Input
            type="number"
            value={Math.round(element.y)}
            onChange={(e) => onUpdate({ y: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">W</span>
          <Input
            type="number"
            value={Math.round(element.width)}
            onChange={(e) => onUpdate({ width: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">H</span>
          <Input
            type="number"
            value={Math.round(element.height)}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────────────

function StyleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded border transition-colors ${
        active ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-border"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 flex-1 text-xs"
        />
      </div>
      <div className="grid grid-cols-8 gap-1">
        {COLOR_PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="aspect-square rounded border border-border"
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

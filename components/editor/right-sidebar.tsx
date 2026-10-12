'use client';

import React from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  TextElement,
  ImageElement,
  ShapeElement,
  BackgroundElement,
} from '@/types';
import { TextProperties } from './sidebar/text-properties';
import { ImageProperties } from './sidebar/image-properties';
import { ShapeProperties } from './sidebar/shape-properties';
import { BackgroundProperties } from './sidebar/background-properties';
import { PositionSize } from './sidebar/position-size';
import { CanvasProperties } from './sidebar/canvas-properties';

export function RightSidebar() {
  const { project, currentSlideId, selectedElementIds } = useEditorStore();
  const {
    updateElement,
    deleteElement,
    duplicateElement,
    toggleElementLock,
    toggleElementVisibility,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
  } = useEditorStore();

  if (!project) return null;

  const slide = project.slides.find((s) => s.id === currentSlideId);
  if (!slide) return null;

  const selectedId = selectedElementIds[0];
  const element = slide.elements.find((el) => el.id === selectedId);
  const contentElements = slide.elements.filter((el) => el.type !== 'background');
  const layerIndex = contentElements.findIndex((el) => el.id === selectedId);
  const canMoveBackward = layerIndex > 0;
  const canMoveForward = layerIndex >= 0 && layerIndex < contentElements.length - 1;

  // If no element selected, show Canvas settings
  if (!element) {
    return (
      <div className="flex w-72 flex-col border-l border-border bg-card">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <CanvasProperties />
          </div>
        </ScrollArea>
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
                {element.locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => toggleElementVisibility(element.id)}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title={element.visible ? 'Hide' : 'Show'}
              >
                {element.visible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Type-specific properties */}
          {element.type === 'text' && (
            <TextProperties
              element={element as TextElement}
              onUpdate={(u) => updateElement(element.id, u)}
            />
          )}

          {element.type === 'image' && (
            <ImageProperties
              element={element as ImageElement}
              onUpdate={(u) => updateElement(element.id, u)}
            />
          )}

          {element.type === 'shape' && (
            <ShapeProperties
              element={element as ShapeElement}
              onUpdate={(u) => updateElement(element.id, u)}
            />
          )}

          {element.type === 'background' && (
            <BackgroundProperties
              element={element as BackgroundElement}
              onUpdate={(u) => updateElement(element.id, u)}
            />
          )}

          {/* Common: Position & Size */}
          {!isBackground && (
            <>
              <Separator />
              <PositionSize
                element={element}
                onUpdate={(u) => updateElement(element.id, u)}
              />
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
                      onValueChange={(v) =>
                        updateElement(element.id, { opacity: v[0] / 100 })
                      }
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-10 text-right text-xs text-muted-foreground font-mono">
                      {Math.round(element.opacity * 100)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rotation</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.rotation]}
                      onValueChange={(v) =>
                        updateElement(element.id, { rotation: v[0] })
                      }
                      min={-180}
                      max={180}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-10 text-right text-xs text-muted-foreground font-mono">
                      {Math.round(element.rotation)}°
                    </span>
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
                <Label className="text-xs">Arrange Layer</Label>
                <div className="grid grid-cols-4 gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => bringToFront(element.id)}
                    disabled={!canMoveForward}
                    title="Bring to front"
                  >
                    <ChevronsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => bringForward(element.id)}
                    disabled={!canMoveForward}
                    title="Bring forward"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => sendBackward(element.id)}
                    disabled={!canMoveBackward}
                    title="Send backward"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => sendToBack(element.id)}
                    disabled={!canMoveBackward}
                    title="Send to back"
                  >
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
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => duplicateElement(element.id)}
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => deleteElement(element.id)}
                >
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

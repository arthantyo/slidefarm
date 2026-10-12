'use client';

import React from 'react';
import type { Slide, CanvasElement, BackgroundElement } from '@/types';
import type { GuideLine } from '@/lib/canvas/snapping';
import { BackgroundRenderer } from './elements/background-renderer';
import { ElementWrapper } from './elements/element-wrapper';
import { ElementTransformer } from './transformer/element-transformer';
import { GuideLinesOverlay } from './guides/guide-lines-overlay';
import { CanvasResizeHandles } from './canvas-size/canvas-resize-handles';

interface CanvasBoardProps {
  slide: Slide;
  width: number;
  height: number;
  zoom: number;
  selectedElementIds: string[];
  guides: GuideLine[];
  showGrid: boolean;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  setGuides: (guides: GuideLine[]) => void;
}

export function CanvasBoard({
  slide,
  width,
  height,
  zoom,
  selectedElementIds,
  guides,
  showGrid,
  onSelectElement,
  onUpdateElement,
  setGuides,
}: CanvasBoardProps) {
  const background = slide.elements.find((el) => el.type === 'background') as
    | BackgroundElement
    | undefined;

  const otherElements = slide.elements.filter((el) => el.type !== 'background');

  const selectedElement = otherElements.find((el) =>
    selectedElementIds.includes(el.id)
  );

  return (
    <div
      id="slide-canvas-board"
      className="relative select-none rounded-sm shadow-2xl transition-shadow ring-1 ring-border/50"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: background?.fill ?? '#ffffff',
      }}
    >
      {/* Background Layer */}
      {background && (
        <BackgroundRenderer element={background} width={width} height={height} />
      )}

      {/* Optional Dot Grid Pattern */}
      {showGrid && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      )}

      {/* Elements Layer */}
      {otherElements.map((el) => (
        <ElementWrapper
          key={el.id}
          element={el}
          isSelected={selectedElementIds.includes(el.id)}
          onSelect={(id) => onSelectElement(id)}
          onUpdate={onUpdateElement}
        />
      ))}

      {/* Guide lines overlay */}
      <GuideLinesOverlay
        guides={guides}
        canvasWidth={width}
        canvasHeight={height}
        zoom={zoom}
      />

      {/* Active Element Transformer (Resize + Rotate + Drag HUD) */}
      {selectedElement && (
        <ElementTransformer
          element={selectedElement}
          canvasWidth={width}
          canvasHeight={height}
          allElements={otherElements}
          zoom={zoom}
          onUpdate={(updates) => onUpdateElement(selectedElement.id, updates)}
          setGuides={setGuides}
        />
      )}

      {/* Canvas Edge Resize Handles */}
      <CanvasResizeHandles
        canvasWidth={width}
        canvasHeight={height}
        zoom={zoom}
      />
    </div>
  );
}

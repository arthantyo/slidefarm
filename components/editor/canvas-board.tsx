'use client';

import React, { useState, useRef, useCallback } from 'react';
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
  onSelectElement: (id: string | null, addToSelection?: boolean) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onMoveSelectedElements?: (dx: number, dy: number) => void;
  setGuides: (guides: GuideLine[]) => void;
}

// Rubber-band selection box
interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
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
  onMoveSelectedElements,
  setGuides,
}: CanvasBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const background = slide.elements.find((el) => el.type === 'background') as
    | BackgroundElement
    | undefined;

  const otherElements = slide.elements.filter((el) => el.type !== 'background');

  // ----- Rubber-band drag on canvas background --------------------------------
  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only react to direct clicks on the board (not on child elements)
      if (e.target !== boardRef.current) return;
      if (e.button !== 0) return;

      // Deselect all (unless shift is held for additive mode)
      if (!e.shiftKey && !e.metaKey) {
        onSelectElement(null);
      }

      const rect = boardRef.current!.getBoundingClientRect();
      const startX = (e.clientX - rect.left) / zoom;
      const startY = (e.clientY - rect.top) / zoom;

      setSelectionBox({ startX, startY, currentX: startX, currentY: startY });

      const onPointerMove = (moveEvt: PointerEvent) => {
        const currentX = (moveEvt.clientX - rect.left) / zoom;
        const currentY = (moveEvt.clientY - rect.top) / zoom;
        setSelectionBox((prev) => prev ? { ...prev, currentX, currentY } : null);
      };

      const onPointerUp = (upEvt: PointerEvent) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);

        setSelectionBox((prev) => {
          if (!prev) return null;

          const selLeft = Math.min(prev.startX, prev.currentX);
          const selTop = Math.min(prev.startY, prev.currentY);
          const selRight = Math.max(prev.startX, prev.currentX);
          const selBottom = Math.max(prev.startY, prev.currentY);

          // Only count as a meaningful drag if box is > 4px
          if (selRight - selLeft > 4 || selBottom - selTop > 4) {
            const hit = otherElements
              .filter((el) => !el.locked)
              .filter((el) => {
                return (
                  el.x < selRight &&
                  el.x + el.width > selLeft &&
                  el.y < selBottom &&
                  el.y + el.height > selTop
                );
              })
              .map((el) => el.id);

            if (hit.length > 0) {
              // Use selectMultiple via the editor store directly
              import('@/stores/editor-store').then(({ useEditorStore }) => {
                useEditorStore.getState().selectMultiple(
                  upEvt.shiftKey || upEvt.metaKey
                    ? [...new Set([...useEditorStore.getState().selectedElementIds, ...hit])]
                    : hit
                );
              });
            }
          }

          return null;
        });
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [zoom, otherElements, onSelectElement]
  );

  // ----- Multi-element drag (shared bounding box transformer) ----------------
  const selectedElements = otherElements.filter((el) =>
    selectedElementIds.includes(el.id)
  );
  const singleSelected =
    selectedElements.length === 1 ? selectedElements[0] : null;

  // Bounding box of all selected elements (for multi-select outline)
  const multiBBox =
    selectedElements.length > 1
      ? {
          x: Math.min(...selectedElements.map((el) => el.x)),
          y: Math.min(...selectedElements.map((el) => el.y)),
          right: Math.max(...selectedElements.map((el) => el.x + el.width)),
          bottom: Math.max(...selectedElements.map((el) => el.y + el.height)),
        }
      : null;

  // Drag handler for the multi-select bounding box
  const handleMultiDragPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    // snapshot start positions
    const startPositions = selectedElements.map((el) => ({ id: el.id, x: el.x, y: el.y }));

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startPointerX) / zoom;
      const dy = (moveEvt.clientY - startPointerY) / zoom;
      startPositions.forEach(({ id, x, y }) => {
        onUpdateElement(id, { x: x + dx, y: y + dy });
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setGuides([]);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Rubber-band box in canvas-space px
  const selBoxStyle =
    selectionBox
      ? {
          left: Math.min(selectionBox.startX, selectionBox.currentX),
          top: Math.min(selectionBox.startY, selectionBox.currentY),
          width: Math.abs(selectionBox.currentX - selectionBox.startX),
          height: Math.abs(selectionBox.currentY - selectionBox.startY),
        }
      : null;

  return (
    <div
      ref={boardRef}
      id="slide-canvas-board"
      onPointerDown={handleBoardPointerDown}
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
          onSelect={(id, addToSelection) => onSelectElement(id, addToSelection)}
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

      {/* Single element transformer */}
      {singleSelected && (
        <ElementTransformer
          element={singleSelected}
          canvasWidth={width}
          canvasHeight={height}
          allElements={otherElements}
          zoom={zoom}
          onUpdate={(updates) => onUpdateElement(singleSelected.id, updates)}
          setGuides={setGuides}
        />
      )}

      {/* Multi-select bounding box + move handle */}
      {multiBBox && (
        <div
          onPointerDown={handleMultiDragPointerDown}
          className="absolute z-30 cursor-move border-2 border-primary pointer-events-auto"
          style={{
            left: multiBBox.x,
            top: multiBBox.y,
            width: multiBBox.right - multiBBox.x,
            height: multiBBox.bottom - multiBBox.y,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.4)',
          }}
        >
          {/* Individual selected-element outlines inside the bbox */}
          {selectedElements.map((el) => (
            <div
              key={el.id}
              className="absolute border border-primary/50 pointer-events-none"
              style={{
                left: el.x - multiBBox.x,
                top: el.y - multiBBox.y,
                width: el.width,
                height: el.height,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                transformOrigin: 'center center',
              }}
            />
          ))}
        </div>
      )}

      {/* Rubber-band selection marquee */}
      {selBoxStyle && selBoxStyle.width > 2 && selBoxStyle.height > 2 && (
        <div
          className="pointer-events-none absolute z-40 border border-primary bg-primary/10"
          style={selBoxStyle}
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

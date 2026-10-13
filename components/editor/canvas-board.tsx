'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Slide, CanvasElement, BackgroundElement } from '@/types';
import type { GuideLine } from '@/lib/canvas/snapping';
import { calculateSnapping } from '@/lib/canvas/snapping';
import { BackgroundRenderer } from './elements/background-renderer';
import { ElementWrapper } from './elements/element-wrapper';
import { ElementTransformer } from './transformer/element-transformer';
import { ReplaceImageDialog } from './replace-image-dialog';
import { GuideLinesOverlay } from './guides/guide-lines-overlay';
import { CanvasResizeHandles } from './canvas-size/canvas-resize-handles';
import { DragIndicatorHUD } from './indicators/drag-indicator-hud';
import { useEditorStore } from '@/stores/editor-store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface CanvasBoardProps {
  slide: Slide;
  width: number;
  height: number;
  zoom: number;
  selectedElementIds: string[];
  guides: GuideLine[];
  showGrid: boolean;
  selectionEnabled: boolean;
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
  selectionEnabled,
  onSelectElement,
  onUpdateElement,
  onMoveSelectedElements,
  setGuides,
}: CanvasBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const selectionEnabledRef = useRef(selectionEnabled);
  selectionEnabledRef.current = selectionEnabled;
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [contextElementId, setContextElementId] = useState<string | null>(null);
  const [replacementImageId, setReplacementImageId] = useState<string | null>(null);
  const [remixingImageId, setRemixingImageId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const lastTextClickRef = useRef<{ id: string; time: number; x: number; y: number } | null>(null);
  const [multiDragIndicator, setMultiDragIndicator] = useState<{
    x: number;
    y: number;
    snapLabelX?: string;
    snapLabelY?: string;
  } | null>(null);

  useEffect(() => {
    if (!selectionEnabled) {
      setSelectionBox(null);
      setEditingElementId(null);
      setMultiDragIndicator(null);
    }
  }, [selectionEnabled]);

  const handleTextPointerDown = useCallback((element: CanvasElement, event: React.PointerEvent) => {
    if (element.type !== 'text' || element.locked || event.button !== 0) return false;
    const now = performance.now();
    const last = lastTextClickRef.current;
    const isDoubleClick =
      !!last &&
      last.id === element.id &&
      now - last.time <= 500 &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) <= 8;
    if (isDoubleClick) {
      lastTextClickRef.current = null;
      // Keep the gesture from moving focus, so the editor can take it after this click.
      event.preventDefault();
      const stopClick = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        window.removeEventListener('click', stopClick, true);
      };
      window.addEventListener('click', stopClick, true);
      setEditingElementId(element.id);
      return true;
    }
    lastTextClickRef.current = {
      id: element.id,
      time: now,
      x: event.clientX,
      y: event.clientY,
    };
    return false;
  }, []);

  useEffect(() => {
    if (!editingElementId) return;
    const element = slide.elements.find((el) => el.id === editingElementId);
    if (!element || element.type !== 'text' || element.locked || !selectedElementIds.includes(editingElementId)) {
      setEditingElementId(null);
    }
  }, [editingElementId, selectedElementIds, slide.elements]);

  const background = slide.elements.find((el) => el.type === 'background') as
    | BackgroundElement
    | undefined;

  const otherElements = slide.elements.filter((el) => el.type !== 'background');
  const contextElement = otherElements.find((element) => element.id === contextElementId);
  const contextLayerIndex = otherElements.findIndex((element) => element.id === contextElementId);
  const replacementImage = otherElements.find((element) => element.id === replacementImageId);

  const handleObjectContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-canvas-element-id]')
      : null;
    let elementId = target?.dataset.canvasElementId;
    if (!elementId && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / zoom;
      const y = (event.clientY - rect.top) / zoom;
      const lockedElement = [...otherElements].reverse().find((element) => {
        if (!element.visible || !element.locked) return false;
        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;
        const angle = -(element.rotation ?? 0) * Math.PI / 180;
        const dx = x - centerX;
        const dy = y - centerY;
        const localX = dx * Math.cos(angle) - dy * Math.sin(angle) + centerX;
        const localY = dx * Math.sin(angle) + dy * Math.cos(angle) + centerY;
        return localX >= element.x && localX <= element.x + element.width &&
          localY >= element.y && localY <= element.y + element.height;
      });
      elementId = lockedElement?.id;
    }
    if (!elementId || !otherElements.some((element) => element.id === elementId)) {
      event.preventDefault();
      setContextElementId(null);
      return;
    }
    setContextElementId(elementId);
    if (!otherElements.find((element) => element.id === elementId)?.locked) {
      onSelectElement(elementId);
    }
  };

  const copyContextElement = () => {
    if (!contextElementId) return;
    const store = useEditorStore.getState();
    store.selectElement(contextElementId);
    store.copySelected();
  };

  // ----- Rubber-band drag on canvas background --------------------------------
  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!selectionEnabled) return;
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
        if (!selectionEnabledRef.current) return;
        const currentX = (moveEvt.clientX - rect.left) / zoom;
        const currentY = (moveEvt.clientY - rect.top) / zoom;
        setSelectionBox((prev) => prev ? { ...prev, currentX, currentY } : null);
      };

      const onPointerUp = (upEvt: PointerEvent) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        if (!selectionEnabledRef.current) {
          setSelectionBox(null);
          return;
        }

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
              if (selectionEnabledRef.current) {
                useEditorStore.getState().selectMultiple(
                  upEvt.shiftKey || upEvt.metaKey
                    ? Array.from(new Set([...useEditorStore.getState().selectedElementIds, ...hit]))
                    : hit
                );
              }
            }
          }

          return null;
        });
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [selectionEnabled, zoom, otherElements, onSelectElement]
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
    if (!selectionEnabled) return;
    if (e.button !== 0) return;
    e.stopPropagation();

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    if (!multiBBox) return;
    const startBox = multiBBox;
    const otherElements = slide.elements.filter((el) => !selectedElementIds.includes(el.id));
    // snapshot start positions
    const startPositions = selectedElements.map((el) => ({ id: el.id, x: el.x, y: el.y }));

    const onPointerMove = (moveEvt: PointerEvent) => {
      const rawX = startBox.x + (moveEvt.clientX - startPointerX) / zoom;
      const rawY = startBox.y + (moveEvt.clientY - startPointerY) / zoom;
      const snap = calculateSnapping({
        draggedId: selectedElements[0].id,
        x: rawX,
        y: rawY,
        width: startBox.right - startBox.x,
        height: startBox.bottom - startBox.y,
        canvasWidth: width,
        canvasHeight: height,
        allElements: otherElements,
      });
      const dx = snap.x - startBox.x;
      const dy = snap.y - startBox.y;
      startPositions.forEach(({ id, x, y }) => {
        onUpdateElement(id, { x: x + dx, y: y + dy });
      });
      setGuides(snap.guides);
      setMultiDragIndicator({
        x: snap.x + (startBox.right - startBox.x) / 2,
        y: snap.y,
        snapLabelX: snap.snapLabelX,
        snapLabelY: snap.snapLabelY,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setGuides([]);
      setMultiDragIndicator(null);
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
    <>
    <ContextMenu onOpenChange={(open) => { if (!open) setContextElementId(null); }}>
      <ContextMenuTrigger asChild>
    <div
      ref={boardRef}
      id="slide-canvas-board"
      onPointerDown={handleBoardPointerDown}
      onContextMenuCapture={handleObjectContextMenu}
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
          isRemixing={remixingImageId === el.id}
          isSelected={selectedElementIds.includes(el.id)}
          selectionEnabled={selectionEnabled}
          isEditing={editingElementId === el.id}
          onSelect={(id, addToSelection) => onSelectElement(id, addToSelection)}
          onUpdate={onUpdateElement}
          onTextPointerDown={handleTextPointerDown}
          onEditStart={() => {
            if (selectionEnabled && el.type === 'text' && !el.locked) setEditingElementId(el.id);
          }}
          onEditEnd={() => {
            setEditingElementId((current) => (current === el.id ? null : current));
          }}
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
      {selectionEnabled && singleSelected && (
        <ElementTransformer
          element={singleSelected}
          canvasWidth={width}
          canvasHeight={height}
          allElements={otherElements}
          zoom={zoom}
          onUpdate={(updates) => onUpdateElement(singleSelected.id, updates)}
          setGuides={setGuides}
          isEditing={editingElementId === singleSelected.id}
          onTextPointerDown={handleTextPointerDown}
        />
      )}

      {/* Multi-select bounding box + move handle */}
      {selectionEnabled && multiBBox && (
        <div
          data-canvas-element-id={selectedElements[0].id}
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
          <div className="pointer-events-none absolute -top-7 left-0 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow">
            {selectedElements.length} selected
          </div>
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

      {selectionEnabled && multiBBox && multiDragIndicator && (
        <DragIndicatorHUD
          x={multiDragIndicator.x}
          y={multiDragIndicator.y}
          zoom={zoom}
          mode="drag"
          snapLabelX={multiDragIndicator.snapLabelX}
          snapLabelY={multiDragIndicator.snapLabelY}
        />
      )}

      {/* Rubber-band selection marquee */}
      {selectionEnabled && selBoxStyle && selBoxStyle.width > 2 && selBoxStyle.height > 2 && (
        <div
          className="pointer-events-none absolute z-40 border border-primary bg-primary/10"
          style={selBoxStyle}
        />
      )}

      {/* Canvas Edge Resize Handles */}
      {selectionEnabled && <CanvasResizeHandles
        canvasWidth={width}
        canvasHeight={height}
        zoom={zoom}
      />}

    </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        className="min-w-44"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {contextElement?.type === 'image' && (
          <>
            <ContextMenuItem onSelect={() => {
              const imageId = contextElement.id;
              window.setTimeout(() => setReplacementImageId(imageId), 0);
            }}>Remix image...</ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem disabled={!contextElement} onSelect={copyContextElement}>Copy</ContextMenuItem>
        <ContextMenuItem disabled={!contextElement} onSelect={() => contextElementId && useEditorStore.getState().duplicateElement(contextElementId)}>Duplicate</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={contextLayerIndex < 0 || contextLayerIndex === otherElements.length - 1} onSelect={() => contextElementId && useEditorStore.getState().bringForward(contextElementId)}>Bring forward</ContextMenuItem>
        <ContextMenuItem disabled={contextLayerIndex < 0 || contextLayerIndex === otherElements.length - 1} onSelect={() => contextElementId && useEditorStore.getState().bringToFront(contextElementId)}>Bring to front</ContextMenuItem>
        <ContextMenuItem disabled={contextLayerIndex <= 0} onSelect={() => contextElementId && useEditorStore.getState().sendBackward(contextElementId)}>Send backward</ContextMenuItem>
        <ContextMenuItem disabled={contextLayerIndex <= 0} onSelect={() => contextElementId && useEditorStore.getState().sendToBack(contextElementId)}>Send to back</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!contextElement} onSelect={() => contextElementId && useEditorStore.getState().toggleElementLock(contextElementId)}>{contextElement?.locked ? 'Unlock' : 'Lock'}</ContextMenuItem>
        <ContextMenuItem disabled={!contextElement} className="text-destructive focus:text-destructive" onSelect={() => contextElementId && useEditorStore.getState().deleteElement(contextElementId)}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    {replacementImage?.type === 'image' && (
      <ReplaceImageDialog
        key={replacementImage.id}
        element={replacementImage}
        slideId={slide.id}
        onClose={() => setReplacementImageId(null)}
        onRemixPendingChange={(pending) => setRemixingImageId(pending ? replacementImage.id : null)}
      />
    )}
    </>
  );
}

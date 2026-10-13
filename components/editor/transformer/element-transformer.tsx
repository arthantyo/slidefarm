'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { CanvasElement } from '@/types';
import type { GuideLine } from '@/lib/canvas/snapping';
import { calculateSnapping, calculateResizeSnapping } from '@/lib/canvas/snapping';
import { ResizeHandle, type HandlePosition } from './resize-handle';
import { RotationHandle } from './rotation-handle';
import { DragIndicatorHUD } from '../indicators/drag-indicator-hud';

interface ElementTransformerProps {
  element: CanvasElement;
  canvasWidth: number;
  canvasHeight: number;
  allElements: CanvasElement[];
  zoom: number;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  setGuides: (guides: GuideLine[]) => void;
  isEditing: boolean;
  onTextPointerDown: (element: CanvasElement, event: React.PointerEvent) => boolean;
}

export function ElementTransformer({
  element,
  canvasWidth,
  canvasHeight,
  allElements,
  zoom,
  onUpdate,
  setGuides,
  isEditing,
  onTextPointerDown,
}: ElementTransformerProps) {
  const [hudState, setHudState] = useState<{
    visible: boolean;
    mode: 'drag' | 'resize' | 'rotate';
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;
    snapLabelX?: string;
    snapLabelY?: string;
  } | null>(null);

  // Dragging interaction
  const handleDragPointerDown = (e: React.PointerEvent) => {
    if (element.locked || e.button !== 0) return;
    e.stopPropagation();
    if (onTextPointerDown(element, e)) return;

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const startElX = element.x;
    const startElY = element.y;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startPointerX) / zoom;
      const dy = (moveEvt.clientY - startPointerY) / zoom;

      const rawX = startElX + dx;
      const rawY = startElY + dy;

      const snap = calculateSnapping({
        draggedId: element.id,
        x: rawX,
        y: rawY,
        width: element.width,
        height: element.height,
        canvasWidth,
        canvasHeight,
        allElements,
      });

      setGuides(snap.guides);
      onUpdate({ x: snap.x, y: snap.y });

      setHudState({
        visible: true,
        mode: 'drag',
        x: snap.x + element.width / 2,
        y: snap.y,
        snapLabelX: snap.snapLabelX,
        snapLabelY: snap.snapLabelY,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setGuides([]);
      setHudState(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Resizing interaction
  const handleResizePointerDown = (pos: HandlePosition, e: React.PointerEvent) => {
    if (element.locked) return;
    e.stopPropagation();

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const startX = element.x;
    const startY = element.y;
    const startW = element.width;
    const startH = element.height;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startPointerX) / zoom;
      const dy = (moveEvt.clientY - startPointerY) / zoom;

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      if (pos.includes('e')) newW = Math.max(10, startW + dx);
      if (pos.includes('s')) newH = Math.max(10, startH + dy);
      if (pos.includes('w')) {
        const potentialW = Math.max(10, startW - dx);
        newX = startX + (startW - potentialW);
        newW = potentialW;
      }
      if (pos.includes('n')) {
        const potentialH = Math.max(10, startH - dy);
        newY = startY + (startH - potentialH);
        newH = potentialH;
      }

      // Calculate resize snapping against canvas edges and elements
      const snap = calculateResizeSnapping({
        elementId: element.id,
        handlePosition: pos,
        x: newX,
        y: newY,
        width: newW,
        height: newH,
        canvasWidth,
        canvasHeight,
        allElements,
      });

      setGuides(snap.guides);
      onUpdate({ x: snap.x, y: snap.y, width: snap.width, height: snap.height });
      setHudState({
        visible: true,
        mode: 'resize',
        x: snap.x + snap.width / 2,
        y: snap.y,
        width: snap.width,
        height: snap.height,
        snapLabelX: snap.snapLabelX,
        snapLabelY: snap.snapLabelY,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setGuides([]);
      setHudState(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Rotation interaction
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    if (element.locked) return;
    e.stopPropagation();

    const targetEl = document.getElementById(`element-${element.id}`);
    const rect = targetEl?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : e.clientX;
    const centerY = rect ? rect.top + rect.height / 2 : e.clientY;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const angleRad = Math.atan2(moveEvt.clientY - centerY, moveEvt.clientX - centerX);
      let angleDeg = (angleRad * 180) / Math.PI + 90;
      if (angleDeg < 0) angleDeg += 360;

      // Snap to 15 degree intervals if Shift is held
      if (moveEvt.shiftKey) {
        angleDeg = Math.round(angleDeg / 15) * 15;
      }

      onUpdate({ rotation: Math.round(angleDeg) });
      setHudState({
        visible: true,
        mode: 'rotate',
        x: element.x + element.width / 2,
        y: element.y,
        rotation: Math.round(angleDeg),
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setHudState(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const transform = element.rotation ? `rotate(${element.rotation}deg)` : undefined;
  const handles: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <>
      {/* Selection outline & drag target */}
      <div
        data-canvas-element-id={element.id}
        onPointerDown={handleDragPointerDown}
        className={`absolute z-30 border-2 border-primary ${
          isEditing || element.locked ? 'pointer-events-none' : 'pointer-events-auto'
        } ${
          element.locked ? 'border-dashed border-muted-foreground/60' : isEditing ? '' : 'cursor-move'
        }`}
        style={{
          left: `${element.x}px`,
          top: `${element.y}px`,
          width: `${element.width}px`,
          height: `${element.height}px`,
          transform,
          transformOrigin: 'center center',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.4)',
        }}
      >
        {!element.locked && (
          <>
            <RotationHandle onPointerDown={handleRotatePointerDown} />
            {handles.map((h) => (
              <ResizeHandle key={h} position={h} onPointerDown={handleResizePointerDown} />
            ))}
          </>
        )}
      </div>

      {hudState?.visible && (
        <DragIndicatorHUD
          x={hudState.x}
          y={hudState.y}
          width={hudState.width}
          height={hudState.height}
          rotation={hudState.rotation}
          zoom={zoom}
          mode={hudState.mode}
          snapLabelX={hudState.snapLabelX}
          snapLabelY={hudState.snapLabelY}
        />
      )}
    </>
  );
}

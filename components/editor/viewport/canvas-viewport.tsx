'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Slide, CanvasElement } from '@/types';
import type { GuideLine } from '@/lib/canvas/snapping';
import { useEditorStore } from '@/stores/editor-store';
import { createImageElement } from '@/lib/canvas/element-factory';
import { CanvasBoard } from '../canvas-board';
import { CanvasToolbar } from './canvas-toolbar';
import { CanvasSizePopover } from '../canvas-size/canvas-size-popover';

interface CanvasViewportProps {
  slide: Slide;
  width: number;
  height: number;
  selectedElementIds: string[];
  onSelectElement: (id: string | null, addToSelection?: boolean) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeselectAll: () => void;
}

export function CanvasViewport({
  slide,
  width,
  height,
  selectedElementIds,
  onSelectElement,
  onUpdateElement,
  onDeselectAll,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoom, setZoom, pan, setPan, activeTool, setActiveTool, addElement } = useEditorStore();
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto fit-to-screen calculation
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 100;
    const availableW = Math.max(200, rect.width - padding);
    const availableH = Math.max(200, rect.height - padding);

    const fitZoom = Math.min(availableW / width, availableH / height, 1.2);
    const clampedZoom = Math.max(0.1, Math.min(2, fitZoom));

    // Center the board
    const centerX = (rect.width - width * clampedZoom) / 2;
    const centerY = (rect.height - height * clampedZoom) / 2;

    setZoom(clampedZoom);
    setPan({ x: centerX, y: centerY });
  }, [width, height, setZoom, setPan]);

  // Initial fit on mount
  useEffect(() => {
    handleFitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts for spacebar pan & tools
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

      if (e.code === 'Space' && !e.repeat && !isSpacePressed) {
        setIsSpacePressed(true);
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('hand');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isSpacePressed, setActiveTool]);

  // Wheel interactions: alt (or trackpad pinch) zoom, otherwise pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    // altKey is the mouse zoom modifier. ctrlKey stays so trackpad pinch,
    // which browsers report as a ctrl+wheel event, still zooms.
    if (e.altKey || e.ctrlKey) {
      // Zoom towards cursor
      const rect = containerRef.current.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.max(0.1, Math.min(3, zoom * factor));

      const newPanX = cursorX - (cursorX - pan.x) * (newZoom / zoom);
      const newPanY = cursorY - (cursorY - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      // Pan with wheel or trackpad
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Pan dragging via pointer
  const handlePointerDown = (e: React.PointerEvent) => {
    const isMiddleClick = e.button === 1;
    const isHandMode = activeTool === 'hand' || isSpacePressed;

    if (isMiddleClick || (e.button === 0 && isHandMode)) {
      e.preventDefault();
      setIsPanning(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const startPanX = pan.x;
      const startPanY = pan.y;

      const onPointerMove = (moveEvt: PointerEvent) => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;
        setPan({ x: startPanX + dx, y: startPanY + dy });
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        setIsPanning(false);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      return;
    }

    // Deselect if clicking on empty viewport background
    if (e.button === 0 && e.target === containerRef.current) {
      onDeselectAll();
    }
  };

  // ── Drag & Drop image files onto canvas ──────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear when leaving the viewport container itself
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = Array.from(e.dataTransfer.files).find((f) =>
        f.type.startsWith('image/')
      );
      if (!file || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      // Convert screen drop position → canvas-space coordinates
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasX = (screenX - pan.x) / zoom;
      const canvasY = (screenY - pan.y) / zoom;

      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        // Place image centered on drop point, default size 300×200
        const imgW = 300;
        const imgH = 200;
        const el = createImageElement({
          src,
          x: canvasX - imgW / 2,
          y: canvasY - imgH / 2,
          width: imgW,
          height: imgH,
        });
        addElement(el);
      };
      reader.readAsDataURL(file);
    },
    [pan, zoom, addElement]
  );

  const cursorClass = isPanning
    ? 'cursor-grabbing'
    : isSpacePressed || activeTool === 'hand'
    ? 'cursor-grab'
    : 'cursor-default';
  const selectionEnabled = activeTool === 'select' && !isSpacePressed;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative h-full w-full select-none overflow-hidden bg-dot-grid ${cursorClass}`}
      style={{
        backgroundColor: 'var(--canvas-bg, rgba(0, 0, 0, 0.04))',
        touchAction: 'none',
      }}
    >
      {/* Drag-over overlay */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded border-2 border-dashed border-primary bg-primary/10">
          <span className="rounded-lg bg-background/80 px-4 py-2 text-sm font-medium text-primary shadow">
            Drop image onto canvas
          </span>
        </div>
      )}

      {/* Top Floating Bar: Canvas Size & Presets */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
        <CanvasSizePopover />
      </div>

      {/* Transformed Stage Container */}
      <div
        className="absolute transition-transform duration-75 ease-out"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        <CanvasBoard
          slide={slide}
          width={width}
          height={height}
          zoom={zoom}
          selectedElementIds={selectedElementIds}
          guides={guides}
          showGrid={showGrid}
          selectionEnabled={selectionEnabled}
          onSelectElement={onSelectElement}
          onUpdateElement={onUpdateElement}
          setGuides={setGuides}
        />
      </div>

      {/* Bottom Floating Bar: Viewport Navigation Toolbar */}
      <CanvasToolbar
        onFitToScreen={handleFitToScreen}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
      />
    </div>
  );
}

'use client';

import React from 'react';
import type { CanvasElement, TextElement, ImageElement, ShapeElement } from '@/types';
import { TextRenderer } from './text-renderer';
import { ImageRenderer } from './image-renderer';
import { ShapeRenderer } from './shape-renderer';

interface ElementWrapperProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string, e: React.PointerEvent) => void;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
}

export function ElementWrapper({
  element,
  isSelected,
  onSelect,
  onUpdate,
}: ElementWrapperProps) {
  if (!element.visible || element.type === 'background') {
    return null;
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    // Left click only
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(element.id, e);
  };

  const transform = element.rotation ? `rotate(${element.rotation}deg)` : undefined;

  return (
    <div
      id={`element-${element.id}`}
      onPointerDown={handlePointerDown}
      className={`absolute select-none ${
        element.locked ? 'cursor-not-allowed' : 'cursor-move'
      }`}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform,
        transformOrigin: 'center center',
        opacity: element.opacity,
        touchAction: 'none',
      }}
    >
      {element.type === 'text' && (
        <TextRenderer
          element={element as TextElement}
          isSelected={isSelected}
          onUpdate={(updates) => onUpdate(element.id, updates)}
        />
      )}
      {element.type === 'image' && (
        <ImageRenderer element={element as ImageElement} />
      )}
      {element.type === 'shape' && (
        <ShapeRenderer element={element as ShapeElement} />
      )}
    </div>
  );
}

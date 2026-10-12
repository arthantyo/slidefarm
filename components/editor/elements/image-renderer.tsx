'use client';

import React, { useState } from 'react';
import type { ImageElement } from '@/types';
import { ImageIcon } from 'lucide-react';

interface ImageRendererProps {
  element: ImageElement;
}

export function ImageRenderer({ element }: ImageRendererProps) {
  const [hasError, setHasError] = useState(false);

  const shadowCss = element.shadow
    ? `${element.shadow.offsetX}px ${element.shadow.offsetY}px ${element.shadow.blur}px ${element.shadow.color}`
    : undefined;

  if (hasError || !element.src) {
    return (
      <div
        className="flex h-full w-full select-none flex-col items-center justify-center rounded border border-dashed border-muted-foreground/30 bg-muted/40 p-2 text-center text-xs text-muted-foreground"
        style={{
          borderRadius: `${element.cornerRadius}px`,
        }}
      >
        <ImageIcon className="mb-1 h-6 w-6 opacity-40" />
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full select-none overflow-hidden"
      style={{
        borderRadius: `${element.cornerRadius}px`,
        boxShadow: shadowCss,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={element.src}
        alt={element.name}
        onError={() => setHasError(true)}
        draggable={false}
        className="h-full w-full select-none"
        style={{
          objectFit: element.objectFit,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

'use client';

import React from 'react';
import type { BackgroundElement } from '@/types';

interface BackgroundRendererProps {
  element: BackgroundElement;
  width: number;
  height: number;
}

export function BackgroundRenderer({ element, width, height }: BackgroundRendererProps) {
  if (element.fillType === 'gradient' && element.gradientColor2) {
    const angle = element.gradientAngle ?? 135;
    return (
      <div
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
        style={{
          width,
          height,
          background: `linear-gradient(${angle}deg, ${element.fill}, ${element.gradientColor2})`,
        }}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      style={{
        width,
        height,
        backgroundColor: element.fill,
      }}
    />
  );
}

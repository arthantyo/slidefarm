'use client';

import React from 'react';
import type { GuideLine } from '@/lib/canvas/snapping';

interface GuideLinesOverlayProps {
  guides: GuideLine[];
  canvasWidth: number;
  canvasHeight: number;
  zoom?: number;
}

export function GuideLinesOverlay({
  guides,
  canvasWidth,
  canvasHeight,
  zoom = 1,
}: GuideLinesOverlayProps) {
  if (!guides || guides.length === 0) return null;

  const scale = Math.max(1, 0.85 / Math.max(0.1, zoom));
  const lineWidth = Math.max(2, Math.round(2 * scale));

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 overflow-visible"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {guides.map((guide) => {
        const isCanvas = guide.origin === 'canvas';
        // Vibrant magenta for canvas alignment, electric cyan for element alignment
        const lineColor = isCanvas ? '#ec4899' : '#06b6d4';

        if (guide.orientation === 'vertical') {
          return (
            <div
              key={guide.id}
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${guide.position - lineWidth / 2}px`,
                width: `${lineWidth}px`,
                height: `${canvasHeight}px`,
                backgroundColor: lineColor,
                boxShadow: `0 0 10px ${lineColor}, 0 0 4px #ffffff`,
              }}
            >
              {guide.label && (
                <div
                  className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-extrabold text-white shadow-2xl ring-2 ring-white/50"
                  style={{
                    backgroundColor: lineColor,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {guide.label}
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={guide.id}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${guide.position - lineWidth / 2}px`,
              height: `${lineWidth}px`,
              width: `${canvasWidth}px`,
              backgroundColor: lineColor,
              boxShadow: `0 0 10px ${lineColor}, 0 0 4px #ffffff`,
            }}
          >
            {guide.label && (
              <div
                className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-extrabold text-white shadow-2xl ring-2 ring-white/50"
                style={{
                  backgroundColor: lineColor,
                  transform: `scale(${scale})`,
                  transformOrigin: 'left center',
                }}
              >
                {guide.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

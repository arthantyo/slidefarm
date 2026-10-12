'use client';

import { useEffect, useRef, useState } from 'react';
import type { Slide, Theme } from '@/types';
import { SlideThumbnail } from '@/components/editor/slide-thumbnail';

interface SlidePreviewProps {
  slide: Slide;
  width: number;
  height: number;
  theme: Theme;
}

export function SlidePreview({ slide, width, height, theme }: SlidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {size.width > 0 && size.height > 0 && (
        <SlideThumbnail
          slide={slide}
          width={width}
          height={height}
          theme={theme}
          maxWidth={size.width}
          maxHeight={size.height}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect } from 'react';

export function useDesktopInteractive(stage: 'dashboard' | 'editor', ready: boolean) {
  useEffect(() => {
    if (!ready || !window.slidefarmWindow?.markInteractive) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        void window.slidefarmWindow?.markInteractive(stage);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [stage, ready]);
}

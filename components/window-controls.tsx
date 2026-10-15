"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";

export function WindowControls() {
  const [available, setAvailable] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const controls = window.slidefarmWindow;
    if (!controls) return;
    setAvailable(true);
    void controls.isMaximized().then(setMaximized);
    return controls.onMaximizedChange(setMaximized);
  }, []);

  if (!available) return null;

  return (
    <div
      className="window-no-drag ml-2 flex shrink-0 items-center pl-2"
      aria-label="Window controls"
    >
      <button
        type="button"
        aria-label="Minimize window"
        title="Minimize"
        onClick={() => void window.slidefarmWindow?.minimize()}
        className="flex h-9 w-10 items-center justify-center rounded-md hover:bg-accent"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={maximized ? "Restore window" : "Maximize window"}
        title={maximized ? "Restore" : "Maximize"}
        onClick={() => void window.slidefarmWindow?.toggleMaximize()}
        className="flex h-9 w-10 items-center justify-center rounded-md hover:bg-accent"
      >
        {maximized ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        aria-label="Close window"
        title="Close"
        onClick={() => void window.slidefarmWindow?.close()}
        className="flex h-9 w-10 items-center justify-center rounded-md hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

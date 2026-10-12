'use client';

import React from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Grid,
  Hand,
  Maximize2,
  MousePointer,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface CanvasToolbarProps {
  onFitToScreen: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
}

export function CanvasToolbar({
  onFitToScreen,
  showGrid,
  onToggleGrid,
}: CanvasToolbarProps) {
  const { zoom, setZoom, pan, resetView, activeTool, setActiveTool } = useEditorStore();

  const zoomLevels = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full border border-border/80 bg-background/90 p-1 shadow-xl backdrop-blur-md">
      {/* Select vs Hand (Pan) tool */}
      <Button
        variant={activeTool === 'select' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => setActiveTool('select')}
        title="Select Tool (V)"
      >
        <MousePointer className="h-4 w-4" />
      </Button>

      <Button
        variant={activeTool === 'hand' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => setActiveTool('hand')}
        title="Hand Tool / Pan (H or hold Space)"
      >
        <Hand className="h-4 w-4" />
      </Button>

      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Zoom controls */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => setZoom(zoom * 0.85)}
        title="Zoom Out (Ctrl+-)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-14 rounded-full px-1 text-xs font-mono font-medium"
          >
            {Math.round(zoom * 100)}%
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[5rem]">
          {zoomLevels.map((lvl) => (
            <DropdownMenuItem
              key={lvl}
              onClick={() => setZoom(lvl)}
              className="text-xs font-mono"
            >
              {Math.round(lvl * 100)}%
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={onFitToScreen} className="text-xs">
            Fit to Screen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setZoom(1)} className="text-xs">
            100%
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => setZoom(zoom * 1.15)}
        title="Zoom In (Ctrl++)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Fit to screen */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onFitToScreen}
        title="Fit canvas to screen"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>

      {/* Reset view */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={resetView}
        title="Reset view (pan to center, zoom 100%)"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>

      {/* Grid toggle */}
      <Button
        variant={showGrid ? 'secondary' : 'ghost'}
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onToggleGrid}
        title="Toggle Alignment Grid"
      >
        <Grid className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

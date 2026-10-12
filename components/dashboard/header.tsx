'use client';

import { Moon, Sun, Sparkles } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface DashboardHeaderProps {
  onToggleTheme: () => void;
  isDark: boolean;
}

export function DashboardHeader({ onToggleTheme, isDark }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Slide Studio</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">AI Slideshow Generator</p>
          </div>
        </div>

        <button
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

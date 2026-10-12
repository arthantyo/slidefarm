'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Undo2, Redo2, Download, Save, Sparkles,
  ZoomIn, ZoomOut, Loader2, ChevronDown,
} from 'lucide-react';
import type { ExportFormat } from '@/lib/export';
import { exportProject, downloadBlob, sanitizeFilename } from '@/lib/export';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun } from 'lucide-react';

interface EditorTopBarProps {
  onOpenGenerator?: () => void;
}

export function EditorTopBar({ onOpenGenerator }: EditorTopBarProps) {
  const router = useRouter();
  const { project, zoom, setZoom, undo, redo, canUndo, canRedo, isDirty, markClean } = useEditorStore();
  const saveProject = useProjectStore((s) => s.save);
  const { theme, setTheme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!project) return null;

  const handleSave = () => {
    setIsSaving(true);
    saveProject(project);
    markClean();
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportProgress('Preparing...');
    try {
      const blob = await exportProject(project, format, (current, total) => {
        setExportProgress(`Exporting ${current}/${total}...`);
      });
      const ext = format === 'jpg' ? 'jpg' : format === 'zip' ? 'zip' : format === 'pdf' ? 'pdf' : format === 'json' ? 'json' : 'png';
      const filename = format === 'zip'
        ? `${sanitizeFilename(project.name)}-slides.zip`
        : format === 'pdf'
        ? `${sanitizeFilename(project.name)}.pdf`
        : format === 'json'
        ? `${sanitizeFilename(project.name)}.json`
        : `${sanitizeFilename(project.name)}-slide-1.${ext}`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-3">
      {/* Left: back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <Input
          value={project.name}
          onChange={(e) => useEditorStore.getState().updateProjectName(e.target.value)}
          className="h-8 w-48 border-transparent bg-transparent text-sm font-medium hover:border-border focus:border-border"
        />
        {isDirty && (
          <span className="text-xs text-muted-foreground">Unsaved</span>
        )}
      </div>

      {/* Center: undo/redo + zoom */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" disabled={!canUndo()} onClick={undo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" disabled={!canRedo()} onClick={redo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className="mx-2 flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setZoom(zoom * 0.8)} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xs font-medium text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={() => setZoom(zoom * 1.25)} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right: save + export + theme */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>

        <Button
          size="sm"
          onClick={onOpenGenerator}
          className="gap-1.5"
          variant="outline"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" disabled={isExporting} className="gap-1.5">
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {exportProgress || 'Exporting...'}
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('png')}>PNG (first slide)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('jpg')}>JPG (first slide)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF (all slides)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('zip')}>ZIP (all slides as PNG)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>Project JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

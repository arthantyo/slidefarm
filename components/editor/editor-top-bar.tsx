"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { useCustomTemplateStore } from "@/stores/custom-template-store";
import { projectToCustomTemplate } from "@/lib/canvas/template-filler";
import { editingTemplateId, saveEditorProject } from "@/lib/canvas/save-editor-project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  Save,
  Sparkles,
  BookmarkPlus,
  ZoomIn,
  ZoomOut,
  Loader2,
  ChevronDown,
} from "lucide-react";
import type { ExportFormat } from "@/lib/export";
import { exportProject, downloadBlob, sanitizeFilename } from "@/lib/export";
import { trackEvent } from "@/lib/analytics/events";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WindowControls } from "@/components/window-controls";

interface EditorTopBarProps {
  onOpenGenerator?: () => void;
}

export function EditorTopBar({ onOpenGenerator }: EditorTopBarProps) {
  const router = useRouter();
  const {
    project,
    zoom,
    setZoom,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
    markClean,
  } = useEditorStore();
  const saveProject = useProjectStore((s) => s.save);
  const storageError = useProjectStore((s) => s.storageError);
  const templateStorageError = useCustomTemplateStore((s) => s.storageError);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateIdToUpdate, setTemplateIdToUpdate] = useState<string | null>(
    null,
  );
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("Custom");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  if (!project) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const saved = await saveEditorProject(project);
    if (saved && useEditorStore.getState().project === project) markClean();
    setIsSaving(false);
  };

  const handleSaveTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    setIsSavingTemplate(true);
    const templateStore = useCustomTemplateStore.getState();
    await templateStore.load();
    const existingTemplate = templateIdToUpdate
      ? templateStore.get(templateIdToUpdate)
      : undefined;
    const updatedTemplate = projectToCustomTemplate(project, name, templateDescription.trim(), templateCategory.trim() || "Custom");
    const saved = await templateStore.save(existingTemplate
      ? { ...updatedTemplate, id: existingTemplate.id, createdAt: existingTemplate.createdAt }
      : updatedTemplate);
    setIsSavingTemplate(false);
    if (!saved) return;
    if (editingTemplateId()) {
      if (useEditorStore.getState().project?.name !== name) {
        useEditorStore.getState().updateProjectName(name);
      }
      markClean();
    } else if (
      (await saveProject(project)) &&
      useEditorStore.getState().project === project
    ) {
      markClean();
    }
    setTemplateDialogOpen(false);
  };

  const openTemplateDialog = async () => {
    const templateStore = useCustomTemplateStore.getState();
    await templateStore.load();
    const templateId =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("editTemplate");
    const existingTemplate = templateId
      ? templateStore.get(templateId)
      : undefined;
    setTemplateIdToUpdate(existingTemplate?.id ?? null);
    setTemplateName(existingTemplate?.name ?? project.name);
    setTemplateDescription(existingTemplate?.description ?? "");
    setTemplateCategory(existingTemplate?.category ?? "Custom");
    setTemplateDialogOpen(true);
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportProgress("Preparing...");
    try {
      const blob = await exportProject(project, format, (current, total) => {
        setExportProgress(`Exporting ${current}/${total}...`);
      });
      const ext =
        format === "jpg"
          ? "jpg"
          : format === "zip"
            ? "zip"
            : format === "pdf"
              ? "pdf"
              : format === "json"
                ? "json"
                : "png";
      const filename =
        format === "zip"
          ? `${sanitizeFilename(project.name)}-slides.zip`
          : format === "pdf"
            ? `${sanitizeFilename(project.name)}.pdf`
            : format === "json"
              ? `${sanitizeFilename(project.name)}.json`
              : `${sanitizeFilename(project.name)}-slide-1.${ext}`;
      downloadBlob(blob, filename);
      trackEvent('project_exported', { format });
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  return (
    <header className="app-titlebar flex h-14 items-center justify-between border-b border-border bg-card px-3">
      {/* Left: back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Input
          value={project.name}
          onChange={(e) =>
            useEditorStore.getState().updateProjectName(e.target.value)
          }
          className="h-8 w-48 border-transparent bg-transparent text-sm font-medium hover:border-border focus:border-border"
        />
        {isDirty && (
          <span className="text-xs text-muted-foreground">Unsaved</span>
        )}
        {storageError && (
          <span className="text-xs text-destructive" role="alert">
            Save failed: local file unavailable
          </span>
        )}
        {templateStorageError && (
          <span className="text-xs text-destructive" role="alert">
            {templateStorageError}
          </span>
        )}
      </div>

      {/* Center: undo/redo + zoom */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={!canUndo()}
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!canRedo()}
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className="mx-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(zoom * 0.8)}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xs font-medium text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(zoom * 1.25)}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right: save + export */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </Button>

        <Button
          variant="outline"
          size="icon"
          title="Save or update template"
          aria-label="Save or update template"
          onClick={openTemplateDialog}
        >
          <BookmarkPlus className="h-4 w-4" />
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
                  {exportProgress || "Exporting..."}
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
            <DropdownMenuItem onClick={() => handleExport("png")}>
              PNG (first slide)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("jpg")}>
              JPG (first slide)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf")}>
              PDF (all slides)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("zip")}>
              ZIP (all slides as PNG)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("json")}>
              Project JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <WindowControls />
      </div>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {templateIdToUpdate ? "Update template" : "Save as template"}
            </DialogTitle>
            <DialogDescription>
              {templateIdToUpdate
                ? "Save your slide and placeholder changes back to this template."
                : "Save this project to your template gallery. Add placeholder keys to text and image elements in the properties panel."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="custom-template-name">Name</Label>
              <Input
                id="custom-template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-template-description">Description</Label>
              <Input
                id="custom-template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-template-category">Category</Label>
              <Input
                id="custom-template-category"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            {templateStorageError && (
              <p className="text-sm text-destructive" role="alert">{templateStorageError}</p>
            )}
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || isSavingTemplate}
            >
              {isSavingTemplate ? "Saving..." : templateIdToUpdate ? "Update template" : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

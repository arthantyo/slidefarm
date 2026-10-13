"use client";

import { useEffect, useState } from "react";
import type { CustomTemplate, Template } from "@/types";
import { STARTER_TEMPLATES } from "@/lib/canvas/templates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlidePreview } from "@/components/dashboard/slide-preview";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TemplateData } from "@/lib/canvas/template-filler";
import { LayoutGrid, List, Pencil, Trash2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const TEMPLATE_VIEW_KEY = "slidefarm-template-view";

interface TemplateGalleryProps {
  onUseTemplate: (template: Template) => void;
  customTemplates: CustomTemplate[];
  onFillTemplate: (template: CustomTemplate, data: TemplateData) => void;
  onEditTemplate: (template: CustomTemplate) => void;
  onDeleteTemplate: (template: CustomTemplate) => Promise<boolean>;
}

function getPlaceholderCounts(template: Template): Map<string, number> {
  const counts = new Map<string, number>();
  for (const slide of template.slides) {
    for (const element of slide.elements) {
      if ((element.type === 'text' || element.type === 'image') && element.placeholder) {
        counts.set(element.placeholder, (counts.get(element.placeholder) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export function TemplateGallery({
  onUseTemplate,
  customTemplates,
  onFillTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: TemplateGalleryProps) {
  const [templateToFill, setTemplateToFill] = useState<CustomTemplate | null>(
    null,
  );
  const [jsonValue, setJsonValue] = useState("{}");
  const [jsonError, setJsonError] = useState("");
  const [templateToDelete, setTemplateToDelete] = useState<CustomTemplate | null>(null);
  const [layout, setLayout] = useState<"card" | "list">("card");
  const templates: Template[] = [...STARTER_TEMPLATES, ...customTemplates];

  useEffect(() => {
    const stored = localStorage.getItem(TEMPLATE_VIEW_KEY);
    if (stored === "list" || stored === "card") setLayout(stored);
  }, []);

  const changeLayout = (view: "card" | "list") => {
    setLayout(view);
    localStorage.setItem(TEMPLATE_VIEW_KEY, view);
  };

  const openFillDialog = (template: CustomTemplate) => {
    const placeholderCounts = getPlaceholderCounts(template);
    setTemplateToFill(template);
    setJsonValue(
      JSON.stringify(
        Object.fromEntries(
          Array.from(placeholderCounts, ([key, count]) => [
            key,
            count > 1 ? Array<string>(count).fill("") : "",
          ]),
        ),
        null,
        2,
      ),
    );
    setJsonError("");
  };

  const handleFill = () => {
    if (!templateToFill) return;
    try {
      const parsed: unknown = JSON.parse(jsonValue);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Enter a JSON object with placeholder keys.");
      }
      const data: TemplateData = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) {
          if (
            !value.every(
              (item) =>
                typeof item === "string" ||
                typeof item === "number" ||
                typeof item === "boolean",
            )
          ) {
            throw new Error(`Every value for "${key}" must be text or a number.`);
          }
          data[key] = value.map(String);
        } else if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          data[key] = String(value);
        } else {
          throw new Error(`The value for "${key}" must be text or a number.`);
        }
      }
      onFillTemplate(templateToFill, data);
      setTemplateToFill(null);
    } catch (error) {
      setJsonError(
        error instanceof Error ? error.message : "Could not read JSON.",
      );
    }
  };

  return (
    <>
      <div className="mb-5 flex items-center justify-end">
        <ToggleGroup
          type="single"
          value={layout}
          onValueChange={(value) => {
            if (value === "card" || value === "list") changeLayout(value);
          }}
          variant="outline"
          size="sm"
          aria-label="Template view"
        >
          <ToggleGroupItem value="card" aria-label="Card view" title="Cards">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" title="List">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div
        className={
          layout === "list"
            ? "flex flex-col gap-2"
            : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }
      >
        {templates.map((template) => {
          const customTemplate = customTemplates.find(
            (item) => item.id === template.id,
          );
          const category =
            template.category || (customTemplate ? "Custom" : "Starter");
          const actions = (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUseTemplate(template)}
              >
                Use template
              </Button>
              {customTemplate && (
                <Button size="sm" onClick={() => openFillDialog(customTemplate)}>
                  Fill with JSON
                </Button>
              )}
              {customTemplate && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Edit template"
                    aria-label={`Edit ${customTemplate.name}`}
                    onClick={() => onEditTemplate(customTemplate)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Delete template"
                    aria-label={`Delete ${customTemplate.name}`}
                    onClick={() => setTemplateToDelete(customTemplate)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </>
          );

          if (layout === "list") {
            return (
              <Card
                key={template.id}
                className="flex flex-col gap-3 p-2 transition-all hover:border-primary/30 hover:shadow-md sm:flex-row sm:items-center sm:pr-3"
              >
                <div
                  className="relative shrink-0 overflow-hidden rounded-md bg-muted"
                  style={{ width: 128, height: 72 }}
                >
                  <SlidePreview
                    slide={template.slides[0]}
                    width={template.dimensions.width}
                    height={template.dimensions.height}
                    theme={template.theme}
                    fit="cover"
                  />
                </div>
                <div className="min-w-0 flex-1 px-1 sm:px-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{template.name}</h3>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {category}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1 px-1 sm:px-0">
                  {actions}
                </div>
              </Card>
            );
          }

          return (
            <Card
              key={template.id}
              className="group overflow-hidden p-0 transition-all hover:shadow-lg hover:border-primary/30"
            >
              <div
                className="relative overflow-hidden bg-muted"
                style={{ aspectRatio: '16 / 9' }}
              >
                <SlidePreview
                  slide={template.slides[0]}
                  width={template.dimensions.width}
                  height={template.dimensions.height}
                  theme={template.theme}
                  fit="cover"
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold">
                    {template.name}
                  </h3>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {template.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onUseTemplate(template)}
                  >
                    Use template
                  </Button>
                  {customTemplate && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => openFillDialog(customTemplate)}
                    >
                      Fill with JSON
                    </Button>
                  )}
                </div>
                {customTemplate && (
                  <div className="mt-1 flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Edit template"
                      aria-label={`Edit ${customTemplate.name}`}
                      onClick={() => onEditTemplate(customTemplate)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete template"
                      aria-label={`Delete ${customTemplate.name}`}
                      onClick={() => setTemplateToDelete(customTemplate)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={!!templateToFill}
        onOpenChange={(open) => !open && setTemplateToFill(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fill {templateToFill?.name}</DialogTitle>
            <DialogDescription>
              Paste a JSON object. Use image URLs or data URLs for image keys.
              Array values fill repeated keys in slide order.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={jsonValue}
            onChange={(e) => setJsonValue(e.target.value)}
            className="min-h-48 font-mono text-xs"
            aria-label="Template JSON data"
            spellCheck={false}
          />
          {jsonError && (
            <p className="text-sm text-destructive" role="alert">
              {jsonError}
            </p>
          )}
          <DialogFooter>
            <Button onClick={handleFill}>Create project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!templateToDelete}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              {templateToDelete?.name} will be removed from your template gallery. Existing projects made from it will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={async (event) => {
                  event.preventDefault();
                  if (templateToDelete && await onDeleteTemplate(templateToDelete)) {
                    setTemplateToDelete(null);
                  }
                }}
              >
                Delete template
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

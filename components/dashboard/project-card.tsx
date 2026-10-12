"use client";

import { useState } from "react";
import type { Project, ProjectFolder } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreVertical,
  Copy,
  Trash2,
  FolderOpen,
  Folder,
  Pencil,
  Wand2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidePreview } from "@/components/dashboard/slide-preview";

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRemix: () => void;
  onRename: (name: string) => void;
  folders: ProjectFolder[];
  onMoveToFolder: (folderId: string | null) => void;
}

export function ProjectCard({
  project,
  onOpen,
  onDelete,
  onDuplicate,
  onRemix,
  onRename,
  folders,
  onMoveToFolder,
}: ProjectCardProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const slideCount = project.slides.length;
  const aspectRatio = project.dimensions.width / project.dimensions.height;
  const lastUpdated = new Date(project.updatedAt).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <Card className="group relative overflow-hidden p-0 transition-all hover:shadow-lg hover:border-primary/30">
      {/* Thumbnail */}
      <div
        className="relative cursor-pointer overflow-hidden bg-muted"
        style={{ aspectRatio: `${aspectRatio}` }}
        onClick={onOpen}
      >
        <SlidePreview
          slide={project.slides[0]}
          width={project.dimensions.width}
          height={project.dimensions.height}
          theme={project.theme}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
          <Button size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Open
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{project.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {slideCount} slide{slideCount !== 1 ? "s" : ""} · {lastUpdated}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen} className="gap-2">
              <FolderOpen className="h-4 w-4" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setProjectName(project.name);
                setRenameOpen(true);
              }}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} className="gap-2">
              <Copy className="h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRemix} className="gap-2">
              <Wand2 className="h-4 w-4" /> Remix with AI
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <Folder className="h-4 w-4" /> Move to folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={project.folderId ?? "unfiled"}
                  onValueChange={(value) =>
                    onMoveToFolder(value === "unfiled" ? null : value)
                  }
                >
                  <DropdownMenuRadioItem value="unfiled">
                    Unfiled
                  </DropdownMenuRadioItem>
                  {folders.map((folder) => (
                    <DropdownMenuRadioItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`project-name-${project.id}`}>Project name</Label>
            <Input
              id={`project-name-${project.id}`}
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && projectName.trim()) {
                  onRename(projectName);
                  setRenameOpen(false);
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                onRename(projectName);
                setRenameOpen(false);
              }}
              disabled={!projectName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

"use client";

import type { Project, ProjectFolder } from "@/types";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Copy,
  FolderPlus,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

interface ProjectSectionProps {
  projects: Project[];
  visibleProjects: Project[];
  loaded: boolean;
  folders: ProjectFolder[];
  selectedFolderId: string;
  selectedFolder?: ProjectFolder;
  projectView: "card" | "list";
  selectedProjectIds: string[];
  remixingSource: Project | null;
  remixingVisible: boolean;
  onFolderChange: (folderId: string) => void;
  onProjectViewChange: (view: "card" | "list") => void;
  onOpenFolderDialog: (folder?: ProjectFolder) => void;
  onDeleteFolderRequest: (folder: ProjectFolder) => void;
  onToggleSelected: (id: string) => void;
  onSelectAll: () => void;
  onDuplicateSelected: () => void;
  onMoveSelected: (folderId: string | null) => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onRemixProject: (project: Project) => void;
  onRenameProject: (id: string, name: string) => void;
  onMoveProject: (id: string, folderId: string | null) => void;
  onGenerate: () => void;
}

export function ProjectSection({
  projects,
  visibleProjects,
  loaded,
  folders,
  selectedFolderId,
  selectedFolder,
  projectView,
  selectedProjectIds,
  remixingSource,
  remixingVisible,
  onFolderChange,
  onProjectViewChange,
  onOpenFolderDialog,
  onDeleteFolderRequest,
  onToggleSelected,
  onSelectAll,
  onDuplicateSelected,
  onMoveSelected,
  onDeleteSelected,
  onClearSelection,
  onOpenProject,
  onDeleteProject,
  onDuplicateProject,
  onRemixProject,
  onRenameProject,
  onMoveProject,
  onGenerate,
}: ProjectSectionProps) {
  return (
    <>
      {selectedProjectIds.length > 0 && (
        <div
          className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3"
          role="toolbar"
          aria-label="Selected project actions"
        >
          <span className="mr-2 text-sm font-medium">
            {selectedProjectIds.length} selected
          </span>
          <Button size="sm" variant="outline" onClick={onSelectAll}>
            Select all visible
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDuplicateSelected}
            className="gap-1.5"
          >
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          <Select
            onValueChange={(value) =>
              onMoveSelected(value === "unfiled" ? null : value)
            }
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Move to folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unfiled">Unfiled</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="destructive"
            onClick={onDeleteSelected}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="ml-auto gap-1.5"
          >
            <X className="h-4 w-4" /> Cancel
          </Button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Select value={selectedFolderId} onValueChange={onFolderChange}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="unfiled">Unfiled</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenFolderDialog()}
          className="gap-1.5"
        >
          <FolderPlus className="h-4 w-4" /> New folder
        </Button>
        {selectedFolder && (
          <>
            <Button
              variant="ghost"
              size="icon"
              title="Rename folder"
              aria-label={`Rename ${selectedFolder.name}`}
              onClick={() => onOpenFolderDialog(selectedFolder)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Delete folder"
              aria-label={`Delete ${selectedFolder.name}`}
              onClick={() => onDeleteFolderRequest(selectedFolder)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        <ToggleGroup
          type="single"
          value={projectView}
          onValueChange={(value) => {
            if (value === "card" || value === "list")
              onProjectViewChange(value);
          }}
          variant="outline"
          size="sm"
          className="ml-auto"
          aria-label="Project view"
        >
          <ToggleGroupItem value="card" aria-label="Card view" title="Cards">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" title="List">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {!loaded ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No projects yet</h3>
            <p className="mt-1 text-muted-foreground">
              Generate your first slideshow with AI or start from a template.
            </p>
          </div>
          <Button onClick={onGenerate} className="mt-2 gap-2">
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </Button>
        </div>
      ) : visibleProjects.length === 0 && !remixingVisible ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No projects in this folder yet.
        </div>
      ) : (
        <div
          className={
            projectView === "list"
              ? "flex flex-col gap-2"
              : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }
        >
          {remixingVisible && remixingSource && (
            <ProjectCard
              project={{
                ...remixingSource,
                id: `remixing-${remixingSource.id}`,
              }}
              loading
              onOpen={() => {}}
              onDelete={() => {}}
              onDuplicate={() => {}}
              onRemix={() => {}}
              onRename={() => {}}
              folders={folders}
              onMoveToFolder={() => {}}
              layout={projectView}
            />
          )}
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              layout={projectView}
              selected={selectedProjectIds.includes(project.id)}
              selectionMode={selectedProjectIds.length > 0}
              onToggleSelected={() => onToggleSelected(project.id)}
              onOpen={() => onOpenProject(project.id)}
              onDelete={() => onDeleteProject(project.id)}
              onDuplicate={() => onDuplicateProject(project.id)}
              onRemix={() => onRemixProject(project)}
              onRename={(name) => onRenameProject(project.id, name)}
              folders={folders}
              onMoveToFolder={(folderId) => onMoveProject(project.id, folderId)}
            />
          ))}
        </div>
      )}
    </>
  );
}

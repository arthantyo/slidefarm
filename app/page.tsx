"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectFolder } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import { useCustomTemplateStore } from "@/stores/custom-template-store";
import { createBlankProject, STARTER_TEMPLATES } from "@/lib/canvas/templates";
import { fillTemplateFromData, projectFromTemplate } from "@/lib/canvas/template-filler";
import { DashboardHeader } from "@/components/dashboard/header";
import { ProjectCard } from "@/components/dashboard/project-card";
import { TemplateGallery } from "@/components/dashboard/template-gallery";
import { GeneratorDialog } from "@/components/generator/generator-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Plus,
  LayoutGrid,
  List,
  Clock,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
  X,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

const PROJECT_VIEW_KEY = "slidefarm-project-view";

export default function DashboardPage() {
  const router = useRouter();
  const {
    projects,
    loaded,
    load,
    delete: deleteProject,
    duplicate,
    storageError,
    rename: renameProject,
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveToFolder,
    deleteMany,
    duplicateMany,
    moveManyToFolder,
  } = useProjectStore();
  const loadProject = useEditorStore((s) => s.loadProject);
  const customTemplates = useCustomTemplateStore((s) => s.templates);
  const loadCustomTemplates = useCustomTemplateStore((s) => s.load);
  const templateStorageError = useCustomTemplateStore((s) => s.storageError);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [remixProject, setRemixProject] = useState<Project | null>(null);
  const [remixingSource, setRemixingSource] = useState<Project | null>(null);
  const remixingRef = useRef(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState("all");
  const [projectView, setProjectView] = useState<"card" | "list">("card");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderIdToEdit, setFolderIdToEdit] = useState<string | null>(null);
  const [folderError, setFolderError] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<ProjectFolder | null>(
    null,
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCustomTemplates();
  }, [loadCustomTemplates]);

  useEffect(() => {
    const stored = localStorage.getItem(PROJECT_VIEW_KEY);
    if (stored === "list" || stored === "card") setProjectView(stored);
  }, []);

  const changeProjectView = (view: "card" | "list") => {
    setProjectView(view);
    localStorage.setItem(PROJECT_VIEW_KEY, view);
  };

  const sortedProjects = [...projects].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  const visibleProjects = sortedProjects.filter((project) => {
    if (selectedFolderId === "all") return true;
    if (selectedFolderId === "unfiled") return !project.folderId;
    return project.folderId === selectedFolderId;
  });
  const toggleProjectSelected = (id: string) => {
    setSelectedProjectIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };
  const selectedFolder = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const remixingVisible = Boolean(
    remixingSource &&
    (selectedFolderId === "all" ||
      (selectedFolderId === "unfiled"
        ? !remixingSource.folderId
        : remixingSource.folderId === selectedFolderId)),
  );

  const openFolderDialog = (folder?: ProjectFolder) => {
    setFolderIdToEdit(folder?.id ?? null);
    setFolderName(folder?.name ?? "");
    setFolderError("");
    setFolderDialogOpen(true);
  };

  const handleSaveFolder = () => {
    const trimmedName = folderName.trim();
    if (!trimmedName) return;
    const duplicateName = folders.some(
      (folder) =>
        folder.id !== folderIdToEdit &&
        folder.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicateName) {
      setFolderError("A folder with this name already exists.");
      return;
    }
    if (folderIdToEdit) {
      renameFolder(folderIdToEdit, trimmedName);
    } else {
      const folder = createFolder(trimmedName);
      if (folder) setSelectedFolderId(folder.id);
    }
    setFolderDialogOpen(false);
  };

  const handleOpenProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      loadProject(project);
      router.push(`/editor/${projectId}`);
    }
  };

  const handleCreateBlank = async () => {
    const project = createBlankProject("Untitled Project");
    if (!(await useProjectStore.getState().save(project))) return;
    loadProject(project);
    router.push(`/editor/${project.id}`);
  };

  const handleDelete = (projectId: string) => {
    deleteProject(projectId);
  };

  const handleDuplicate = (projectId: string) => {
    duplicate(projectId);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        isDark={theme === "dark"}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {storageError && (
          <div
            className="mb-6 rounded-md border border-destructive p-3 text-sm text-destructive"
            role="alert"
          >
            {storageError}
          </div>
        )}
        {templateStorageError && (
          <div className="mb-6 rounded-md border border-destructive p-3 text-sm text-destructive" role="alert">
            {templateStorageError}
          </div>
        )}
        {/* Hero section */}
        <div className="mb-10 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 border border-border">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Create Tiktok slideshows with AI
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Generate complete slideshows from a single prompt, then
                customize every detail in the visual editor.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                onClick={() => setGeneratorOpen(true)}
                className="gap-2 text-base"
              >
                <Sparkles className="h-5 w-5" />
                Generate with AI
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleCreateBlank}
                className="gap-2 text-base"
              >
                <Plus className="h-5 w-5" />
                Blank Project
              </Button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Generate with AI",
              icon: Sparkles,
              action: () => setGeneratorOpen(true),
            },
            { label: "Blank Project", icon: Plus, action: handleCreateBlank },
            {
              label: "Browse Templates",
              icon: LayoutGrid,
              action: () => setTemplatesOpen(true),
            },
            {
              label: "Toggle Theme",
              icon: theme === "dark" ? Sun : Moon,
              action: () => setTheme(theme === "dark" ? "light" : "dark"),
            },
          ].map(({ label, icon: Icon, action }) => (
            <Card
              key={label}
              className="cursor-pointer p-4 transition-all hover:border-primary/50 hover:shadow-md"
              onClick={action}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="projects" className="gap-2">
              <Clock className="h-4 w-4" />
              Recent Projects
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            {selectedProjectIds.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3" role="toolbar" aria-label="Selected project actions">
                <span className="mr-2 text-sm font-medium">{selectedProjectIds.length} selected</span>
                <Button size="sm" variant="outline" onClick={() => setSelectedProjectIds(visibleProjects.map((project) => project.id))}>
                  Select all visible
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  duplicateMany(selectedProjectIds);
                  setSelectedProjectIds([]);
                }} className="gap-1.5">
                  <Copy className="h-4 w-4" /> Duplicate
                </Button>
                <Select onValueChange={(value) => {
                  moveManyToFolder(selectedProjectIds, value === "unfiled" ? null : value);
                  setSelectedProjectIds([]);
                }}>
                  <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Move to folder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unfiled">Unfiled</SelectItem>
                    {folders.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDelete(true)} className="gap-1.5">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedProjectIds([])} className="ml-auto gap-1.5">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>
            )}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Select
                value={selectedFolderId}
                onValueChange={setSelectedFolderId}
              >
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
                onClick={() => openFolderDialog()}
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
                    onClick={() => openFolderDialog(selectedFolder)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete folder"
                    aria-label={`Delete ${selectedFolder.name}`}
                    onClick={() => setFolderToDelete(selectedFolder)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <ToggleGroup
                type="single"
                value={projectView}
                onValueChange={(value) => {
                  if (value === "card" || value === "list") changeProjectView(value);
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
            ) : sortedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No projects yet</h3>
                  <p className="text-muted-foreground mt-1">
                    Generate your first slideshow with AI or start from a
                    template.
                  </p>
                </div>
                <Button
                  onClick={() => setGeneratorOpen(true)}
                  className="gap-2 mt-2"
                >
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
                    onToggleSelected={() => toggleProjectSelected(project.id)}
                    onOpen={() => handleOpenProject(project.id)}
                    onDelete={() => handleDelete(project.id)}
                    onDuplicate={() => handleDuplicate(project.id)}
                    onRemix={() => {
                      if (remixingRef.current) return;
                      setRemixProject(project);
                      setGeneratorOpen(true);
                    }}
                    onRename={(name) => renameProject(project.id, name)}
                    folders={folders}
                    onMoveToFolder={(folderId) =>
                      moveToFolder(project.id, folderId)
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates">
            <TemplateGallery
              customTemplates={customTemplates}
              onUseTemplate={async (template) => {
                const project = fillTemplateFromData(template, {}, template.name);
                if (!(await useProjectStore.getState().save(project))) return;
                loadProject(project);
                router.push(`/editor/${project.id}`);
              }}
              onFillTemplate={async (template, data) => {
                const project = fillTemplateFromData(
                  template,
                  data,
                  template.name,
                );
                if (!(await useProjectStore.getState().save(project))) return;
                loadProject(project);
                router.push(`/editor/${project.id}`);
              }}
              onEditTemplate={(template) => {
                loadProject(projectFromTemplate(template));
                router.push(
                  `/editor/${template.id}?editTemplate=${encodeURIComponent(template.id)}`,
                );
              }}
              onDeleteTemplate={(template) => useCustomTemplateStore.getState().delete(template.id)}
            />
          </TabsContent>
        </Tabs>
      </main>

      <GeneratorDialog
        open={generatorOpen}
        remixProject={remixProject}
        onRemixPendingChange={(pending) => {
          remixingRef.current = pending;
          setRemixingSource(pending ? remixProject : null);
        }}
        onOpenChange={(open) => {
          setGeneratorOpen(open);
          if (!open && !remixingRef.current) setRemixProject(null);
        }}
      />
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {folderIdToEdit ? "Rename folder" : "Create folder"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(event) => {
                setFolderName(event.target.value);
                setFolderError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSaveFolder();
              }}
              autoFocus
            />
            {folderError && (
              <p className="text-sm text-destructive" role="alert">
                {folderError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>
              {folderIdToEdit ? "Save folder" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProjectIds.length} projects?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the selected projects.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={() => {
                deleteMany(selectedProjectIds);
                setSelectedProjectIds([]);
              }}>Delete projects</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {folderToDelete?.name} will be deleted. Projects in it will be
              moved to Unfiled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => {
                  if (folderToDelete) deleteFolder(folderToDelete.id);
                  setSelectedFolderId("all");
                  setFolderToDelete(null);
                }}
              >
                Delete folder
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

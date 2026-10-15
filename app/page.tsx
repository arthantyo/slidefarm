"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectFolder } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import { useCustomTemplateStore } from "@/stores/custom-template-store";
import { createBlankProject } from "@/lib/canvas/templates";
import {
  fillTemplateFromData,
  projectFromTemplate,
} from "@/lib/canvas/template-filler";
import { DashboardShell } from "@/components/dashboard/shell";
import { DashboardOverview } from "@/components/dashboard/overview";
import { ProjectSection } from "@/components/dashboard/project-section";
import { ManagementDialogs } from "@/components/dashboard/management-dialogs";
import { TemplateGallery } from "@/components/dashboard/template-gallery";
import { GeneratorDialog } from "@/components/generator/generator-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, LayoutGrid } from "lucide-react";

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
    setPosted,
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveToFolder,
    deleteMany,
    duplicateMany,
    moveManyToFolder,
  } = useProjectStore();
  const loadProject = useEditorStore((state) => state.loadProject);
  const customTemplates = useCustomTemplateStore((state) => state.templates);
  const loadCustomTemplates = useCustomTemplateStore((state) => state.load);
  const templateStorageError = useCustomTemplateStore(
    (state) => state.storageError,
  );
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [remixProject, setRemixProject] = useState<Project | null>(null);
  const [remixingSource, setRemixingSource] = useState<Project | null>(null);
  const [remixJobError, setRemixJobError] = useState('');
  const remixingRef = useRef(false);
  const [activeTab, setActiveTab] = useState("projects");
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
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadCustomTemplates();
  }, [loadCustomTemplates]);

  useEffect(() => {
    if (!loaded) return;
    let active = true;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const response = await fetch('/api/remix-jobs', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load remix jobs.');
        const { jobs } = await response.json() as { jobs: { id: string; sourceProjectId: string; status: string; project?: Project; error?: string }[] };
        if (!active) return;
        for (const job of jobs) {
          if (job.status === 'ready' && job.project) {
            if (!await useProjectStore.getState().save(job.project)) throw new Error('Could not save the completed remix.');
            const complete = await fetch('/api/remix-jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id }) });
            if (!complete.ok) throw new Error('Could not complete the remix job.');
          } else if (job.status === 'failed') {
            setRemixJobError(job.error || 'Remix failed.');
            await fetch('/api/remix-jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id }) });
          }
        }
        const pending = jobs.find((job) => job.status === 'queued' || job.status === 'running');
        remixingRef.current = Boolean(pending);
        setRemixingSource(pending ? useProjectStore.getState().get(pending.sourceProjectId) ?? null : null);
      } catch (error) {
        if (active) setRemixJobError(error instanceof Error ? error.message : 'Could not load remix jobs.');
      } finally { polling = false; }
    };
    void poll();
    const interval = setInterval(() => void poll(), 2000);
    return () => { active = false; clearInterval(interval); };
  }, [loaded]);

  useEffect(() => {
    const stored = localStorage.getItem(PROJECT_VIEW_KEY);
    if (stored === "list" || stored === "card") setProjectView(stored);
  }, []);

  const changeProjectView = (view: "card" | "list") => {
    setProjectView(view);
    localStorage.setItem(PROJECT_VIEW_KEY, view);
  };

  const sortedProjects = [...projects].sort(
    (first, second) => second.updatedAt - first.updatedAt,
  );
  const visibleProjects = sortedProjects.filter((project) => {
    if (selectedFolderId === "all") return true;
    if (selectedFolderId === "unfiled") return !project.folderId;
    return project.folderId === selectedFolderId;
  });
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
    const project = projects.find((item) => item.id === projectId);
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
  const toggleProjectSelected = (id: string) => {
    setSelectedProjectIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };
  const openRemix = (project: Project) => {
    if (remixingRef.current) return;
    setRemixProject(project);
    setGeneratorOpen(true);
  };
  const openTemplate = async (
    template: Parameters<typeof fillTemplateFromData>[0],
  ) => {
    const project = fillTemplateFromData(template, {}, template.name);
    if (!(await useProjectStore.getState().save(project))) return;
    loadProject(project);
    router.push(`/editor/${project.id}`);
  };

  return (
    <div className="h-screen overflow-hidden bg-background">
      <DashboardShell>
      <main className="mx-auto max-w-7xl px-6 py-8">
        {storageError && (
          <div
            className="mb-6 rounded-md border border-destructive p-3 text-sm text-destructive"
            role="alert"
          >
            {storageError}
          </div>
        )}
        {remixJobError && <div className="mb-6 rounded-md border border-destructive p-3 text-sm text-destructive" role="alert">{remixJobError}</div>}
        {templateStorageError && (
          <div
            className="mb-6 rounded-md border border-destructive p-3 text-sm text-destructive"
            role="alert"
          >
            {templateStorageError}
          </div>
        )}
        <DashboardOverview
          onManageAccounts={() => router.push("/accounts")}
          onGenerate={() => setGeneratorOpen(true)}
          onCreateBlank={handleCreateBlank}
          onBrowseTemplates={() => setActiveTab("templates")}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="projects" className="gap-2">
              <Clock className="h-4 w-4" /> Recent Projects
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <LayoutGrid className="h-4 w-4" /> Templates
            </TabsTrigger>
          </TabsList>
          <TabsContent value="projects">
            <ProjectSection
              projects={sortedProjects}
              visibleProjects={visibleProjects}
              loaded={loaded}
              folders={folders}
              selectedFolderId={selectedFolderId}
              selectedFolder={selectedFolder}
              projectView={projectView}
              selectedProjectIds={selectedProjectIds}
              remixingSource={remixingSource}
              remixingVisible={remixingVisible}
              onFolderChange={setSelectedFolderId}
              onProjectViewChange={changeProjectView}
              onOpenFolderDialog={openFolderDialog}
              onDeleteFolderRequest={setFolderToDelete}
              onToggleSelected={toggleProjectSelected}
              onSelectAll={() =>
                setSelectedProjectIds(
                  visibleProjects.map((project) => project.id),
                )
              }
              onDuplicateSelected={() => {
                duplicateMany(selectedProjectIds);
                setSelectedProjectIds([]);
              }}
              onMoveSelected={(folderId) => {
                moveManyToFolder(selectedProjectIds, folderId);
                setSelectedProjectIds([]);
              }}
              onDeleteSelected={() => setConfirmBulkDelete(true)}
              onClearSelection={() => setSelectedProjectIds([])}
              onOpenProject={handleOpenProject}
              onDeleteProject={(id) =>
                setProjectToDelete(
                  projects.find((project) => project.id === id) ?? null,
                )
              }
              onDuplicateProject={duplicate}
              onRemixProject={openRemix}
              onRenameProject={renameProject}
              onMoveProject={moveToFolder}
              onSetPosted={setPosted}
              onGenerate={() => setGeneratorOpen(true)}
            />
          </TabsContent>
          <TabsContent value="templates">
            <TemplateGallery
              customTemplates={customTemplates}
              onUseTemplate={openTemplate}
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
              onDeleteTemplate={(template) =>
                useCustomTemplateStore.getState().delete(template.id)
              }
            />
          </TabsContent>
        </Tabs>
      </main>
      </DashboardShell>

      <GeneratorDialog
        open={generatorOpen}
        remixProject={remixProject}
        onRemixPendingChange={(pending) => {
          remixingRef.current = pending;
          if (pending) setRemixJobError('');
          setRemixingSource(pending ? remixProject : null);
        }}
        onOpenChange={(open) => {
          setGeneratorOpen(open);
          if (!open && !remixingRef.current) setRemixProject(null);
        }}
      />
      <ManagementDialogs
        folderDialogOpen={folderDialogOpen}
        onFolderDialogOpenChange={setFolderDialogOpen}
        folderIdToEdit={folderIdToEdit}
        folderName={folderName}
        onFolderNameChange={(name) => {
          setFolderName(name);
          setFolderError("");
        }}
        folderError={folderError}
        onSaveFolder={handleSaveFolder}
        confirmBulkDelete={confirmBulkDelete}
        onBulkDeleteOpenChange={setConfirmBulkDelete}
        selectedProjectCount={selectedProjectIds.length}
        onDeleteProjects={() => {
          deleteMany(selectedProjectIds);
          setSelectedProjectIds([]);
        }}
        projectToDelete={projectToDelete}
        onProjectToDeleteChange={setProjectToDelete}
        onDeleteProject={(project) => {
          deleteProject(project.id);
          setSelectedProjectIds((ids) => ids.filter((id) => id !== project.id));
          setProjectToDelete(null);
        }}
        folderToDelete={folderToDelete}
        onFolderToDeleteChange={setFolderToDelete}
        onDeleteFolder={(folder) => {
          deleteFolder(folder.id);
          setSelectedFolderId("all");
          setFolderToDelete(null);
        }}
      />
    </div>
  );
}

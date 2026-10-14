import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Project, ProjectFolder } from "@/types";

const LEGACY_PROJECTS_KEY = "slide-studio-projects";
const LEGACY_FOLDERS_KEY = "slide-studio-folders";

interface ProjectStoreState {
  projects: Project[];
  folders: ProjectFolder[];
  loaded: boolean;
  storageError: string | null;

  load: () => Promise<void>;
  save: (project: Project) => Promise<boolean>;
  delete: (projectId: string) => void;
  deleteMany: (projectIds: string[]) => void;
  duplicate: (projectId: string) => Project | null;
  duplicateMany: (projectIds: string[]) => void;
  get: (projectId: string) => Project | undefined;
  rename: (projectId: string, name: string) => void;
  setPosted: (projectId: string, posted: boolean) => void;
  moveToFolder: (projectId: string, folderId: string | null) => void;
  moveManyToFolder: (projectIds: string[], folderId: string | null) => void;
  createFolder: (name: string) => ProjectFolder | null;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
}

function readLegacy<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

let loadPromise: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let saveVersion = 0;

function writeLocal(projects: Project[], folders: ProjectFolder[], setError: (error: string | null) => void) {
  const version = ++saveVersion;
  const pending = writeQueue.then(async () => {
    const response = await fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects, folders }),
    });
    if (!response.ok) throw new Error('Could not save projects to the local data file.');
  });
  writeQueue = pending.catch(() => {});
  return pending.then(
    () => { if (version === saveVersion) setError(null); return true; },
    () => { if (version === saveVersion) setError('Could not save projects to the local data file.'); return false; },
  );
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  folders: [],
  loaded: false,
  storageError: null,

  load: () => {
    if (get().loaded) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      try {
        const response = await fetch('/api/projects', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not read the local project file.');
        const data = await response.json() as { exists: boolean; projects: Project[]; folders: ProjectFolder[] };
        if (data.exists) {
          set({ projects: data.projects, folders: data.folders, loaded: true, storageError: null });
          return;
        }
        const projects = readLegacy<Project>(LEGACY_PROJECTS_KEY);
        const folders = readLegacy<ProjectFolder>(LEGACY_FOLDERS_KEY);
        set({ projects, folders, loaded: true });
        const migrated = await writeLocal(projects, folders, (storageError) => set({ storageError }));
        if (migrated) {
          localStorage.removeItem(LEGACY_PROJECTS_KEY);
          localStorage.removeItem(LEGACY_FOLDERS_KEY);
        }
      } catch {
        set({ loaded: true, storageError: 'Could not load projects from the local data file.' });
      } finally {
        loadPromise = null;
      }
    })();
    return loadPromise;
  },

  save: async (project) => {
    if (!get().loaded) await get().load();
    if (get().storageError === 'Could not load projects from the local data file.') return false;
    const { projects } = get();
    const idx = projects.findIndex((p) => p.id === project.id);
    let updated: Project[];
    if (idx >= 0) {
      updated = [...projects];
      updated[idx] = { ...project, updatedAt: Date.now() };
    } else {
      updated = [...projects, project];
    }

    set({ projects: updated });
    return writeLocal(updated, get().folders, (storageError) => set({ storageError }));
  },

  delete: (projectId) => {
    const { projects } = get();
    const updated = projects.filter((p) => p.id !== projectId);
    set({ projects: updated });
    void writeLocal(updated, get().folders, (storageError) => set({ storageError }));
  },

  deleteMany: (projectIds) => {
    const selected = new Set(projectIds);
    const updated = get().projects.filter((project) => !selected.has(project.id));
    set({ projects: updated });
    void writeLocal(updated, get().folders, (storageError) => set({ storageError }));
  },

  duplicate: (projectId) => {
    const { projects } = get();
    const original = projects.find((p) => p.id === projectId);
    if (!original) return null;
    const cloned: Project = {
      ...JSON.parse(JSON.stringify(original)),
      id: nanoid(10),
      name: `${original.name} (copy)`,
      posted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...projects, cloned];
    set({ projects: updated });
    void writeLocal(updated, get().folders, (storageError) => set({ storageError }));
    return cloned;
  },

  duplicateMany: (projectIds) => {
    const selected = new Set(projectIds);
    const copies = get().projects.filter((project) => selected.has(project.id)).map((project) => ({
      ...JSON.parse(JSON.stringify(project)) as Project,
      id: nanoid(10),
      name: `${project.name} (copy)`,
      posted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    if (!copies.length) return;
    const updated = [...get().projects, ...copies];
    set({ projects: updated });
    void writeLocal(updated, get().folders, (storageError) => set({ storageError }));
  },

  get: (projectId) => {
    return get().projects.find((p) => p.id === projectId);
  },

  rename: (projectId, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const { projects } = get();
    const updated = projects.map((p) =>
      p.id === projectId
        ? { ...p, name: trimmedName, updatedAt: Date.now() }
        : p,
    );
    set({ projects: updated });
    void writeLocal(updated, get().folders, (storageError) => set({ storageError }));
  },

  setPosted: (projectId, posted) => {
    const { projects, folders } = get();
    if (!projects.some((project) => project.id === projectId)) return;
    const updated = projects.map((project) => project.id === projectId
      ? { ...project, posted, updatedAt: Date.now() }
      : project);
    set({ projects: updated });
    void writeLocal(updated, folders, (storageError) => set({ storageError }));
  },

  moveToFolder: (projectId, folderId) => {
    const { projects, folders } = get();
    if (folderId && !folders.some((folder) => folder.id === folderId)) return;
    const updated = projects.map((project) =>
      project.id === projectId
        ? { ...project, folderId, updatedAt: Date.now() }
        : project,
    );
    set({ projects: updated });
    void writeLocal(updated, get().folders, (storageError) => set({ storageError }));
  },

  moveManyToFolder: (projectIds, folderId) => {
    const { projects, folders } = get();
    if (folderId && !folders.some((folder) => folder.id === folderId)) return;
    const selected = new Set(projectIds);
    const updated = projects.map((project) => selected.has(project.id)
      ? { ...project, folderId, updatedAt: Date.now() }
      : project);
    set({ projects: updated });
    void writeLocal(updated, folders, (storageError) => set({ storageError }));
  },

  createFolder: (name) => {
    const trimmedName = name.trim();
    const { folders } = get();
    if (
      !trimmedName ||
      folders.some(
        (folder) => folder.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      return null;
    }
    const folder: ProjectFolder = {
      id: nanoid(10),
      name: trimmedName,
      createdAt: Date.now(),
    };
    const updated = [...folders, folder];
    set({ folders: updated });
    void writeLocal(get().projects, updated, (storageError) => set({ storageError }));
    return folder;
  },

  renameFolder: (folderId, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const { folders } = get();
    if (
      folders.some(
        (folder) =>
          folder.id !== folderId &&
          folder.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      return;
    }
    const updated = folders.map((folder) =>
      folder.id === folderId ? { ...folder, name: trimmedName } : folder,
    );
    set({ folders: updated });
    void writeLocal(get().projects, updated, (storageError) => set({ storageError }));
  },

  deleteFolder: (folderId) => {
    const { folders, projects } = get();
    const updatedFolders = folders.filter((folder) => folder.id !== folderId);
    const updatedProjects = projects.map((project) =>
      project.folderId === folderId
        ? { ...project, folderId: null, updatedAt: Date.now() }
        : project,
    );
    set({ folders: updatedFolders, projects: updatedProjects });
    void writeLocal(updatedProjects, updatedFolders, (storageError) => set({ storageError }));
  },
}));

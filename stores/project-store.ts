import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Project } from '@/types';

const STORAGE_KEY = 'slide-studio-projects';

interface ProjectStoreState {
  projects: Project[];
  loaded: boolean;

  load: () => void;
  save: (project: Project) => void;
  delete: (projectId: string) => void;
  duplicate: (projectId: string) => Project | null;
  get: (projectId: string) => Project | undefined;
  rename: (projectId: string, name: string) => void;
}

function loadFromStorage(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveToStorage(projects: Project[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // storage full — silently ignore
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  loaded: false,

  load: () => {
    if (get().loaded) return;
    set({ projects: loadFromStorage(), loaded: true });
  },

  save: (project) => {
    const { projects } = get();
    const idx = projects.findIndex((p) => p.id === project.id);
    let updated: Project[];
    if (idx >= 0) {
      updated = [...projects];
      updated[idx] = { ...project, updatedAt: Date.now() };
    } else {
      updated = [...projects, project];
    }

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveToStorage(updated);
    }, 500);

    set({ projects: updated });
  },

  delete: (projectId) => {
    const { projects } = get();
    const updated = projects.filter((p) => p.id !== projectId);
    saveToStorage(updated);
    set({ projects: updated });
  },

  duplicate: (projectId) => {
    const { projects } = get();
    const original = projects.find((p) => p.id === projectId);
    if (!original) return null;
    const cloned: Project = {
      ...JSON.parse(JSON.stringify(original)),
      id: nanoid(10),
      name: `${original.name} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...projects, cloned];
    saveToStorage(updated);
    set({ projects: updated });
    return cloned;
  },

  get: (projectId) => {
    return get().projects.find((p) => p.id === projectId);
  },

  rename: (projectId, name) => {
    const { projects } = get();
    const updated = projects.map((p) =>
      p.id === projectId ? { ...p, name, updatedAt: Date.now() } : p,
    );
    saveToStorage(updated);
    set({ projects: updated });
  },
}));

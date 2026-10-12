import { create } from 'zustand';
import type { CustomTemplate } from '@/types';

const STORAGE_KEY = 'slidefarm-custom-templates';

interface CustomTemplateStore {
  templates: CustomTemplate[];
  loaded: boolean;

  load: () => void;
  save: (template: CustomTemplate) => void;
  delete: (templateId: string) => void;
  get: (templateId: string) => CustomTemplate | undefined;
}

function loadFromStorage(): CustomTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CustomTemplate[];
  } catch {
    return [];
  }
}

function persist(templates: CustomTemplate[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // storage full — silently ignore
  }
}

export const useCustomTemplateStore = create<CustomTemplateStore>((set, get) => ({
  templates: [],
  loaded: false,

  load: () => {
    if (get().loaded) return;
    set({ templates: loadFromStorage(), loaded: true });
  },

  save: (template) => {
    const { templates } = get();
    const idx = templates.findIndex((t) => t.id === template.id);
    let updated: CustomTemplate[];
    if (idx >= 0) {
      updated = [...templates];
      updated[idx] = template;
    } else {
      updated = [...templates, template];
    }
    persist(updated);
    set({ templates: updated });
  },

  delete: (templateId) => {
    const updated = get().templates.filter((t) => t.id !== templateId);
    persist(updated);
    set({ templates: updated });
  },

  get: (templateId) => get().templates.find((t) => t.id === templateId),
}));

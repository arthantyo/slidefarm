import { create } from 'zustand';
import type { CustomTemplate } from '@/types';

const LEGACY_STORAGE_KEY = 'slidefarm-custom-templates';

interface CustomTemplateStore {
  templates: CustomTemplate[];
  loaded: boolean;
  storageError: string | null;

  load: () => Promise<void>;
  save: (template: CustomTemplate) => Promise<boolean>;
  delete: (templateId: string) => Promise<boolean>;
  get: (templateId: string) => CustomTemplate | undefined;
}

function readLegacyTemplates(): CustomTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CustomTemplate[];
  } catch {
    return [];
  }
}

function clearLegacyTemplates() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // The file write already succeeded; browser storage cleanup is optional.
  }
}

async function writeTemplates(templates: CustomTemplate[]): Promise<void> {
  const response = await fetch('/api/templates', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(templates),
  });
  if (!response.ok) throw new Error('Could not save templates to the local data file.');
}

let loadPromise: Promise<void> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

export const useCustomTemplateStore = create<CustomTemplateStore>((set, get) => ({
  templates: [],
  loaded: false,
  storageError: null,

  load: () => {
    if (get().loaded && !get().storageError) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      try {
        const response = await fetch('/api/templates', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load templates from the local data file.');
        const data = await response.json() as { exists: boolean; templates: CustomTemplate[] };
        if (data.exists) {
          const legacy = readLegacyTemplates();
          const missing = legacy.filter((item) => !data.templates.some((saved) => saved.id === item.id));
          const templates = missing.length ? [...data.templates, ...missing] : data.templates;
          if (missing.length) {
            try {
              await writeTemplates(templates);
            } catch {
              set({ templates, loaded: true, storageError: 'Could not migrate browser templates to the local data file.' });
              return;
            }
          }
          if (legacy.length) clearLegacyTemplates();
          set({ templates, loaded: true, storageError: null });
          return;
        }
        const templates = readLegacyTemplates();
        await writeTemplates(templates);
        clearLegacyTemplates();
        set({ templates, loaded: true, storageError: null });
      } catch {
        set({
          templates: readLegacyTemplates(),
          loaded: true,
          storageError: 'Could not load or migrate templates from the local data file.',
        });
      } finally {
        loadPromise = null;
      }
    })();
    return loadPromise;
  },

  save: async (template) => {
    if (!get().loaded || get().storageError) await get().load();
    if (get().storageError) return false;
    const operation = writeQueue.then(async () => {
      const templates = get().templates;
      const index = templates.findIndex((item) => item.id === template.id);
      const updated = [...templates];
      if (index >= 0) updated[index] = template;
      else updated.push(template);
      await writeTemplates(updated);
      set({ templates: updated, storageError: null });
      clearLegacyTemplates();
      return true;
    }).catch(() => {
      set({ storageError: 'Could not save templates to the local data file.' });
      return false;
    });
    writeQueue = operation;
    return operation;
  },

  delete: async (templateId) => {
    if (!get().loaded || get().storageError) await get().load();
    if (get().storageError) return false;
    const operation = writeQueue.then(async () => {
      const updated = get().templates.filter((item) => item.id !== templateId);
      await writeTemplates(updated);
      set({ templates: updated, storageError: null });
      clearLegacyTemplates();
      return true;
    }).catch(() => {
      set({ storageError: 'Could not delete template from the local data file.' });
      return false;
    });
    writeQueue = operation;
    return operation;
  },

  get: (templateId) => get().templates.find((t) => t.id === templateId),
}));

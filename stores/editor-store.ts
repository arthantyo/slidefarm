import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { moveElementLayer, type LayerMove } from '@/lib/canvas/layers';
import type {
  Project, Slide, CanvasElement, Theme, TextElement, ImageElement,
  ShapeElement, BackgroundElement, ProjectDimensions,
} from '@/types';

interface HistoryState {
  past: { slides: Slide[]; theme: Theme }[];
  future: { slides: Slide[]; theme: Theme }[];
}

interface EditorState {
  project: Project | null;
  currentSlideId: string | null;
  selectedElementIds: string[];
  clipboard: CanvasElement[] | null;
  zoom: number;
  isGenerating: boolean;
  generationProgress: { stage: string; current: number; total: number } | null;
  history: HistoryState;
  isDirty: boolean;

  // Project
  loadProject: (project: Project) => void;
  updateProjectName: (name: string) => void;
  updateDimensions: (dimensions: ProjectDimensions) => void;
  updateTheme: (theme: Partial<Theme>) => void;
  setGenerating: (generating: boolean) => void;
  setGenerationProgress: (progress: { stage: string; current: number; total: number } | null) => void;

  // Slides
  addSlide: (slide?: Slide) => void;
  duplicateSlide: (slideId: string) => void;
  deleteSlide: (slideId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  setCurrentSlide: (slideId: string) => void;
  updateSlide: (slideId: string, updater: (slide: Slide) => Slide) => void;

  // Elements
  addElement: (element: CanvasElement) => void;
  updateElement: (elementId: string, updates: Partial<CanvasElement>) => void;
  updateElementQuiet: (elementId: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  selectElement: (elementId: string | null) => void;
  selectMultiple: (elementIds: string[]) => void;
  toggleElementLock: (elementId: string) => void;
  toggleElementVisibility: (elementId: string) => void;
  bringForward: (elementId: string) => void;
  sendBackward: (elementId: string) => void;
  bringToFront: (elementId: string) => void;
  sendToBack: (elementId: string) => void;

  // Clipboard
  copySelected: () => void;
  paste: () => void;

  // Undo/Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Zoom & Viewport
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  resetView: () => void;
  activeTool: 'select' | 'hand';
  setActiveTool: (tool: 'select' | 'hand') => void;

  // Dirty
  markClean: () => void;
}

function snapshot(state: { project: Project | null; currentSlideId: string | null }): HistoryState | null {
  if (!state.project) return null;
  return {
    past: [],
    future: [],
  };
}

function cloneSlides(slides: Slide[]): Slide[] {
  return JSON.parse(JSON.stringify(slides));
}

function cloneTheme(theme: Theme): Theme {
  return JSON.parse(JSON.stringify(theme));
}

function reorderLayer(get: () => EditorState, elementId: string, move: LayerMove) {
  const { project, currentSlideId } = get();
  const slide = project?.slides.find((item) => item.id === currentSlideId);
  if (!slide) return;
  const elements = moveElementLayer(slide.elements, elementId, move);
  if (elements === slide.elements) return;
  get().pushHistory();
  get().updateSlide(slide.id, (current) => ({ ...current, elements }));
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  currentSlideId: null,
  selectedElementIds: [],
  clipboard: null,
  zoom: 0.5,
  pan: { x: 0, y: 0 },
  activeTool: 'select',
  isGenerating: false,
  generationProgress: null,
  history: { past: [], future: [] },
  isDirty: false,

  loadProject: (project) => set({
    project,
    currentSlideId: project.slides[0]?.id ?? null,
    selectedElementIds: [],
    history: { past: [], future: [] },
    isDirty: false,
    zoom: 0.5,
    pan: { x: 0, y: 0 },
    activeTool: 'select',
  }),

  updateProjectName: (name) => set((s) => ({
    project: s.project ? { ...s.project, name, updatedAt: Date.now() } : null,
    isDirty: true,
  })),

  updateDimensions: (dimensions) => set((s) => {
    if (!s.project) return {};
    const updatedSlides = s.project.slides.map((slide) => ({
      ...slide,
      elements: slide.elements.map((el) =>
        el.type === 'background'
          ? { ...el, width: dimensions.width, height: dimensions.height }
          : el,
      ),
    }));
    return {
      project: {
        ...s.project,
        dimensions,
        slides: updatedSlides,
        updatedAt: Date.now(),
      },
      isDirty: true,
    };
  }),

  updateTheme: (theme) => set((s) => ({
    project: s.project
      ? { ...s.project, theme: { ...s.project.theme, ...theme }, updatedAt: Date.now() }
      : null,
    isDirty: true,
  })),

  setGenerating: (generating) => set({ isGenerating: generating }),
  setGenerationProgress: (progress) => set({ generationProgress: progress }),

  // ─── Slides ────────────────────────────────────────────────────────────────

  addSlide: (slide) => {
    const { project } = get();
    if (!project) return;
    get().pushHistory();
    const newSlide: Slide = slide ?? {
      id: nanoid(10),
      type: 'text-focused',
      name: `Slide ${project.slides.length + 1}`,
      elements: [
        {
          id: 'background',
          type: 'background',
          fillType: 'solid',
          fill: project.theme.background,
          x: 0, y: 0,
          width: project.dimensions.width,
          height: project.dimensions.height,
          rotation: 0, opacity: 1, locked: true, visible: true, name: 'Background',
        } as BackgroundElement,
      ],
    };
    set((s) => ({
      project: s.project
        ? { ...s.project, slides: [...s.project.slides, newSlide], updatedAt: Date.now() }
        : null,
      currentSlideId: newSlide.id,
      selectedElementIds: [],
      isDirty: true,
    }));
  },

  duplicateSlide: (slideId) => {
    const { project } = get();
    if (!project) return;
    const slide = project.slides.find((s) => s.id === slideId);
    if (!slide) return;
    get().pushHistory();
    const cloned: Slide = {
      ...JSON.parse(JSON.stringify(slide)),
      id: nanoid(10),
      name: `${slide.name} copy`,
    };
    cloned.elements.forEach((el) => {
      if (el.type !== 'background') el.id = nanoid(10);
    });
    const index = project.slides.findIndex((s) => s.id === slideId);
    const newSlides = [...project.slides];
    newSlides.splice(index + 1, 0, cloned);
    set((s) => ({
      project: s.project ? { ...s.project, slides: newSlides, updatedAt: Date.now() } : null,
      currentSlideId: cloned.id,
      selectedElementIds: [],
      isDirty: true,
    }));
  },

  deleteSlide: (slideId) => {
    const { project } = get();
    if (!project || project.slides.length <= 1) return;
    get().pushHistory();
    const newSlides = project.slides.filter((s) => s.id !== slideId);
    const newCurrent = get().currentSlideId === slideId ? newSlides[0]?.id ?? null : get().currentSlideId;
    set((s) => ({
      project: s.project ? { ...s.project, slides: newSlides, updatedAt: Date.now() } : null,
      currentSlideId: newCurrent,
      selectedElementIds: [],
      isDirty: true,
    }));
  },

  reorderSlides: (fromIndex, toIndex) => {
    const { project } = get();
    if (!project || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 ||
        fromIndex >= project.slides.length || toIndex >= project.slides.length) return;
    get().pushHistory();
    const newSlides = [...project.slides];
    const [moved] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, moved);
    set((s) => ({
      project: s.project ? { ...s.project, slides: newSlides, updatedAt: Date.now() } : null,
      isDirty: true,
    }));
  },

  setCurrentSlide: (slideId) => set({ currentSlideId: slideId, selectedElementIds: [] }),

  updateSlide: (slideId, updater) => set((s) => {
    if (!s.project) return {};
    return {
      project: {
        ...s.project,
        slides: s.project.slides.map((slide) =>
          slide.id === slideId ? updater(slide) : slide,
        ),
        updatedAt: Date.now(),
      },
      isDirty: true,
    };
  }),

  // ─── Elements ──────────────────────────────────────────────────────────────

  addElement: (element) => {
    const { currentSlideId } = get();
    if (!currentSlideId) return;
    get().pushHistory();
    get().updateSlide(currentSlideId, (slide) => ({
      ...slide,
      elements: [...slide.elements, element],
    }));
    set({ selectedElementIds: [element.id] });
  },

  updateElement: (elementId, updates) => {
    const { currentSlideId } = get();
    if (!currentSlideId) return;
    get().updateSlide(currentSlideId, (slide) => ({
      ...slide,
      elements: slide.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } as CanvasElement : el,
      ),
    }));
  },

  updateElementQuiet: (elementId, updates) => {
    const { currentSlideId } = get();
    if (!currentSlideId) return;
    get().updateSlide(currentSlideId, (slide) => ({
      ...slide,
      elements: slide.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } as CanvasElement : el,
      ),
    }));
  },

  deleteElement: (elementId) => {
    const { currentSlideId } = get();
    if (!currentSlideId) return;
    get().pushHistory();
    get().updateSlide(currentSlideId, (slide) => ({
      ...slide,
      elements: slide.elements.filter((el) => el.id !== elementId),
    }));
    set((s) => ({ selectedElementIds: s.selectedElementIds.filter((id) => id !== elementId) }));
  },

  duplicateElement: (elementId) => {
    const { currentSlideId, project } = get();
    if (!currentSlideId || !project) return;
    const slide = project.slides.find((s) => s.id === currentSlideId);
    const el = slide?.elements.find((e) => e.id === elementId);
    if (!el) return;
    get().pushHistory();
    const cloned = JSON.parse(JSON.stringify(el)) as CanvasElement;
    cloned.id = nanoid(10);
    cloned.x += 20;
    cloned.y += 20;
    get().updateSlide(currentSlideId, (s) => ({
      ...s,
      elements: [...s.elements, cloned],
    }));
    set({ selectedElementIds: [cloned.id] });
  },

  selectElement: (elementId) => set({ selectedElementIds: elementId ? [elementId] : [] }),

  selectMultiple: (elementIds) => set({ selectedElementIds: elementIds }),

  toggleElementLock: (elementId) => {
    const { currentSlideId } = get();
    if (!currentSlideId) return;
    get().updateSlide(currentSlideId, (slide) => ({
      ...slide,
      elements: slide.elements.map((el) =>
        el.id === elementId ? { ...el, locked: !el.locked } : el,
      ),
    }));
  },

  toggleElementVisibility: (elementId) => {
    const { currentSlideId } = get();
    if (!currentSlideId) return;
    get().updateSlide(currentSlideId, (slide) => ({
      ...slide,
      elements: slide.elements.map((el) =>
        el.id === elementId ? { ...el, visible: !el.visible } : el,
      ),
    }));
  },

  bringForward: (elementId) => reorderLayer(get, elementId, 'forward'),
  sendBackward: (elementId) => reorderLayer(get, elementId, 'backward'),
  bringToFront: (elementId) => reorderLayer(get, elementId, 'front'),
  sendToBack: (elementId) => reorderLayer(get, elementId, 'back'),

  // ─── Clipboard ─────────────────────────────────────────────────────────────

  copySelected: () => {
    const { project, currentSlideId, selectedElementIds } = get();
    if (!project || !currentSlideId) return;
    const slide = project.slides.find((s) => s.id === currentSlideId);
    if (!slide) return;
    const els = slide.elements.filter((el) => selectedElementIds.includes(el.id));
    if (els.length === 0) return;
    set({ clipboard: JSON.parse(JSON.stringify(els)) });
  },

  paste: () => {
    const { clipboard, currentSlideId } = get();
    if (!clipboard || !currentSlideId) return;
    get().pushHistory();
    const newIds: string[] = [];
    const cloned = clipboard.map((el) => {
      const cloned = JSON.parse(JSON.stringify(el)) as CanvasElement;
      cloned.id = nanoid(10);
      cloned.x += 30;
      cloned.y += 30;
      newIds.push(cloned.id);
      return cloned;
    });
    cloned.forEach((el) => {
      get().updateSlide(currentSlideId, (slide) => ({
        ...slide,
        elements: [...slide.elements, el],
      }));
    });
    set({ selectedElementIds: newIds });
  },

  // ─── Undo/Redo ─────────────────────────────────────────────────────────────

  pushHistory: () => {
    const { project, history } = get();
    if (!project) return;
    const snapshot = {
      slides: cloneSlides(project.slides),
      theme: cloneTheme(project.theme),
    };
    set({
      history: {
        past: [...history.past, snapshot].slice(-50),
        future: [],
      },
    });
  },

  undo: () => {
    const { project, history } = get();
    if (!project || history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const current = {
      slides: cloneSlides(project.slides),
      theme: cloneTheme(project.theme),
    };
    set((s) => ({
      project: s.project ? {
        ...s.project,
        slides: previous.slides,
        theme: previous.theme,
        updatedAt: Date.now(),
      } : null,
      history: {
        past: history.past.slice(0, -1),
        future: [...history.future, current].slice(-50),
      },
      selectedElementIds: [],
      isDirty: true,
    }));
  },

  redo: () => {
    const { project, history } = get();
    if (!project || history.future.length === 0) return;
    const next = history.future[history.future.length - 1];
    const current = {
      slides: cloneSlides(project.slides),
      theme: cloneTheme(project.theme),
    };
    set((s) => ({
      project: s.project ? {
        ...s.project,
        slides: next.slides,
        theme: next.theme,
        updatedAt: Date.now(),
      } : null,
      history: {
        past: [...history.past, current].slice(-50),
        future: history.future.slice(0, -1),
      },
      selectedElementIds: [],
      isDirty: true,
    }));
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  setZoom: (zoom) => set({ zoom: Math.max(0.05, Math.min(3, zoom)) }),

  setPan: (pan) => set((s) => ({
    pan: typeof pan === 'function' ? pan(s.pan) : pan,
  })),

  resetView: () => set({ pan: { x: 0, y: 0 }, zoom: 0.5 }),

  setActiveTool: (activeTool) => set({ activeTool }),

  markClean: () => set({ isDirty: false }),
}));

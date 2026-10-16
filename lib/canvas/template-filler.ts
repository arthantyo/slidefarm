import { nanoid } from 'nanoid';
import type { Project, Slide, CanvasElement, CustomTemplate, Template } from '@/types';
import type { LibraryImage } from '@/lib/server/image-library';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Placeholder values are shared strings or per-occurrence arrays of strings. */
export type TemplateData = Record<string, string | string[]>;

export async function loadTemplateCollectionImages(template: Template | Project): Promise<LibraryImage[]> {
  if (!template.slides.some((slide) => slide.elements.some((element) => element.type === 'background' && element.fillType === 'image' && element.imageCollectionId))) return [];
  const response = await fetch('/api/image-library', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load template image collections.');
  const library = await response.json() as { images?: LibraryImage[] };
  if (!Array.isArray(library.images)) throw new Error('Could not load template image collections.');
  return library.images;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Walk all slides and collect every unique text or image placeholder key */
export function extractPlaceholderKeys(slides: Slide[]): string[] {
  const keys = new Set<string>();
  for (const slide of slides) {
    for (const el of slide.elements) {
      if ((el.type === 'text' || el.type === 'image') && el.placeholder) {
        keys.add(el.placeholder);
      }
    }
  }
  return Array.from(keys).sort();
}

/** Replace placeholder content in a single element */
function fillElement(
  el: CanvasElement,
  data: TemplateData,
  occurrenceIndex: number,
): CanvasElement {
  if (el.type === 'text' && el.placeholder && el.placeholder in data) {
    const value = data[el.placeholder];
    const text = Array.isArray(value) ? value[occurrenceIndex] : value;
    return text === undefined ? el : { ...el, text };
  }
  if (el.type === 'image' && el.placeholder && el.placeholder in data) {
    const value = data[el.placeholder];
    const src = Array.isArray(value) ? value[occurrenceIndex] : value;
    return src === undefined ? el : { ...el, src };
  }
  return el;
}

/** Deep-clone slides and apply data substitutions */
function fillSlides(slides: Slide[], data: TemplateData, collectionImages: LibraryImage[] = []): Slide[] {
  const occurrenceCounts = new Map<string, number>();
  return slides.map((slide) => ({
    ...slide,
    id: nanoid(10),
    elements: slide.elements.map((el) => {
      const cloned = el.type === 'background' ? { ...el } : { ...el, id: nanoid(10) };
      if (cloned.type === 'background' && cloned.fillType === 'image' && cloned.imageCollectionId) {
        const candidates = collectionImages.filter((image) => image.folderId === cloned.imageCollectionId);
        if (!candidates.length) throw new Error(`The image collection for slide "${slide.name}" is empty or unavailable.`);
        cloned.imageSrc = candidates[Math.floor(Math.random() * candidates.length)].src;
      }
      if ((el.type !== 'text' && el.type !== 'image') || !el.placeholder || !Array.isArray(data[el.placeholder])) {
        return fillElement(cloned, data, 0);
      }
      const key = el.placeholder;
      const occurrenceIndex = occurrenceCounts.get(key) ?? 0;
      occurrenceCounts.set(key, occurrenceIndex + 1);
      return fillElement(cloned, data, occurrenceIndex);
    }),
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Editor document for a template. Keeps the template id and slide content, and is not stored as a project. */
export function projectFromTemplate(template: CustomTemplate): Project {
  return {
    id: template.id,
    name: template.name,
    dimensions: template.dimensions,
    slides: JSON.parse(JSON.stringify(template.slides)) as Slide[],
    theme: template.theme,
    createdAt: template.createdAt,
    updatedAt: Date.now(),
    thumbnail: template.thumbnail ?? null,
  };
}

/**
 * Create a new Project from a CustomTemplate (or any project acting as a template)
 * by substituting text and image placeholder values from `data`.
 */
export function fillTemplateFromData(
  template: Template | Project,
  data: TemplateData,
  projectName?: string,
  collectionImages: LibraryImage[] = [],
): Project {
  const slides = fillSlides(template.slides, data, collectionImages);
  return {
    id: nanoid(10),
    name: projectName ?? template.name,
    dimensions: template.dimensions,
    slides,
    theme: template.theme,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnail: null,
  };
}

/**
 * Build a CustomTemplate from the current project.
 * Scans all slides for placeholder fields and records them.
 */
export function projectToCustomTemplate(
  project: Project,
  name: string,
  description: string,
  category: string,
): CustomTemplate {
  const placeholderKeys = extractPlaceholderKeys(project.slides);
  return {
    id: nanoid(10),
    name,
    description,
    category,
    isCustom: true,
    placeholderKeys,
    dimensions: project.dimensions,
    theme: project.theme,
    slides: JSON.parse(JSON.stringify(project.slides)) as Slide[],
    thumbnail: project.thumbnail ?? null,
    createdAt: Date.now(),
  };
}

export function updateCustomTemplateFromProject(
  project: Project,
  existing: CustomTemplate,
): CustomTemplate {
  return {
    ...projectToCustomTemplate(project, project.name, existing.description, existing.category),
    id: existing.id,
    createdAt: existing.createdAt,
  };
}

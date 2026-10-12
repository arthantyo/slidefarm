import { nanoid } from 'nanoid';
import type { Project, Slide, CanvasElement, CustomTemplate, Template } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Placeholder values are shared strings or per-occurrence arrays of strings. */
export type TemplateData = Record<string, string | string[]>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Walk all slides and collect every unique text placeholder key */
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

/** Replace placeholder text in a single element */
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
  // image placeholders are intentionally left unchanged — user fills manually
  return el;
}

/** Deep-clone slides and apply data substitutions */
function fillSlides(slides: Slide[], data: TemplateData): Slide[] {
  const occurrenceCounts = new Map<string, number>();
  return slides.map((slide) => ({
    ...slide,
    id: nanoid(10),
    elements: slide.elements.map((el) => {
      const cloned = el.type === 'background' ? { ...el } : { ...el, id: nanoid(10) };
      if (el.type !== 'text' || !el.placeholder || !Array.isArray(data[el.placeholder])) {
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

/**
 * Create a new Project from a CustomTemplate (or any project acting as a template)
 * by substituting placeholder text values from `data`.
 *
 * Image elements with a `placeholder` key are left as-is so the user can
 * replace them manually in the editor.
 */
export function fillTemplateFromData(
  template: Template | Project,
  data: TemplateData,
  projectName?: string,
): Project {
  const slides = fillSlides(template.slides, data);
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
    ...projectToCustomTemplate(project, existing.name, existing.description, existing.category),
    id: existing.id,
    createdAt: existing.createdAt,
  };
}

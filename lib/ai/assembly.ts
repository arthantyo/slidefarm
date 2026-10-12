import { nanoid } from 'nanoid';
import type { AIPlan, Project, Slide, Theme, CanvasElement, BackgroundElement, TextElement } from '@/types';
import { DEFAULT_THEMES } from '@/lib/canvas/themes';
import { buildSlideFromPlan } from '@/lib/canvas/templates';
import type { RemixResult } from './remix-types';

export function isRemixableTextElement(element: TextElement): boolean {
  const name = element.name.toLowerCase();
  return !/^(num text|number|quote mark|page number|logo|brand)/.test(name) &&
    !/^[\d\s\p{P}\p{S}]+$/u.test(element.text);
}

/** Apply copy by text box position while preserving every source slide element. */
export function assembleRemixedProject(remix: RemixResult, source: Project): Project {
  if (remix.slides.length !== source.slides.length) {
    throw new Error('Remix slide count does not match the original project');
  }
  const slides = source.slides.map((slide, index) => {
    const textBoxes = slide.elements.filter(
      (element): element is TextElement => element.type === 'text' && isRemixableTextElement(element),
    );
    const replacements = remix.slides[index].texts;
    if (replacements.length !== textBoxes.length) {
      throw new Error(`Remix text count does not match slide ${index + 1}`);
    }
    let textIndex = 0;

    return {
      ...slide,
      id: nanoid(10),
      elements: slide.elements.map((element) => {
        const id = nanoid(10);
        if (element.type !== 'text' || !isRemixableTextElement(element)) return { ...element, id };
        return { ...element, id, text: replacements[textIndex++] };
      }),
    };
  });

  return {
    ...source,
    id: nanoid(10),
    name: `${remix.title} (Remix)`,
    slides,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnail: null,
  };
}

export function assembleProject(
  plan: AIPlan,
  width: number,
  height: number,
  baseThemeKey?: string,
): Project {
  const baseTheme = DEFAULT_THEMES[baseThemeKey ?? 'modern-editorial'] ?? DEFAULT_THEMES['modern-editorial'];

  // Merge suggested theme with base theme
  const theme: Theme = {
    primary: plan.suggestedTheme.primary ?? baseTheme.primary,
    secondary: plan.suggestedTheme.secondary ?? baseTheme.secondary,
    accent: plan.suggestedTheme.accent ?? baseTheme.accent,
    background: plan.suggestedTheme.background ?? baseTheme.background,
    text: plan.suggestedTheme.text ?? baseTheme.text,
    textMuted: plan.suggestedTheme.textMuted ?? baseTheme.textMuted,
    fontHeading: plan.suggestedTheme.fontHeading ?? baseTheme.fontHeading,
    fontBody: plan.suggestedTheme.fontBody ?? baseTheme.fontBody,
  };

  const slides: Slide[] = plan.slides.map((planned) => {
    const slide = buildSlideFromPlan(
      planned.type,
      width,
      height,
      theme,
      {
        headline: planned.headline,
        bodyText: planned.bodyText,
        listItems: planned.listItems,
        supportingText: planned.supportingText,
      },
    );
    return {
      ...slide,
      notes: planned.purpose,
    };
  });

  return {
    id: nanoid(10),
    name: plan.title,
    dimensions: {
      width,
      height,
      aspectRatio: width === height ? '1:1' : width > height ? '16:9' : width / height === 1080 / 1350 ? '4:5' : '9:16',
    },
    slides,
    theme,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnail: null,
  };
}

import { nanoid } from 'nanoid';
import type { AIPlan, Project, Slide, Theme, CanvasElement, BackgroundElement } from '@/types';
import { DEFAULT_THEMES } from '@/lib/canvas/themes';
import { buildSlideFromPlan } from '@/lib/canvas/templates';

/** Apply new copy to the existing slide elements so a remix keeps its design. */
export function assembleRemixedProject(plan: AIPlan, source: Project): Project {
  const slides = source.slides.map((slide, index) => {
    const planned = plan.slides[index];
    const itemTexts = planned?.listItems ?? [];
    let unnamedTextIndex = 0;

    return {
      ...slide,
      id: nanoid(10),
      notes: planned?.purpose ?? slide.notes,
      elements: slide.elements.map((element) => {
        const id = nanoid(10);
        if (element.type !== 'text' || !planned) return { ...element, id };

        const name = element.name.toLowerCase();
        if (/^(num text|number|quote mark|page number|logo|brand)/.test(name)) {
          return { ...element, id };
        }

        let text: string | undefined;
        const itemMatch = name.match(/^item\s+(\d+)$/);
        if (itemMatch) text = itemTexts[Number(itemMatch[1]) - 1] ?? '';
        else if (/^(title|headline|quote)$/.test(name)) text = planned.headline;
        else if (name === 'author') text = planned.supportingText ?? element.text;
        else if (name === 'subtitle' || name === 'body' || name === 'cta text') {
          text = planned.bodyText;
        } else {
          const copy = [planned.headline, planned.bodyText, planned.supportingText, ...itemTexts]
            .filter((value): value is string => Boolean(value));
          text = copy[unnamedTextIndex++] ?? element.text;
        }
        return { ...element, id, text };
      }),
    };
  });

  return {
    ...source,
    id: nanoid(10),
    name: `${plan.title} (Remix)`,
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

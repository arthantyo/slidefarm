import { nanoid } from 'nanoid';
import type { AIPlan, Project, Slide, Theme, CanvasElement, BackgroundElement } from '@/types';
import { DEFAULT_THEMES } from '@/lib/canvas/themes';
import { buildSlideFromPlan } from '@/lib/canvas/templates';

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

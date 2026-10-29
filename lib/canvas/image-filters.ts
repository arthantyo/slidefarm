import type { ImageElement } from '@/types';

export type ImageFilters = NonNullable<ImageElement['filters']>;

export const DEFAULT_IMAGE_FILTERS: Required<ImageFilters> = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  hueRotate: 0,
  blur: 0,
};

const limits: Record<keyof ImageFilters, [number, number]> = {
  brightness: [0, 200],
  contrast: [0, 200],
  saturate: [0, 200],
  grayscale: [0, 100],
  sepia: [0, 100],
  invert: [0, 100],
  hueRotate: [-180, 180],
  blur: [0, 20],
};

export function getImageFilterValues(filters?: ImageFilters): Required<ImageFilters> {
  const values = { ...DEFAULT_IMAGE_FILTERS };
  for (const key of Object.keys(values) as (keyof ImageFilters)[]) {
    const value = filters?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      values[key] = Math.min(limits[key][1], Math.max(limits[key][0], value));
    }
  }
  return values;
}

export function getImageFilterCss(filters?: ImageFilters): string {
  const v = getImageFilterValues(filters);
  return `brightness(${v.brightness}%) contrast(${v.contrast}%) saturate(${v.saturate}%) grayscale(${v.grayscale}%) sepia(${v.sepia}%) invert(${v.invert}%) hue-rotate(${v.hueRotate}deg) blur(${v.blur}px)`;
}

import type { AspectRatioKey } from '@/types';

export interface CanvasPreset {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  aspectRatio: AspectRatioKey;
  description: string;
}

export const CANVAS_SIZE_PRESETS: CanvasPreset[] = [
  {
    id: 'tiktok',
    name: 'TikTok / Reels',
    category: 'Social Vertical',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    description: '9:16 vertical video & story format',
  },
  {
    id: 'ig-story',
    name: 'Instagram Story',
    category: 'Social Vertical',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    description: '1080 × 1920 full screen vertical',
  },
  {
    id: 'ig-carousel',
    name: 'Instagram Carousel',
    category: 'Social Feed',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    description: '4:5 portrait post for maximum screen area',
  },
  {
    id: 'square-post',
    name: 'Square Post',
    category: 'Social Feed',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    description: '1:1 classic square format',
  },
  {
    id: 'presentation-16-9',
    name: 'Presentation / YouTube',
    category: 'Landscape',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    description: '16:9 widescreen slides and thumbnails',
  },
  {
    id: 'standard-4-3',
    name: 'Standard Slides (4:3)',
    category: 'Landscape',
    width: 1440,
    height: 1080,
    aspectRatio: 'custom',
    description: 'Classic 4:3 presentation slides',
  },
];

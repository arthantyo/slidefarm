import type { SlideType, Tone, ContentDensity } from '@/types';

export interface RemixSource {
  name: string;
  slides: {
    type: SlideType;
    notes?: string;
    texts: {
      name: string;
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize: number;
      placeholder?: string;
    }[];
    visuals: { name: string; kind: string; description?: string }[];
  }[];
}

export interface RemixRequest {
  source: RemixSource;
  instruction: string;
  tone: Tone;
  density: ContentDensity;
  language: string;
  customInstructions?: string;
}

export interface RemixResult {
  title: string;
  understanding: { mainMessage: string; keyPoints: string[] };
  slides: { texts: string[] }[];
}

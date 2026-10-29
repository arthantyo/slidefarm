import { z } from 'zod';

// ─── Element Types ───────────────────────────────────────────────────────────

export type ElementType = 'text' | 'image' | 'shape' | 'background';

export type ShapeKind = 'rect' | 'ellipse' | 'triangle' | 'line' | 'star' | 'polygon';

export type FontStyle = 'normal' | 'bold' | 'italic' | 'bold-italic';

export type TextAlign = 'left' | 'center' | 'right';

export type VerticalAlign = 'top' | 'middle' | 'bottom';

// ─── Base Element ────────────────────────────────────────────────────────────

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name: string;
}

// ─── Text Element ────────────────────────────────────────────────────────────

export interface TextElement extends BaseElement {
  type: 'text';
  /** Template placeholder key — if set, JSON fill will replace `text` with data[placeholder] */
  placeholder?: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: FontStyle;
  /** Numeric weight; older slides use fontStyle's normal/bold value. */
  fontWeight?: number;
  textDecoration: 'none' | 'underline' | 'line-through';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  align: TextAlign;
  verticalAlign: VerticalAlign;
  lineHeight: number;
  letterSpacing: number;
  wrap: 'word' | 'none';
  padding: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
  } | null;
}

// ─── Image Element ───────────────────────────────────────────────────────────

export interface ImageElement extends BaseElement {
  type: 'image';
  /** Template placeholder key; JSON values are image sources, while AI mode uses image subjects. */
  placeholder?: string;
  /** Base prompt prepended to the workflow-provided subject. */
  aiPlaceholderPrompt?: string;
  /** Whether AI workflows append this placeholder's value to the base prompt. */
  usePlaceholderAsSubject?: boolean;
  src: string;
  imagePrompt?: string;
  objectFit: 'cover' | 'contain' | 'fill';
  cornerRadius: number;
  /** Optional CSS/canvas image adjustments. Missing values use the unfiltered image. */
  filters?: {
    brightness?: number;
    contrast?: number;
    saturate?: number;
    grayscale?: number;
    sepia?: number;
    invert?: number;
    hueRotate?: number;
    blur?: number;
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
  } | null;
}

// ─── Shape Element ───────────────────────────────────────────────────────────

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  points?: number[];
  sides?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
  } | null;
}

// ─── Background Element ──────────────────────────────────────────────────────

export interface BackgroundElement extends BaseElement {
  type: 'background';
  fillType: 'solid' | 'gradient' | 'image';
  fill: string;
  gradientColor2?: string;
  gradientAngle?: number;
  /** Fixed image for this slide; replaced at generation time when imageCollectionId is set. */
  imageSrc?: string;
  imageCollectionId?: string;
}

// ─── Discriminated Union ─────────────────────────────────────────────────────

export type CanvasElement = TextElement | ImageElement | ShapeElement | BackgroundElement;

// ─── Slide ───────────────────────────────────────────────────────────────────

export type SlideType =
  | 'cover'
  | 'text-focused'
  | 'image-focused'
  | 'text-and-image'
  | 'quote'
  | 'numbered-list'
  | 'comparison'
  | 'step-by-step'
  | 'timeline'
  | 'statistics'
  | 'call-to-action'
  | 'custom';

export interface Slide {
  id: string;
  type: SlideType;
  name: string;
  elements: CanvasElement[];
  notes?: string;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textMuted: string;
  fontHeading: string;
  fontBody: string;
}

// ─── Brand Kit ───────────────────────────────────────────────────────────────

export interface BrandKit {
  name: string;
  logo?: string | null;
  colors: string[];
  fonts: string[];
  defaultCTA?: string;
  illustrationStyle?: string;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export type AspectRatioKey = '9:16' | '4:5' | '1:1' | '16:9' | 'custom';

export interface ProjectDimensions {
  width: number;
  height: number;
  aspectRatio: AspectRatioKey;
}

export interface Project {
  id: string;
  name: string;
  folderId?: string | null;
  posted?: boolean;
  dimensions: ProjectDimensions;
  slides: Slide[];
  theme: Theme;
  brandKit?: BrandKit | null;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string | null;
}

export interface ProjectFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Workflow {
  id: string;
  name: string;
  nodes?: Array<'source' | 'template' | 'project' | 'export' | 'draft' | 'post' | `export:${string}`>;
  nodePositions?: Partial<Record<'source' | 'template' | 'project' | 'export' | 'draft' | 'post' | `export:${string}`, { x: number; y: number }>>;
  connections?: Array<{ from: 'source' | 'template' | 'project' | 'export' | 'draft' | 'post' | `export:${string}`; to: 'source' | 'template' | 'project' | 'export' | 'draft' | 'post' | `export:${string}` }>;
  exportFormats?: Record<string, 'zip' | 'pdf' | 'png' | 'jpg'>;
  tiktok?: Partial<Record<'draft' | 'post', { openId: string; title: string; description: string; privacyLevel: string; isAigc: boolean; uploadConsent: boolean }>>;
  projectFolderId?: string | null;
  pendingProjectId?: string | null;
  sourceType: 'json' | 'ai';
  sourceJson: string;
  systemPrompt: string;
    model?: string;
  templateId: string;
  exportFormat: 'zip' | 'pdf' | 'png' | 'jpg';
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowMedia {
  id: string;
  workflowId: string;
  workflowName: string;
  projectName: string;
  format: Workflow['exportFormat'];
  createdAt: number;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  dimensions: ProjectDimensions;
  theme: Theme;
  slides: Slide[];
  thumbnail?: string | null;
}

/**
 * A template created by the user from an existing project.
 * Placeholder keys are text element `placeholder` fields found in the slides.
 */
export interface CustomTemplate extends Template {
  isCustom: true;
  /** All placeholder keys extracted from slides — used to build the fill-form */
  placeholderKeys: string[];
  createdAt: number;
}

// ─── Platform Presets ────────────────────────────────────────────────────────

export interface PlatformPreset {
  key: string;
  label: string;
  aspectRatio: AspectRatioKey;
  width: number;
  height: number;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { key: 'tiktok', label: 'TikTok / Reels', aspectRatio: '9:16', width: 1080, height: 1920 },
  { key: 'instagram-story', label: 'Instagram Story', aspectRatio: '9:16', width: 1080, height: 1920 },
  { key: 'instagram-post', label: 'Instagram Post', aspectRatio: '1:1', width: 1080, height: 1080 },
  { key: 'instagram-carousel', label: 'Instagram Carousel', aspectRatio: '4:5', width: 1080, height: 1350 },
  { key: 'linkedin', label: 'LinkedIn', aspectRatio: '1:1', width: 1080, height: 1080 },
  { key: 'youtube-thumbnail', label: 'YouTube Thumbnail', aspectRatio: '16:9', width: 1920, height: 1080 },
  { key: 'presentation', label: 'Presentation', aspectRatio: '16:9', width: 1920, height: 1080 },
  { key: 'custom', label: 'Custom', aspectRatio: 'custom', width: 1080, height: 1080 },
];

// ─── AI Generation Types ─────────────────────────────────────────────────────

export type Tone = 'educational' | 'casual' | 'professional' | 'persuasive' | 'inspirational';
export type ContentDensity = 'concise' | 'balanced' | 'detailed';
export type VisualStyle =
  | 'minimalist-vector'
  | 'monochrome-silhouette'
  | 'flat-illustration'
  | 'editorial-illustration'
  | 'photorealistic'
  | '3d'
  | 'watercolor'
  | 'cartoon'
  | 'abstract'
  | 'custom';

export interface GenerationOptions {
  prompt: string;
    model?: string;
  slideCount?: number | 'auto';
  platform?: string;
  aspectRatio?: AspectRatioKey;
  tone?: Tone;
  contentDensity?: ContentDensity;
  language?: string;
  visualStyle?: VisualStyle;
  customInstructions?: string;
}

export interface AIPlannedSlide {
  type: SlideType;
  purpose: string;
  headline: string;
  bodyText: string;
  supportingText?: string;
  listItems?: string[];
  visualSuggestion?: string;
  imagePrompt?: string;
  citation?: string;
}

export interface AIPlan {
  title: string;
  slides: AIPlannedSlide[];
  suggestedTheme: Partial<Theme>;
}

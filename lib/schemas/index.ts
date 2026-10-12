import { z } from 'zod';

// ─── Element Schemas ─────────────────────────────────────────────────────────

export const fontStyleSchema = z.enum(['normal', 'bold', 'italic', 'bold-italic']);
export const textAlignSchema = z.enum(['left', 'center', 'right']);
export const verticalAlignSchema = z.enum(['top', 'middle', 'bottom']);
export const shapeKindSchema = z.enum([
  'rect', 'ellipse', 'triangle', 'line', 'star', 'polygon',
]);
export const elementTypeSchema = z.enum(['text', 'image', 'shape', 'background']);

const shadowSchema = z.object({
  color: z.string(),
  blur: z.number(),
  offsetX: z.number(),
  offsetY: z.number(),
  opacity: z.number(),
}).nullable().optional();

const baseElementFields = {
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  locked: z.boolean(),
  visible: z.boolean(),
  name: z.string(),
};

export const textElementSchema = z.object({
  ...baseElementFields,
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number(),
  fontFamily: z.string(),
  fontStyle: fontStyleSchema,
  textDecoration: z.enum(['none', 'underline', 'line-through']),
  fill: z.string(),
  align: textAlignSchema,
  verticalAlign: verticalAlignSchema,
  lineHeight: z.number(),
  letterSpacing: z.number(),
  wrap: z.enum(['word', 'none']),
  padding: z.number(),
  shadow: shadowSchema,
});

export const imageElementSchema = z.object({
  ...baseElementFields,
  type: z.literal('image'),
  src: z.string(),
  imagePrompt: z.string().optional(),
  objectFit: z.enum(['cover', 'contain', 'fill']),
  cornerRadius: z.number(),
  shadow: shadowSchema,
});

export const shapeElementSchema = z.object({
  ...baseElementFields,
  type: z.literal('shape'),
  shape: shapeKindSchema,
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number(),
  cornerRadius: z.number(),
  points: z.array(z.number()).optional(),
  sides: z.number().optional(),
  shadow: shadowSchema,
});

export const backgroundElementSchema = z.object({
  ...baseElementFields,
  type: z.literal('background'),
  fillType: z.enum(['solid', 'gradient']),
  fill: z.string(),
  gradientColor2: z.string().optional(),
  gradientAngle: z.number().optional(),
});

export const canvasElementSchema = z.discriminatedUnion('type', [
  textElementSchema,
  imageElementSchema,
  shapeElementSchema,
  backgroundElementSchema,
]);

// ─── Slide Schema ────────────────────────────────────────────────────────────

export const slideTypeSchema = z.enum([
  'cover', 'text-focused', 'image-focused', 'text-and-image',
  'quote', 'numbered-list', 'comparison', 'step-by-step',
  'timeline', 'statistics', 'call-to-action', 'custom',
]);

export const slideSchema = z.object({
  id: z.string(),
  type: slideTypeSchema,
  name: z.string(),
  elements: z.array(canvasElementSchema),
  notes: z.string().optional(),
});

// ─── Project Schema ──────────────────────────────────────────────────────────

export const themeSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  text: z.string(),
  textMuted: z.string(),
  fontHeading: z.string(),
  fontBody: z.string(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    aspectRatio: z.enum(['9:16', '4:5', '1:1', '16:9', 'custom']),
  }),
  slides: z.array(slideSchema),
  theme: themeSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  thumbnail: z.string().nullable().optional(),
});

// ─── AI Plan Schema ──────────────────────────────────────────────────────────

export const aiPlannedSlideSchema = z.object({
  type: slideTypeSchema,
  purpose: z.string(),
  headline: z.string(),
  bodyText: z.string(),
  supportingText: z.string().optional(),
  listItems: z.array(z.string()).optional(),
  visualSuggestion: z.string().optional(),
  imagePrompt: z.string().optional(),
  citation: z.string().optional(),
});

export const aiPlanSchema = z.object({
  title: z.string(),
  slides: z.array(aiPlannedSlideSchema),
  suggestedTheme: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    text: z.string().optional(),
    textMuted: z.string().optional(),
    fontHeading: z.string().optional(),
    fontBody: z.string().optional(),
  }).partial(),
});

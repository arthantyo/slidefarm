import type { GenerationOptions, AIPlan, AIPlannedSlide, SlideType, Tone, VisualStyle } from '@/types';
import { aiPlanSchema } from '@/lib/schemas';
import { DEFAULT_THEMES } from '@/lib/canvas/themes';
import { trackedOpenAiFetch } from '@/lib/server/ai-usage';

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface AIProvider {
  name: string;
  generatePlan: (options: GenerationOptions) => Promise<AIPlan>;
  rewriteText: (text: string, instruction: string) => Promise<string>;
  generateImagePrompt: (description: string, style: VisualStyle) => Promise<string>;
}

// ─── OpenAI Provider ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert content designer for social media slideshows.
Generate structured, engaging slide content based on the user's prompt.

Rules:
- Create compelling, concise content optimized for visual slides
- Do NOT fabricate quotes, statistics, or citations
- Keep headlines short and punchy (max 60 characters)
- Keep body text concise (max 200 characters per slide)
- For list slides, provide 3-7 items
- Always end with a call-to-action slide
- Vary slide types for visual interest
- Include bodyText on every slide; use an empty string when the slide has no body copy
- Respond ONLY with valid JSON matching the specified schema`;

const STYLE_HINTS: Record<VisualStyle, string> = {
  'minimalist-vector': 'clean minimalist vector illustrations',
  'monochrome-silhouette': 'elegant monochrome silhouette art',
  'flat-illustration': 'modern flat illustrations',
  'editorial-illustration': 'sophisticated editorial illustrations',
  'photorealistic': 'photorealistic imagery',
  '3d': '3D rendered visuals',
  'watercolor': 'soft watercolor paintings',
  'cartoon': 'playful cartoon illustrations',
  'abstract': 'abstract geometric art',
  'custom': 'custom visual style',
};

const TONE_HINTS: Record<Tone, string> = {
  educational: 'informative and educational',
  casual: 'casual and conversational',
  professional: 'professional and authoritative',
  persuasive: 'persuasive and compelling',
  inspirational: 'inspirational and motivating',
};

function buildUserPrompt(options: GenerationOptions): string {
  const parts: string[] = [`Topic: ${options.prompt}`];

  if (options.slideCount && options.slideCount !== 'auto') {
    parts.push(`Number of slides: ${options.slideCount}`);
  } else {
    parts.push('Number of slides: choose an appropriate count (5-10)');
  }

  if (options.tone) {
    parts.push(`Tone: ${TONE_HINTS[options.tone]}`);
  }

  if (options.contentDensity) {
    parts.push(`Content density: ${options.contentDensity}`);
  }

  if (options.language) {
    parts.push(`Language: ${options.language}`);
  }

  if (options.visualStyle) {
    parts.push(`Visual style: ${STYLE_HINTS[options.visualStyle]}`);
  }

  if (options.customInstructions) {
    parts.push(`Additional instructions: ${options.customInstructions}`);
  }

  parts.push(`\nRespond with JSON in this exact shape:
{
  "title": "Slideshow title",
  "slides": [
    {
      "type": "cover" | "text-focused" | "image-focused" | "text-and-image" | "quote" | "numbered-list" | "comparison" | "step-by-step" | "timeline" | "statistics" | "call-to-action" | "custom",
      "purpose": "What this slide accomplishes",
      "headline": "Short headline",
      "bodyText": "Body content",
      "supportingText": "Optional supporting text",
      "listItems": ["optional", "array", "of", "items"],
      "visualSuggestion": "What visual to show",
      "imagePrompt": "Prompt for image generation (no text in image)",
      "citation": "Optional source citation"
    }
  ],
  "suggestedTheme": {
    "primary": "#hexcolor",
    "secondary": "#hexcolor",
    "accent": "#hexcolor",
    "background": "#hexcolor",
    "text": "#hexcolor",
    "textMuted": "#hexcolor",
    "fontHeading": "font name",
    "fontBody": "font name"
  }
}`);

  return parts.join('\n');
}

async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: GenerationOptions,
  apiKey = process.env.OPENAI_API_KEY,
  feature = 'Slide generation',
): Promise<string> {
  if (!apiKey) throw new Error('No OPENAI_API_KEY');

  const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const res = await trackedOpenAiFetch(feature, 'text', 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function extractJson(text: string): string {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  // Find the JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return cleaned.substring(start, end + 1);
  }
  return cleaned;
}

// ─── OpenAI Provider Implementation ──────────────────────────────────────────

const createOpenAIProvider = (apiKey?: string): AIProvider => ({
  name: 'openai',

  generatePlan: async (options) => {
    const userPrompt = buildUserPrompt(options);
    const content = await callOpenAI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ], options, apiKey);

    const jsonStr = extractJson(content);
    const parsed = JSON.parse(jsonStr);
    const validated = aiPlanSchema.parse(parsed);
    return validated;
  },

  rewriteText: async (text, instruction) => {
    const content = await callOpenAI([
      { role: 'system', content: 'You are a copy editor. Rewrite the given text according to the instruction. Respond with ONLY the rewritten text, no explanation.' },
      { role: 'user', content: `Instruction: ${instruction}\n\nText: ${text}` },
    ], { prompt: '' }, apiKey, 'Text rewrite');

    return content.trim().replace(/^["']|["']$/g, '');
  },

  generateImagePrompt: async (description, style) => {
    const styleHint = STYLE_HINTS[style] || 'illustration';
    const content = await callOpenAI([
      { role: 'system', content: 'You generate image prompts for AI image generation. The image must NOT contain any text or words. Respond with ONLY the prompt.' },
      { role: 'user', content: `Create an image generation prompt for: ${description}. Style: ${styleHint}. No text in the image.` },
    ], { prompt: '' }, apiKey, 'Image prompt');

    return content.trim();
  },
});

export const openaiProvider = createOpenAIProvider();

// ─── Local/Fallback Provider ─────────────────────────────────────────────────
// Generates structured content without an API call. Good for demos and offline.

function detectTopic(prompt: string): { topic: string; count: number; isList: boolean } {
  const lower = prompt.toLowerCase();

  // Extract number from prompt
  const numMatch = prompt.match(/(\d+)\s*(slides?|tips|ways|benefits|reasons|steps|things|items|points)/i);
  const count = numMatch ? parseInt(numMatch[1], 10) : 0;

  const isList = /tips|ways|benefits|reasons|steps|things|items|points|list|top/i.test(lower);

  // Clean the topic
  let topic = prompt
    .replace(/create|make|generate|build|design|a|an|the\s+/gi, '')
    .replace(/\d+\s*(slides?|tips|ways|benefits|reasons|steps|things|items|points)/gi, '')
    .replace(/slide\s*show|carousel|post|presentation/gi, '')
    .replace(/about|on|for|of|with/gi, ' ')
    .replace(/\b(instagram|tiktok|linkedin|youtube)\b/gi, '')
    .replace(/\b(modern|minimalist|clean|bold|professional|colorful)\b/gi, '')
    .replace(/\b(design|style)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!topic) topic = prompt.trim();

  return { topic, count, isList };
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickTheme(style?: VisualStyle): string {
  if (!style) return 'modern-editorial';
  const map: Record<string, string> = {
    'minimalist-vector': 'minimal-bw',
    'monochrome-silhouette': 'minimal-bw',
    'flat-illustration': 'colorful-educational',
    'editorial-illustration': 'modern-editorial',
    'photorealistic': 'photography-focused',
    '3d': 'bold-typography',
    'watercolor': 'minimalist-illustration',
    'cartoon': 'colorful-educational',
    'abstract': 'bold-typography',
    'custom': 'modern-editorial',
  };
  return map[style] ?? 'modern-editorial';
}

function generateLocalPlan(options: GenerationOptions): AIPlan {
  const { topic, count, isList } = detectTopic(options.prompt);
  const slideCount = count > 0 ? count : isList ? 5 : 6;
  const themeKey = pickTheme(options.visualStyle);
  const theme = DEFAULT_THEMES[themeKey];
  const topicTitle = titleCase(topic);

  const slides: AIPlannedSlide[] = [];

  // Cover slide
  slides.push({
    type: 'cover',
    purpose: 'Grab attention and introduce the topic',
    headline: topicTitle,
    bodyText: `Swipe to learn more →`,
    visualSuggestion: `A bold, eye-catching visual representing ${topic}`,
    imagePrompt: `${topic}, ${options.visualStyle ?? 'flat illustration'} style, no text, clean background`,
  });

  if (isList) {
    // Generate list items
    const itemNames = generateListItems(topic, slideCount);
    slides.push({
      type: 'numbered-list',
      purpose: 'Present the main points',
      headline: `${slideCount} Essential Points`,
      bodyText: '',
      listItems: itemNames,
      visualSuggestion: `Numbered layout with icons`,
    });

    // Add detail slides for each item
    itemNames.slice(0, Math.min(3, itemNames.length)).forEach((item, i) => {
      slides.push({
        type: i === 0 ? 'text-and-image' : 'text-focused',
        purpose: `Detail point ${i + 1}`,
        headline: item,
        bodyText: `${item} is a key aspect of ${topic}. Understanding this helps you gain a deeper appreciation and practical insight.`,
        visualSuggestion: `Visual representing: ${item}`,
        imagePrompt: `${item}, ${options.visualStyle ?? 'flat illustration'} style, no text`,
      });
    });
  } else {
    // Non-list: varied slide types
    slides.push({
      type: 'text-focused',
      purpose: 'Introduce the main concept',
      headline: `What is ${topic}?`,
      bodyText: `${titleCase(topic)} is an important topic that affects many aspects of our lives. Let's explore what makes it valuable.`,
      visualSuggestion: `Conceptual visual about ${topic}`,
    });

    slides.push({
      type: 'text-and-image',
      purpose: 'Explain the importance',
      headline: 'Why It Matters',
      bodyText: `Understanding ${topic} gives you a significant advantage. It opens doors to new opportunities and perspectives.`,
      visualSuggestion: `Image showing growth or opportunity`,
      imagePrompt: `growth and opportunity concept, ${options.visualStyle ?? 'flat illustration'} style, no text`,
    });

    // Add a quote slide
    slides.push({
      type: 'quote',
      purpose: 'Provide inspiration',
      headline: 'Knowledge is power. Understanding is wisdom.',
      bodyText: 'Adapted from general wisdom',
      supportingText: 'Insight comes to those who seek it',
      visualSuggestion: `Minimalist background with quote`,
    });

    // If more slides needed
    if (slideCount > 5) {
      slides.push({
        type: 'step-by-step',
        purpose: 'Actionable steps',
        headline: 'How to Get Started',
        bodyText: '1. Learn the basics\n2. Practice consistently\n3. Apply what you know\n4. Share with others',
        visualSuggestion: `Step-by-step diagram`,
      });
    }
  }

  // Always end with CTA
  slides.push({
    type: 'call-to-action',
    purpose: 'Encourage engagement',
    headline: `Ready to Explore More?`,
    bodyText: 'Follow for more content',
    visualSuggestion: 'Clean CTA with button',
  });

  return {
    title: topicTitle,
    slides,
    suggestedTheme: {
      primary: theme.primary,
      secondary: theme.secondary,
      accent: theme.accent,
      background: theme.background,
      text: theme.text,
      textMuted: theme.textMuted,
      fontHeading: theme.fontHeading,
      fontBody: theme.fontBody,
    },
  };
}

function generateListItems(topic: string, count: number): string[] {
  // Generic but meaningful list items
  const templates = [
    `Start with the fundamentals of ${topic}`,
    `Build a consistent practice around ${topic}`,
    `Learn from experts in ${topic}`,
    `Apply ${topic} in real situations`,
    `Review and refine your approach to ${topic}`,
    `Share your ${topic} journey with others`,
    `Stay updated on ${topic} trends`,
    `Challenge yourself to go deeper`,
    `Connect with a community around ${topic}`,
    `Teach ${topic} to someone else`,
  ];
  return templates.slice(0, Math.min(count, templates.length));
}

export const localProvider: AIProvider = {
  name: 'local',

  generatePlan: async (options) => {
    // Simulate async for consistent UX
    await new Promise((r) => setTimeout(r, 600));
    const plan = generateLocalPlan(options);
    return aiPlanSchema.parse(plan);
  },

  rewriteText: async (text, instruction) => {
    await new Promise((r) => setTimeout(r, 300));
    const lower = instruction.toLowerCase();
    if (lower.includes('shorter') || lower.includes('concise')) {
      const words = text.split(' ');
      return words.slice(0, Math.ceil(words.length * 0.6)).join(' ');
    }
    if (lower.includes('engaging') || lower.includes('punchy')) {
      return text.replace(/\.$/, '!').toUpperCase().split(' ').slice(0, 5).join(' ') + '!';
    }
    if (lower.includes('uppercase') || lower.includes('capital')) {
      return text.toUpperCase();
    }
    if (lower.includes('lowercase')) {
      return text.toLowerCase();
    }
    return text;
  },

  generateImagePrompt: async (description, style) => {
    await new Promise((r) => setTimeout(r, 200));
    return `${description}, ${style}, high quality, no text`;
  },
};

// ─── Provider Selection ──────────────────────────────────────────────────────

export function getProvider(apiKey?: string): AIProvider {
  if (apiKey || process.env.OPENAI_API_KEY) {
    return apiKey ? createOpenAIProvider(apiKey) : openaiProvider;
  }
  return localProvider;
}

export async function generatePlan(options: GenerationOptions, apiKey?: string): Promise<AIPlan> {
  const provider = getProvider(apiKey);
  return provider.generatePlan(options);
}

export async function rewriteText(text: string, instruction: string, apiKey?: string): Promise<string> {
  const provider = getProvider(apiKey);
  return provider.rewriteText(text, instruction);
}

export async function generateImagePrompt(description: string, style: VisualStyle): Promise<string> {
  const provider = getProvider();
  return provider.generateImagePrompt(description, style);
}

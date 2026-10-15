import 'server-only';
import { z } from 'zod';
import type { RemixRequest, RemixResult } from './remix-types';

const remixResultSchema = z.object({
  title: z.string().min(1),
  understanding: z.object({ mainMessage: z.string(), keyPoints: z.array(z.string()) }),
  slides: z.array(z.object({ texts: z.array(z.string()), imagePrompts: z.array(z.string()) })),
});

const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'slide_remix',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'understanding', 'slides'],
      properties: {
        title: { type: 'string' },
        understanding: {
          type: 'object',
          additionalProperties: false,
          required: ['mainMessage', 'keyPoints'],
          properties: {
            mainMessage: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' } },
          },
        },
        slides: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['texts', 'imagePrompts'],
            properties: { texts: { type: 'array', items: { type: 'string' } }, imagePrompts: { type: 'array', items: { type: 'string' } } },
          },
        },
      },
    },
  },
} as const;

function normalizeResult(result: RemixResult, request: RemixRequest): RemixResult | null {
  if (result.slides.length !== request.source.slides.length) return null;
  if (result.slides.some((slide, index) => slide.texts.length < request.source.slides[index].texts.length)) return null;
  return {
    ...result,
    slides: result.slides.map((slide, index) => {
      const source = request.source.slides[index];
      const texts = slide.texts.slice(0, source.texts.length);
      const instruction = request.instruction.toLowerCase();
      const preserveTopImage = /\b(top|uppermost|header)\b/.test(instruction) &&
        /\b(image|picture|photo|logo)\b/.test(instruction) &&
        /\b(keep|preserve|unchanged|shouldn'?t|shouldnt|don'?t|dont|do not|leave)\b/.test(instruction);
      const topImageIndex = source.images.reduce((top, image, imageIndex) =>
        top < 0 || image.y < source.images[top].y ? imageIndex : top, -1);
      const imagePrompts = source.images.map((image, imageIndex) => {
        if (preserveTopImage && imageIndex === topImageIndex) return '';
        const proposed = slide.imagePrompts[imageIndex]?.trim();
        if (proposed === '') return '';
        if (proposed && proposed.length >= 3) return proposed.slice(0, 1900);
        return `Create an image suited to ${request.instruction}. Slide ${index + 1} says: ${texts.join(' ').slice(0, 600)}. Image role: ${image.name}. ${image.description ?? ''}`.slice(0, 1900);
      });
      return { texts, imagePrompts };
    }),
  };
}

export async function generateRemix(request: RemixRequest, userApiKey?: string): Promise<RemixResult> {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('AI remix requires an OPENAI_API_KEY');

  const source = request.source.slides.map((slide, index) => ({
    slide: index + 1,
    type: slide.type,
    notes: slide.notes,
    visuals: slide.visuals,
    images: slide.images,
    textBoxes: slide.texts.map((item, textIndex) => ({
      box: textIndex + 1,
      role: item.name,
      currentText: item.text,
      targetLength: item.text.length,
      position: { x: item.x, y: item.y, width: item.width, height: item.height },
      fontSize: item.fontSize,
      placeholder: item.placeholder,
    })),
  }));
  const userPrompt = [
    `User's requested change: ${request.instruction}`,
    `Tone: ${request.tone}. Density: ${request.density}. Language: ${request.language}.`,
    request.customInstructions && `User clarification about the source post (prioritize this over inferred meaning): ${request.customInstructions}`,
    `Source slideshow title: ${request.source.name}`,
    `Source slides and text boxes in exact order:\n${JSON.stringify(source)}`,
  ].filter(Boolean).join('\n\n');

  const messages = [
    {
      role: 'system',
      content: `You remix an existing slideshow to satisfy the user's specific change request. The user's instruction controls which images change. For every image, return a detailed generation prompt if it should change, or an empty string if the user asks to keep that image unchanged. Use the supplied image positions to identify references such as "the top image"; do not automatically preserve any image. First identify the source post's main message and key points in the understanding field. Read all slides together before rewriting; infer each text box's role from its content, position, size, slide notes, and nearby visual descriptions. Return one rewritten string for every supplied text box and one image prompt or empty string for every supplied image, in exactly the same slide and element order. New image prompts must depict the remixed topic and fit that slide's new copy, while retaining an appropriate visual style from the source description when available. Do not request text, letters, or watermarks in images. Preserve the slide count, sequence, story arc, and purpose of each box. Make copy concrete and specific; avoid generic filler, invented facts, fabricated quotes, and repeated ideas. Keep each replacement close to the current text's length so it fits the unchanged design. Preserve meaningful claims unless the user explicitly asks to change them. If a box is a label or recurring brand phrase, keep its role. Return a concise title.`,
    },
    { role: 'user', content: userPrompt },
  ];

  let mismatch = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        response_format: responseFormat,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('The AI returned no remix content');
    const parsed = remixResultSchema.safeParse(JSON.parse(content));
    if (parsed.success) {
      const normalized = normalizeResult(parsed.data, request);
      if (normalized) return normalized;
      mismatch = parsed.data.slides.length !== request.source.slides.length
        ? `Expected ${request.source.slides.length} slides; received ${parsed.data.slides.length}.`
        : `Missing text on slide ${parsed.data.slides.findIndex((slide, index) => slide.texts.length < request.source.slides[index].texts.length) + 1}.`;
    } else mismatch = 'The response did not contain the required remix fields.';
    messages.push({
      role: 'user',
      content: `${mismatch} Return exactly ${request.source.slides.length} slides. Required text box counts by slide: ${request.source.slides.map((slide) => slide.texts.length).join(', ')}. Required image prompt counts by slide: ${request.source.slides.map((slide) => slide.images.length).join(', ')}. Include both texts and imagePrompts arrays on every slide, including empty arrays where needed.`,
    });
  }
  throw new Error(`The AI could not match the slideshow layout. ${mismatch}`);
}

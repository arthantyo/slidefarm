import 'server-only';
import { z } from 'zod';
import type { RemixRequest, RemixResult } from './remix-types';

const remixResultSchema = z.object({
  title: z.string().min(1),
  understanding: z.object({ mainMessage: z.string(), keyPoints: z.array(z.string()) }),
  slides: z.array(z.object({ texts: z.array(z.string()) })),
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
            required: ['texts'],
            properties: { texts: { type: 'array', items: { type: 'string' } } },
          },
        },
      },
    },
  },
} as const;

function hasMatchingShape(result: RemixResult, request: RemixRequest): boolean {
  return result.slides.length === request.source.slides.length &&
    result.slides.every((slide, index) =>
      slide.texts.length === request.source.slides[index].texts.length,
    );
}

export async function generateRemix(request: RemixRequest, userApiKey?: string): Promise<RemixResult> {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('AI remix requires an OPENAI_API_KEY');

  const source = request.source.slides.map((slide, index) => ({
    slide: index + 1,
    type: slide.type,
    notes: slide.notes,
    visuals: slide.visuals,
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
      content: `You rewrite an existing slideshow to satisfy the user's specific change request. First identify the source post's main message and key points in the understanding field. Read all slides together before rewriting; infer each text box's role from its content, position, size, slide notes, and nearby visual descriptions. The box name alone may be generic or misleading. Then return one rewritten string for every supplied text box, in exactly the same slide and box order. Preserve the slide count, sequence, story arc, and the purpose of each box. Make the copy concrete and specific to the source and request; avoid generic filler, invented facts, fabricated quotes, and repeated ideas. Keep each replacement close to the current text's length so it fits the unchanged design. Preserve meaningful claims unless the user explicitly asks to change them. If a box is a label or recurring brand phrase, keep its role. Return a concise title for the remixed slideshow.`,
    },
    { role: 'user', content: userPrompt },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
    if (parsed.success && hasMatchingShape(parsed.data, request)) return parsed.data;
    messages.push({
      role: 'user',
      content: `The previous response had the wrong number of slides or text boxes. Return exactly ${request.source.slides.length} slides with these text box counts: ${request.source.slides.map((slide) => slide.texts.length).join(', ')}.`,
    });
  }
  throw new Error('The AI could not match the existing slide text boxes. Please try again.');
}

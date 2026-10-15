import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRemix } from '@/lib/ai/remix';
import { slideTypeSchema } from '@/lib/schemas';

const requestSchema = z.object({
  source: z.object({
    name: z.string().max(200),
    slides: z.array(z.object({
      type: slideTypeSchema,
      notes: z.string().optional(),
      texts: z.array(z.object({
        name: z.string(),
        text: z.string(),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        fontSize: z.number(),
        placeholder: z.string().optional(),
      })),
      visuals: z.array(z.object({
        name: z.string(),
        kind: z.string(),
        description: z.string().optional(),
      })),
    })).min(1).max(30),
  }),
  instruction: z.string().trim().min(3).max(2000),
  tone: z.enum(['educational', 'casual', 'professional', 'persuasive', 'inspirational']),
  density: z.enum(['concise', 'balanced', 'detailed']),
  language: z.string().max(100),
  customInstructions: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid remix request' }, { status: 400 });
    }
    const remix = await generateRemix(parsed.data, req.headers.get('x-openai-api-key') || undefined);
    return NextResponse.json({ remix });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Remix failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

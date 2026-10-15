import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  systemPrompt: z.string().trim().min(3).max(10000),
  source: z.record(z.unknown()),
  placeholderKeys: z.array(z.string().min(1)).min(1).max(100),
  imageSubjectKeys: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  }
  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid agent input' }, { status: 400 });
  const key = req.headers.get('x-openai-api-key') || process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${parsed.data.systemPrompt}\n\nReturn only a JSON object with exactly these template placeholder keys: ${JSON.stringify(parsed.data.placeholderKeys)}. Each value must be a string or an array of strings. Use the source data as input. Do not add other keys. For these AI image placeholder keys, provide only the subject, without a style or image generation instructions: ${JSON.stringify(parsed.data.imageSubjectKeys)}. The template will append that subject to its own base image prompt.` },
          { role: 'user', content: JSON.stringify(parsed.data.source) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI request failed (${response.status})`);
    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = result.choices?.[0]?.message?.content;
    const generated: unknown = content ? JSON.parse(content) : null;
    if (!generated || typeof generated !== 'object' || Array.isArray(generated)) throw new Error('AI returned invalid JSON');
    const values = generated as Record<string, unknown>;
    const data: Record<string, string | string[]> = {};
    for (const key of parsed.data.placeholderKeys) {
      const value = values[key];
      if (typeof value === 'string') data[key] = value;
      else if (Array.isArray(value) && value.every((part) => typeof part === 'string')) data[key] = value;
      else throw new Error(`AI did not provide text for ${key}`);
    }
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI generation failed' }, { status: 500 });
  }
}

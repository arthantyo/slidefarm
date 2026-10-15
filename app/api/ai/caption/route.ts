import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  systemPrompt: z.string().trim().min(3).max(4000),
  additionalInstructions: z.string().max(2000).default(''),
  projectName: z.string().max(200),
  slides: z.array(z.object({
    name: z.string().max(200),
    notes: z.string().max(2000).optional(),
    text: z.array(z.string().max(2000)).max(100),
  })).min(1).max(35),
});

export async function POST(req: NextRequest) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  }
  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a project and enter a system prompt.' }, { status: 400 });
  const apiKey = req.headers.get('x-openai-api-key') || process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 503 });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${parsed.data.systemPrompt}\nReturn a JSON object with one field, "caption", containing a caption of at most 4000 characters. Base it on the supplied slideshow content. Do not invent facts.` },
          { role: 'user', content: JSON.stringify({ projectName: parsed.data.projectName, slides: parsed.data.slides, additionalInstructions: parsed.data.additionalInstructions }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI request failed (${response.status}).`);
    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = result.choices?.[0]?.message?.content;
    const generated: unknown = content ? JSON.parse(content) : null;
    const caption = generated && typeof generated === 'object' && 'caption' in generated ? generated.caption : null;
    if (typeof caption !== 'string' || !caption.trim()) throw new Error('AI returned no caption.');
    return NextResponse.json({ caption: caption.trim().slice(0, 4000) });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Could not generate a caption.' }, { status: 500 });
  }
}

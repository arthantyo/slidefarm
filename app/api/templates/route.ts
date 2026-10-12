import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readTemplateFile, writeTemplateFile } from '@/lib/server/template-files';
import type { CustomTemplate } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  dimensions: z.object({ width: z.number(), height: z.number(), aspectRatio: z.string() }),
  theme: z.object({ primary: z.string(), secondary: z.string(), accent: z.string(), background: z.string(), text: z.string(), textMuted: z.string(), fontHeading: z.string(), fontBody: z.string() }),
  isCustom: z.literal(true),
  placeholderKeys: z.array(z.string()),
  createdAt: z.number(),
  slides: z.array(z.object({ id: z.string(), elements: z.array(z.unknown()) }).passthrough()),
}).passthrough();

function localRequest(req: NextRequest) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);
}

export async function GET(req: NextRequest) {
  if (!localRequest(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    const templates = await readTemplateFile();
    return NextResponse.json({ exists: templates !== null, templates: templates ?? [] });
  } catch {
    return NextResponse.json({ error: 'Could not read local templates' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!localRequest(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    const body: unknown = await req.json();
    const parsed = z.array(templateSchema).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid template data' }, { status: 400 });
    await writeTemplateFile(body as CustomTemplate[]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save local templates' }, { status: 500 });
  }
}

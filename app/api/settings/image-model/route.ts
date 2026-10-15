import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { effectiveImageModel, readImageModelSetting, writeImageModelSetting } from '@/lib/server/image-model-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const local = (req: NextRequest) => ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);
const modelSchema = z.string().trim().max(100).regex(/^[A-Za-z0-9._:/-]*$/);

export async function GET(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try { return NextResponse.json({ model: await readImageModelSetting(), effectiveModel: await effectiveImageModel() }); }
  catch { return NextResponse.json({ error: 'Could not load image model setting.' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const parsed = z.object({ model: modelSchema }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid image model ID.' }, { status: 400 });
  try {
    await writeImageModelSetting(parsed.data.model || null);
    return NextResponse.json({ model: parsed.data.model || null, effectiveModel: await effectiveImageModel() });
  } catch { return NextResponse.json({ error: 'Could not save image model setting.' }, { status: 500 }); }
}

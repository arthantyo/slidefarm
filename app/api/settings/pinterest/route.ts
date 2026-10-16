import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readPinterestSettings, writePinterestSettings } from '@/lib/server/pinterest-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const local = (req: NextRequest) => ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);
const schema = z.object({
  key: z.string().max(500).optional(),
  removeKey: z.boolean().optional(),
  host: z.string().trim().regex(/^[a-z0-9-]+\.p\.rapidapi\.com$/),
  searchPath: z.string().trim().regex(/^\/(?!\/)[a-zA-Z0-9/_-]+$/),
  boardPath: z.string().trim().regex(/^\/(?!\/)[a-zA-Z0-9/_-]+$/),
});

export async function GET(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    const { key, ...settings } = await readPinterestSettings();
    return NextResponse.json({ ...settings, hasKey: Boolean(key) });
  } catch { return NextResponse.json({ error: 'Could not load Pinterest settings.' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid RapidAPI host and endpoint paths.' }, { status: 400 });
  try {
    const previous = await readPinterestSettings();
    const key = parsed.data.removeKey ? '' : parsed.data.key?.trim() || previous.key;
    await writePinterestSettings({ key, host: parsed.data.host, searchPath: parsed.data.searchPath, boardPath: parsed.data.boardPath });
    return NextResponse.json({ host: parsed.data.host, searchPath: parsed.data.searchPath, boardPath: parsed.data.boardPath, hasKey: Boolean(key) });
  } catch { return NextResponse.json({ error: 'Could not save Pinterest settings.' }, { status: 500 }); }
}

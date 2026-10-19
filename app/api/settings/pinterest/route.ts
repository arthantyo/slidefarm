import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readPinterestSettings, writePinterestSettings } from '@/lib/server/pinterest-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const local = (req: NextRequest) => ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);
const schema = z.object({
  token: z.string().max(500).optional(),
  removeToken: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    return NextResponse.json({ hasToken: Boolean((await readPinterestSettings()).token) });
  } catch { return NextResponse.json({ error: 'Could not load Pinterest settings.' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid Apify API token.' }, { status: 400 });
  try {
    const previous = await readPinterestSettings();
    const token = parsed.data.removeToken ? '' : parsed.data.token?.trim() || previous.token;
    await writePinterestSettings({ token });
    return NextResponse.json({ hasToken: Boolean(token) });
  } catch { return NextResponse.json({ error: 'Could not save Pinterest settings.' }, { status: 500 }); }
}

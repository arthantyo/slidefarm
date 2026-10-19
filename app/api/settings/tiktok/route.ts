import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { configured, local } from '@/lib/server/tiktok';
import { readTikTokSettings, writeTikTokSettings } from '@/lib/server/tiktok-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({
  clientKey: z.string().trim().max(500),
  clientSecret: z.string().max(500),
  redirectUri: z.string().trim().max(2048),
});

export async function GET(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  try {
    const { clientSecret, ...settings } = await readTikTokSettings();
    return NextResponse.json({ ...settings, hasSecret: Boolean(clientSecret) });
  } catch { return NextResponse.json({ error: 'Could not load TikTok settings.' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter valid TikTok settings.' }, { status: 400 });
  try {
    const previous = await readTikTokSettings();
    const settings = { clientKey: parsed.data.clientKey, clientSecret: parsed.data.clientSecret.trim() || previous.clientSecret, redirectUri: parsed.data.redirectUri };
    if (!configured(settings)) return NextResponse.json({ error: 'Enter a client key, client secret, and valid callback URI. Use HTTPS, or HTTP with a port for localhost.' }, { status: 400 });
    await writeTikTokSettings(settings);
    return NextResponse.json({ clientKey: settings.clientKey, redirectUri: settings.redirectUri, hasSecret: Boolean(settings.clientSecret) });
  } catch { return NextResponse.json({ error: 'Could not save TikTok settings.' }, { status: 500 }); }
}

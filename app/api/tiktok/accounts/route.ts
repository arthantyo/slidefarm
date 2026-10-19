import { NextRequest, NextResponse } from 'next/server';
import { configured, local, readAccounts, revokeAccount } from '@/lib/server/tiktok';
import { z } from 'zod';
import { readTikTokSettings } from '@/lib/server/tiktok-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  try {
    const accounts = (await readAccounts()).map(({ openId, displayName, avatarUrl, scopes }) => ({ openId, displayName, avatarUrl, scopes }));
    return NextResponse.json({ configured: configured(await readTikTokSettings()), accounts });
  } catch { return NextResponse.json({ error: 'Could not load TikTok accounts.' }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const parsed = z.object({ openId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Select an account.' }, { status: 400 });
  try { await revokeAccount(parsed.data.openId); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not disconnect account.' }, { status: 502 }); }
}

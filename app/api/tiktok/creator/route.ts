import { NextRequest, NextResponse } from 'next/server';
import { accessToken, local } from '@/lib/server/tiktok';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const openId = req.nextUrl.searchParams.get('openId');
  if (!openId) return NextResponse.json({ error: 'Select an account.' }, { status: 400 });
  try {
    const token = await accessToken(openId);
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    });
    const result = await response.json() as { data?: { creator_nickname?: string; creator_username?: string; privacy_level_options?: string[] }; error?: { code?: string; message?: string } };
    if (!response.ok || result.error?.code !== 'ok' || !result.data) throw new Error(result.error?.message || 'Could not load TikTok posting settings.');
    return NextResponse.json({ creator: result.data });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load TikTok posting settings.' }, { status: 502 }); }
}

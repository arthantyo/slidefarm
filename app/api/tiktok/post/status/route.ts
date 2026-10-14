import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { local } from '@/lib/server/tiktok';
import { fetchPhotoPostStatus } from '@/lib/server/tiktok-publish';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const parsed = z.object({ openId: z.string().min(1), publishId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid post status request.' }, { status: 400 });
  try { return NextResponse.json(await fetchPhotoPostStatus(parsed.data.openId, parsed.data.publishId)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load post status.' }, { status: 502 }); }
}

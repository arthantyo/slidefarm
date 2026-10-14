import { NextRequest, NextResponse } from 'next/server';
import { local } from '@/lib/server/tiktok';
import { photoPostSchema, publishPhotoPost } from '@/lib/server/tiktok-publish';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const parsed = photoPostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid photo post.' }, { status: 400 });
  try { return NextResponse.json({ publishId: await publishPhotoPost(parsed.data) }, { status: 202 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not post to TikTok.' }, { status: 502 }); }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { local, readAccounts } from '@/lib/server/tiktok';
import { publishPhotoPost, validatePhotoUrls } from '@/lib/server/tiktok-publish';

export const runtime = 'nodejs';

const draftSchema = z.object({
  openId: z.string().min(1),
  title: z.string().max(90),
  description: z.string().max(4000),
  images: z.array(z.string().url()).min(1).max(35),
  isAigc: z.boolean(),
  uploadConsent: z.literal(true),
});

export async function POST(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const parsed = draftSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Select a project and agree to upload its slides.' }, { status: 400 });
  try {
    const draft = parsed.data;
    const account = (await readAccounts()).find((item) => item.openId === draft.openId);
    if (!account?.scopes.includes('video.upload')) return NextResponse.json({ error: 'Reconnect this TikTok account to grant video.upload access.' }, { status: 403 });
    validatePhotoUrls(draft.images);
    const publishId = await publishPhotoPost({
      ...draft,
      privacyLevel: 'SELF_ONLY', disableComment: true, autoAddMusic: false,
      brandContent: false, brandOrganic: false,
    }, 'MEDIA_UPLOAD');
    return NextResponse.json({ publishId }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not send slides to TikTok.' }, { status: 502 });
  }
}

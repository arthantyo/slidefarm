import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { local } from '@/lib/server/tiktok';
import { uploadTikTokSlide } from '@/lib/server/r2';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const images = form?.getAll('images') ?? [];
  if (!images.length || images.length > 35 || images.some((image) => !(image instanceof File) || image.type !== 'image/png' || image.size > 10 * 1024 * 1024)) return NextResponse.json({ error: 'Upload 1–35 PNG slides, each under 10 MB.' }, { status: 400 });
  try {
    const urls: string[] = [];
    for (const image of images as File[]) {
      const key = `tiktok/slides/${randomUUID()}.png`;
      urls.push(await uploadTikTokSlide(key, Buffer.from(await image.arrayBuffer())));
    }
    return NextResponse.json({ urls });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not upload TikTok slides to R2.' }, { status: 502 }); }
}

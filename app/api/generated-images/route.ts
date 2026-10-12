import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readGeneratedImages, writeGeneratedImages } from '@/lib/server/generated-image-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const imageSchema = z.object({
  src: z.string().startsWith('data:image/'),
  prompt: z.string().trim().min(3).max(2000),
});

function localRequest(req: NextRequest) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);
}

export async function GET(req: NextRequest) {
  if (!localRequest(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    return NextResponse.json({ images: await readGeneratedImages() });
  } catch {
    return NextResponse.json({ error: 'Could not load generated images.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!localRequest(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    const parsed = imageSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid generated image.' }, { status: 400 });
    const images = await readGeneratedImages();
    if (!images.some((image) => image.src === parsed.data.src)) {
      await writeGeneratedImages([parsed.data, ...images]);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save generated image.' }, { status: 500 });
  }
}

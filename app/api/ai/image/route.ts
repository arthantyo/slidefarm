import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { effectiveImageModel } from '@/lib/server/image-model-settings';
import { describeImageStyle } from '@/lib/ai/image-style';

export const runtime = 'nodejs';

const requestSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  width: z.number().positive(),
  height: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const isRemix = req.headers.get('content-type')?.includes('multipart/form-data') ?? false;
  const form = isRemix ? await req.formData().catch(() => null) : null;
  const input = isRemix ? {
    prompt: form?.get('prompt'), width: Number(form?.get('width')), height: Number(form?.get('height')),
  } : await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter an image description of at least 3 characters.' }, { status: 400 });
  }
  const sourceImage = form?.get('image');
  if (isRemix && (!(sourceImage instanceof File) || !sourceImage.type.startsWith('image/'))) {
    return NextResponse.json({ error: 'The original image is required.' }, { status: 400 });
  }

  const apiKey = req.headers.get('x-openai-api-key') || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 503 });
  }

  const { prompt, width, height } = parsed.data;
  const ratio = width / height;
  const size = ratio > 1.2 ? '1536x1024' : ratio < 0.8 ? '1024x1536' : '1024x1024';

  try {
    const style = sourceImage instanceof File
      ? await describeImageStyle(`data:${sourceImage.type};base64,${Buffer.from(await sourceImage.arrayBuffer()).toString('base64')}`, apiKey)
      : '';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: await effectiveImageModel(),
        prompt: style
          ? `Create an image of: ${prompt}\n\nVisual style: ${style}\n\nDepict the requested subject clearly. Use the style description only for its visual treatment. Isolate the new subject on a fully transparent background. No backdrop, text, letters, or watermarks.`
          : `${prompt}\nCreate an image without text, letters, or watermarks.`,
        size,
        quality: 'medium',
        background: style ? 'transparent' : 'auto',
        output_format: 'webp',
        n: 1,
      }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      return NextResponse.json(
        { error: result?.error?.message || 'Image generation failed. Please try again.' },
        { status: response.status },
      );
    }

    const result = await response.json() as { data?: { b64_json?: string }[] };
    const image = result.data?.[0]?.b64_json;
    if (!image) {
      return NextResponse.json({ error: 'The image service returned no image.' }, { status: 502 });
    }

    return NextResponse.json({ src: `data:image/webp;base64,${image}` });
  } catch {
    return NextResponse.json({ error: 'Could not reach the image service. Please try again.' }, { status: 502 });
  }
}

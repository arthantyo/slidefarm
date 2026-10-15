import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
    let style = '';
    if (sourceImage instanceof File) {
      const sourceData = Buffer.from(await sourceImage.arrayBuffer()).toString('base64');
      const styleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Describe only the transferable visual style of an image for an image generator. Include medium, rendering technique, palette, linework, shading, texture, and lighting when visible. Do not mention any depicted objects, people, setting, action, pose, layout, or composition. Do not suggest keeping any content from the source. Respond with one concise style description.' },
          { role: 'user', content: [
            { type: 'text', text: 'Describe the visual style of this image.' },
            { type: 'image_url', image_url: { url: `data:${sourceImage.type};base64,${sourceData}`, detail: 'high' } },
          ] },
        ],
        max_tokens: 180,
      }),
      });
      if (!styleResponse.ok) {
        const result = await styleResponse.json().catch(() => null) as { error?: { message?: string } } | null;
        return NextResponse.json({ error: result?.error?.message || 'Could not analyze the original image style.' }, { status: styleResponse.status });
      }
      const styleResult = await styleResponse.json() as { choices?: { message?: { content?: string } }[] };
      style = styleResult.choices?.[0]?.message?.content?.trim() ?? '';
      if (!style) return NextResponse.json({ error: 'Could not determine the original image style.' }, { status: 502 });
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini',
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

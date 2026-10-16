import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { dataDirectory } from '@/lib/server/project-files';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(params.filename)) return NextResponse.json({ error: 'Invalid image.' }, { status: 400 });
  try {
    const bytes = await readFile(join(dataDirectory(), 'images', params.filename));
    const contentType = params.filename.endsWith('.png') ? 'image/png' : params.filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    return new NextResponse(bytes, { headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=31536000, immutable' } });
  } catch { return NextResponse.json({ error: 'Image not found.' }, { status: 404 }); }
}

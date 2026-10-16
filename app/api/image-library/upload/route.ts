import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { readImageLibrary, writeImageLibrary } from '@/lib/server/image-library';
import { dataDirectory } from '@/lib/server/project-files';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    const form = await req.formData();
    const file = form.get('file');
    const folderId = form.get('folderId');
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return NextResponse.json({ error: 'Choose a JPG, PNG or WebP under 10 MB.' }, { status: 400 });
    const library = await readImageLibrary();
    if (typeof folderId !== 'string' || (folderId && !library.folders.some((folder) => folder.id === folderId))) return NextResponse.json({ error: 'Invalid folder.' }, { status: 400 });
    const id = randomUUID();
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const directory = join(dataDirectory(), 'images');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${id}.${ext}`), Buffer.from(await file.arrayBuffer()));
    library.images.unshift({ id, name: file.name.slice(0, 120), src: `/api/image-library/file/${id}.${ext}`, folderId: folderId || null, createdAt: Date.now() });
    await writeImageLibrary(library);
    return NextResponse.json(library);
  } catch { return NextResponse.json({ error: 'Could not upload image.' }, { status: 500 }); }
}

import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dataDirectory } from '@/lib/server/project-files';
import { readImageLibrary, writeImageLibrary } from '@/lib/server/image-library';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('folder'), name: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal('import'), urls: z.array(z.string().url()).min(1).max(30), folderId: z.string().nullable(), name: z.string().max(120).optional() }),
]);
const local = (req: NextRequest) => ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);

export async function GET(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try { return NextResponse.json(await readImageLibrary()); }
  catch { return NextResponse.json({ error: 'Could not load images.' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid image library request.' }, { status: 400 });
  try {
    const library = await readImageLibrary();
    if (parsed.data.action === 'folder') {
      const name = parsed.data.name;
      if (library.folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) return NextResponse.json({ error: 'Folder already exists.' }, { status: 409 });
      library.folders.push({ id: randomUUID(), name });
    } else {
      const { urls, folderId, name } = parsed.data;
      if (folderId && !library.folders.some((folder) => folder.id === folderId)) return NextResponse.json({ error: 'Folder does not exist.' }, { status: 400 });
      const directory = join(dataDirectory(), 'images');
      await mkdir(directory, { recursive: true });
      for (const url of urls) {
        const parsedUrl = new URL(url);
        // Import only Pinterest images or local data URLs sent through the upload endpoint.
        if (parsedUrl.protocol !== 'https:' || !/(^|\.)pinimg\.com$/.test(parsedUrl.hostname)) return NextResponse.json({ error: 'Only Pinterest image URLs can be imported.' }, { status: 400 });
        const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || !contentType.startsWith('image/')) throw new Error('Could not download a Pinterest image.');
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 10 * 1024 * 1024) throw new Error('An image exceeds 10 MB.');
        const id = randomUUID();
        const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        await writeFile(join(directory, `${id}.${extension}`), bytes);
        library.images.unshift({ id, name: name || 'Pinterest image', src: `/api/image-library/file/${id}.${extension}`, folderId, createdAt: Date.now() });
      }
    }
    await writeImageLibrary(library);
    return NextResponse.json(library);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save images.' }, { status: 500 }); }
}

const change = z.discriminatedUnion('action', [
  z.object({ action: z.literal('move'), imageId: z.string(), folderId: z.string().nullable() }),
  z.object({ action: z.literal('renameFolder'), folderId: z.string(), name: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal('renameImage'), imageId: z.string(), name: z.string().trim().min(1).max(120) }),
  z.object({ action: z.literal('deleteImage'), imageId: z.string() }),
  z.object({ action: z.literal('deleteFolder'), folderId: z.string() }),
]);

export async function PATCH(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const parsed = change.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid image library request.' }, { status: 400 });
  try {
    const library = await readImageLibrary();
    const data = parsed.data;
    if (data.action === 'move') {
      const image = library.images.find((item) => item.id === data.imageId);
      if (!image || (data.folderId && !library.folders.some((folder) => folder.id === data.folderId))) return NextResponse.json({ error: 'Image or folder does not exist.' }, { status: 404 });
      image.folderId = data.folderId;
    } else if (data.action === 'renameFolder') {
      const folder = library.folders.find((item) => item.id === data.folderId);
      if (!folder) return NextResponse.json({ error: 'Folder does not exist.' }, { status: 404 });
      if (library.folders.some((item) => item.id !== folder.id && item.name.toLowerCase() === data.name.toLowerCase())) return NextResponse.json({ error: 'Folder already exists.' }, { status: 409 });
      folder.name = data.name;
    } else if (data.action === 'renameImage') {
      const image = library.images.find((item) => item.id === data.imageId);
      if (!image) return NextResponse.json({ error: 'Image does not exist.' }, { status: 404 });
      image.name = data.name;
    } else if (data.action === 'deleteFolder') {
      if (!library.folders.some((folder) => folder.id === data.folderId)) return NextResponse.json({ error: 'Folder does not exist.' }, { status: 404 });
      library.folders = library.folders.filter((folder) => folder.id !== data.folderId);
      library.images.forEach((image) => { if (image.folderId === data.folderId) image.folderId = null; });
    } else {
      const image = library.images.find((item) => item.id === data.imageId);
      if (!image) return NextResponse.json({ error: 'Image does not exist.' }, { status: 404 });
      library.images = library.images.filter((item) => item.id !== data.imageId);
      const filename = image.src.split('/').pop();
      if (filename && /^[a-f0-9-]+\.(png|jpg|webp)$/.test(filename)) await unlink(join(dataDirectory(), 'images', filename)).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
    }
    await writeImageLibrary(library);
    return NextResponse.json(library);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update images.' }, { status: 500 }); }
}

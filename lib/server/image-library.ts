import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

export interface LibraryFolder { id: string; name: string }
export interface LibraryImage { id: string; name: string; src: string; folderId: string | null; createdAt: number }
export interface ImageLibrary { folders: LibraryFolder[]; images: LibraryImage[] }

const destination = () => join(dataDirectory(), 'image-library.json');

export async function readImageLibrary(): Promise<ImageLibrary> {
  try {
    const value: unknown = JSON.parse(await readFile(destination(), 'utf8'));
    if (!value || typeof value !== 'object' || !Array.isArray((value as ImageLibrary).folders) || !Array.isArray((value as ImageLibrary).images)) throw new Error('Invalid image library');
    return value as ImageLibrary;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { folders: [], images: [] };
    throw error;
  }
}

export async function writeImageLibrary(library: ImageLibrary): Promise<void> {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${destination()}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(library), 'utf8');
  await rename(temporary, destination());
}

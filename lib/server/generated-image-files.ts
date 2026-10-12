import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory, readProjectFile } from './project-files';
import type { ImageElement } from '@/types';

export interface GeneratedImage { src: string; prompt: string }

const file = () => join(dataDirectory(), 'generated-images.json');

export async function readGeneratedImages(): Promise<GeneratedImage[]> {
  try {
    const images: unknown = JSON.parse(await readFile(file(), 'utf8'));
    if (!Array.isArray(images)) throw new Error('Invalid generated image file');
    return images as GeneratedImage[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const projects = (await readProjectFile())?.projects ?? [];
    return Array.from(new Map(projects.flatMap((project) => project.slides)
      .flatMap((slide) => slide.elements)
      .filter((element): element is ImageElement => element.type === 'image' && !!element.imagePrompt)
      .map((element) => [element.src, { src: element.src, prompt: element.imagePrompt! }])).values());
  }
}

export async function writeGeneratedImages(images: GeneratedImage[]): Promise<void> {
  await mkdir(dataDirectory(), { recursive: true });
  const destination = file();
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(images), 'utf8');
  await rename(temporary, destination);
}

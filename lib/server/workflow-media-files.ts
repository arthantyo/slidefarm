import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { WorkflowMedia } from '@/types';
import { dataDirectory } from './project-files';

const mediaDirectory = () => join(dataDirectory(), 'workflow-media');
const metadataPath = () => join(mediaDirectory(), 'index.json');

export async function readWorkflowMedia(): Promise<WorkflowMedia[]> {
  try {
    const value: unknown = JSON.parse(await readFile(metadataPath(), 'utf8'));
    if (!Array.isArray(value)) throw new Error('Invalid media index');
    return value as WorkflowMedia[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function saveWorkflowMedia(item: WorkflowMedia, output: Buffer, preview: Buffer): Promise<void> {
  const directory = mediaDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${item.id}.${item.format}`), output);
  await writeFile(join(directory, `${item.id}.preview.png`), preview);
  const items = await readWorkflowMedia();
  const temporary = `${metadataPath()}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify([item, ...items]), 'utf8');
  await rename(temporary, metadataPath());
}

export async function readWorkflowMediaFile(id: string, kind: 'download' | 'preview') {
  const item = (await readWorkflowMedia()).find((media) => media.id === id);
  if (!item) return null;
  const file = kind === 'preview' ? `${id}.preview.png` : `${id}.${item.format}`;
  return { item, data: await readFile(join(mediaDirectory(), file)) };
}

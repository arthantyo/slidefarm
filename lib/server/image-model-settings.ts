import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

const file = () => join(dataDirectory(), 'image-model-settings.json');

export async function readImageModelSetting(): Promise<string | null> {
  try {
    const data = JSON.parse(await readFile(file(), 'utf8')) as { model?: unknown };
    return typeof data.model === 'string' && data.model.trim() ? data.model.trim() : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function effectiveImageModel(): Promise<string> {
  return await readImageModelSetting() || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';
}

export async function writeImageModelSetting(model: string | null): Promise<void> {
  await mkdir(dataDirectory(), { recursive: true });
  const target = file();
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ model }), 'utf8');
  await rename(temporary, target);
}

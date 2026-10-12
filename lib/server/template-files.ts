import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CustomTemplate } from '@/types';
import { dataDirectory } from './project-files';

function templatePath() {
  const directory = dataDirectory();
  return { directory, file: join(directory, 'templates.json') };
}

export async function readTemplateFile(): Promise<CustomTemplate[] | null> {
  try {
    const data: unknown = JSON.parse(await readFile(templatePath().file, 'utf8'));
    if (!Array.isArray(data)) throw new Error('Invalid template file');
    return data as CustomTemplate[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeTemplateFile(templates: CustomTemplate[]): Promise<void> {
  const { directory, file } = templatePath();
  await mkdir(directory, { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(templates), 'utf8');
  await rename(temporary, file);
}

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Workflow } from '@/types';
import { dataDirectory } from './project-files';

const destination = () => join(dataDirectory(), 'workflows.json');

export async function readWorkflows(): Promise<Workflow[]> {
  try {
    const value: unknown = JSON.parse(await readFile(destination(), 'utf8'));
    if (!Array.isArray(value)) throw new Error('Invalid workflow file');
    return value as Workflow[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function writeWorkflows(workflows: Workflow[]): Promise<void> {
  await mkdir(dataDirectory(), { recursive: true });
  const file = destination();
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(workflows), 'utf8');
  await rename(temporary, file);
}

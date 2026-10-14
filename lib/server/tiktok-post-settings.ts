import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

export type PostTimes = [string, string];
export const defaultPostTimes: PostTimes = ['03:00', '18:00'];

const path = () => join(dataDirectory(), 'tiktok-post-settings.json');

async function readAll(): Promise<Record<string, PostTimes>> {
  try { return JSON.parse(await readFile(path(), 'utf8')) as Record<string, PostTimes>; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error; }
}

export async function readPostTimes(openId: string): Promise<PostTimes> {
  return (await readAll())[openId] ?? defaultPostTimes;
}

export async function writePostTimes(openId: string, times: PostTimes): Promise<void> {
  const settings = await readAll();
  settings[openId] = times;
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${path()}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(settings), 'utf8');
  await rename(temporary, path());
}

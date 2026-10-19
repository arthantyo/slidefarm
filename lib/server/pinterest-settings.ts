import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

export interface PinterestSettings { token: string }
const file = () => join(dataDirectory(), 'pinterest-apify-settings.json');

export async function readPinterestSettings(): Promise<PinterestSettings> {
  let saved: Partial<PinterestSettings> = {};
  try { saved = JSON.parse(await readFile(file(), 'utf8')) as Partial<PinterestSettings>; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return {
    token: saved.token ?? process.env.APIFY_TOKEN ?? '',
  };
}

export async function writePinterestSettings(settings: PinterestSettings): Promise<void> {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${file()}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(settings), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, file());
}

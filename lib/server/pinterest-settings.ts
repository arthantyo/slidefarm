import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

export interface PinterestSettings { key: string; host: string; searchPath: string; boardPath: string }
const file = () => join(dataDirectory(), 'pinterest-settings.json');

export async function readPinterestSettings(): Promise<PinterestSettings> {
  let saved: Partial<PinterestSettings> = {};
  try { saved = JSON.parse(await readFile(file(), 'utf8')) as Partial<PinterestSettings>; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return {
    key: saved.key ?? process.env.RAPIDAPI_KEY ?? '',
    host: saved.host ?? process.env.RAPIDAPI_PINTEREST_HOST ?? '',
    searchPath: saved.searchPath ?? process.env.RAPIDAPI_PINTEREST_SEARCH_PATH ?? '',
    boardPath: saved.boardPath ?? process.env.RAPIDAPI_PINTEREST_BOARD_PATH ?? '',
  };
}

export async function writePinterestSettings(settings: PinterestSettings): Promise<void> {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${file()}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(settings), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, file());
}

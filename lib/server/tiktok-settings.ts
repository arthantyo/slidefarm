import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

export interface TikTokSettings { clientKey: string; clientSecret: string; redirectUri: string }
const file = () => join(dataDirectory(), 'tiktok-settings.json');

export async function readTikTokSettings(): Promise<TikTokSettings> {
  let saved: Partial<TikTokSettings> = {};
  try { saved = JSON.parse(await readFile(file(), 'utf8')) as Partial<TikTokSettings>; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return {
    clientKey: saved.clientKey ?? process.env.TIKTOK_CLIENT_KEY ?? '',
    clientSecret: saved.clientSecret ?? process.env.TIKTOK_CLIENT_SECRET ?? '',
    redirectUri: saved.redirectUri ?? process.env.TIKTOK_REDIRECT_URI ?? '',
  };
}

export async function writeTikTokSettings(settings: TikTokSettings): Promise<void> {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${file()}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(settings), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, file());
}

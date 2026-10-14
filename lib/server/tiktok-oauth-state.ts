import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

interface PendingAuthorization {
  returnTo: string;
  redirectUri: string;
  verifier?: string;
  createdAt: number;
}

const directory = () => join(dataDirectory(), 'tiktok-oauth');
const path = (state: string) => join(directory(), `${state}.json`);

export async function savePendingAuthorization(state: string, pending: PendingAuthorization) {
  await mkdir(directory(), { recursive: true });
  await writeFile(path(state), JSON.stringify(pending), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

export async function consumePendingAuthorization(state: string): Promise<PendingAuthorization | null> {
  if (!/^[a-f0-9]{48}$/.test(state)) return null;
  try {
    const pending = JSON.parse(await readFile(path(state), 'utf8')) as PendingAuthorization;
    await unlink(path(state));
    return Date.now() - pending.createdAt < 10 * 60_000 ? pending : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

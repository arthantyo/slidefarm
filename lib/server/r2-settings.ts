import 'server-only';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

export interface R2Settings {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicOrigin: string;
}

const file = () => join(dataDirectory(), 'r2-settings.json');

export function validateR2Settings(settings: R2Settings): string | null {
  if (!settings.accountId || !settings.bucket || !settings.accessKeyId || !settings.secretAccessKey || !settings.publicOrigin) {
    return 'Enter the R2 account ID, bucket, access key, secret key, and public HTTPS origin.';
  }
  if (!/^[a-f0-9]{32}$/i.test(settings.accountId) || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(settings.bucket)) {
    return 'Enter a valid R2 account ID and bucket name.';
  }
  try {
    const url = new URL(settings.publicOrigin);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      return 'The public origin must be an HTTPS origin without a path.';
    }
  } catch {
    return 'Enter a valid public HTTPS origin.';
  }
  return null;
}

export async function readR2Settings(): Promise<R2Settings> {
  let saved: Partial<R2Settings> = {};
  try { saved = JSON.parse(await readFile(file(), 'utf8')) as Partial<R2Settings>; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return {
    accountId: saved.accountId ?? process.env.R2_ACCOUNT_ID ?? '',
    bucket: saved.bucket ?? process.env.R2_BUCKET ?? '',
    accessKeyId: saved.accessKeyId ?? process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: saved.secretAccessKey ?? process.env.R2_SECRET_ACCESS_KEY ?? '',
    publicOrigin: saved.publicOrigin ?? process.env.TIKTOK_VERIFIED_URL_PREFIX ?? '',
  };
}

export async function writeR2Settings(settings: R2Settings): Promise<void> {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${file()}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(settings), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, file());
}

export async function removeR2Settings(): Promise<void> {
  try { await unlink(file()); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}

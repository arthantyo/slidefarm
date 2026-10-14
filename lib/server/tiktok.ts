import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

export interface TikTokAccount {
  openId: string;
  displayName: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}

const path = () => join(dataDirectory(), 'tiktok-accounts.json');
export const configured = () => {
  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET || !process.env.TIKTOK_REDIRECT_URI) return false;
  try {
    const redirect = new URL(process.env.TIKTOK_REDIRECT_URI);
    const validOrigin = local(redirect.hostname) ? ['http:', 'https:'].includes(redirect.protocol) && Boolean(redirect.port) : redirect.protocol === 'https:';
    return validOrigin && redirect.pathname === '/api/tiktok/callback' && !redirect.search && !redirect.hash && !redirect.username && !redirect.password;
  }
  catch { return false; }
};
export const local = (hostname: string) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

export async function readAccounts(): Promise<TikTokAccount[]> {
  try {
    const value: unknown = JSON.parse(await readFile(path(), 'utf8'));
    if (!Array.isArray(value)) throw new Error('Invalid TikTok account file.');
    return value as TikTokAccount[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeAccounts(accounts: TikTokAccount[]) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${path()}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(accounts), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, path());
}

export async function saveAccount(account: TikTokAccount) {
  const accounts = await readAccounts();
  await writeAccounts([...accounts.filter((item) => item.openId !== account.openId), account]);
}

export async function removeAccount(openId: string) {
  const accounts = await readAccounts();
  await writeAccounts(accounts.filter((item) => item.openId !== openId));
}

type TokenResponse = { open_id?: string; access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string };

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const result = await response.json() as TokenResponse;
  if (!response.ok || !result.access_token || !result.refresh_token || !result.open_id) throw new Error(result.error_description || result.error || 'TikTok authorization failed.');
  return result;
}

export async function exchangeCode(code: string, verifier?: string): Promise<TikTokAccount> {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    code, grant_type: 'authorization_code', redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
  });
  if (verifier) params.set('code_verifier', verifier);
  const result = await tokenRequest(params);
  const profileResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
    headers: { Authorization: `Bearer ${result.access_token}` },
  });
  const profile = await profileResponse.json() as { data?: { user?: { display_name?: string; avatar_url?: string } } };
  return {
    openId: result.open_id!, displayName: profile.data?.user?.display_name || 'TikTok account',
    avatarUrl: profile.data?.user?.avatar_url, accessToken: result.access_token!, refreshToken: result.refresh_token!,
    expiresAt: Date.now() + (result.expires_in ?? 86400) * 1000, scopes: (result.scope ?? '').split(',').filter(Boolean),
  };
}

export async function accessToken(openId: string) {
  const account = (await readAccounts()).find((item) => item.openId === openId);
  if (!account) throw new Error('TikTok account is not connected.');
  if (account.expiresAt > Date.now() + 60_000) return account.accessToken;
  const result = await tokenRequest(new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    grant_type: 'refresh_token', refresh_token: account.refreshToken,
  }));
  const refreshed = { ...account, accessToken: result.access_token!, refreshToken: result.refresh_token!, expiresAt: Date.now() + (result.expires_in ?? 86400) * 1000, scopes: (result.scope ?? account.scopes.join(',')).split(',') };
  await saveAccount(refreshed);
  return refreshed.accessToken;
}

export async function revokeAccount(openId: string) {
  const account = (await readAccounts()).find((item) => item.openId === openId);
  if (!account) return;
  if (configured()) {
    const token = await accessToken(openId);
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!, token }),
    });
    if (!response.ok) throw new Error('TikTok could not revoke access.');
  }
  await removeAccount(openId);
}

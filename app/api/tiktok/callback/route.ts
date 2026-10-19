import { NextRequest, NextResponse } from 'next/server';
import { configured, exchangeCode, local, saveAccount } from '@/lib/server/tiktok';
import { consumePendingAuthorization } from '@/lib/server/tiktok-oauth-state';
import { readTikTokSettings } from '@/lib/server/tiktok-settings';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state');
  const code = req.nextUrl.searchParams.get('code');
  const pending = state ? await consumePendingAuthorization(state) : null;
  const returnTo = pending && local(new URL(pending.returnTo).hostname) ? pending.returnTo : 'http://localhost:3000';
  let error = req.nextUrl.searchParams.get('error_description') || req.nextUrl.searchParams.get('error') || '';
  const settings = await readTikTokSettings();
  if (!configured(settings) || !pending || pending.redirectUri !== settings.redirectUri || !code) error ||= 'TikTok authorization expired or the callback did not match. Try connecting again.';
  if (!error) {
    try { await saveAccount(await exchangeCode(code!, pending!.verifier)); }
    catch (cause) { error = cause instanceof Error ? cause.message : 'TikTok authorization failed.'; }
  }
  return NextResponse.redirect(new URL(error ? `/accounts?error=${encodeURIComponent(error)}` : '/accounts?connected=1', returnTo));
}

import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { configured, local } from '@/lib/server/tiktok';
import { savePendingAuthorization } from '@/lib/server/tiktok-oauth-state';
import { readTikTokSettings } from '@/lib/server/tiktok-settings';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const settings = await readTikTokSettings();
  if (!configured(settings)) {
    if (req.nextUrl.searchParams.get('desktop') === '1') return NextResponse.json({ error: 'Complete TikTok Login Kit settings first.' }, { status: 400 });
    return NextResponse.redirect(new URL('/accounts?error=configure', req.url));
  }
  const state = randomBytes(24).toString('hex');
  const redirectUri = settings.redirectUri;
  const desktop = local(new URL(redirectUri).hostname);
  const verifier = desktop ? randomBytes(48).toString('base64url') : undefined;
  const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
  url.searchParams.set('client_key', settings.clientKey);
  url.searchParams.set('scope', 'user.info.basic,video.publish,video.upload');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  if (verifier) {
    url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('hex'));
    url.searchParams.set('code_challenge_method', 'S256');
  }
  await savePendingAuthorization(state, { returnTo: req.nextUrl.origin, redirectUri, verifier, createdAt: Date.now() });
  if (req.nextUrl.searchParams.get('desktop') === '1') return NextResponse.json({ authorizationUrl: url.toString(), redirectUri });
  return NextResponse.redirect(url);
}

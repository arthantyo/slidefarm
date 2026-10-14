import { z } from 'zod';
import { accessToken } from './tiktok';

export const photoPostSchema = z.object({
  openId: z.string().min(1), title: z.string().max(90), description: z.string().max(4000),
  images: z.array(z.string().url()).min(1).max(35), privacyLevel: z.string().min(1),
  disableComment: z.boolean(), autoAddMusic: z.boolean(), isAigc: z.boolean(),
  brandContent: z.boolean(), brandOrganic: z.boolean(),
});
export type PhotoPost = z.infer<typeof photoPostSchema>;
export type PhotoPostMode = 'DIRECT_POST' | 'MEDIA_UPLOAD';

export function validatePhotoUrls(images: string[]) {
  const prefix = process.env.TIKTOK_VERIFIED_URL_PREFIX;
  if (!prefix?.startsWith('https://')) throw new Error('Set TIKTOK_VERIFIED_URL_PREFIX to the verified public HTTPS origin.');
  const verified = new URL(prefix);
  if (images.some((image) => {
    const url = new URL(image);
    return url.protocol !== 'https:' || url.origin !== verified.origin || !url.pathname.startsWith(verified.pathname) || Boolean(url.username || url.password);
  })) throw new Error('All images must use the verified URL prefix.');
}

async function tiktokRequest<T>(path: string, token: string, body?: unknown, mode?: PhotoPostMode): Promise<T> {
  const response = await fetch(`https://open.tiktokapis.com/v2/post/publish/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json() as { data?: T; error?: { code?: string; message?: string; log_id?: string } };
  if (!response.ok || result.error?.code !== 'ok' || !result.data) {
    console.error('TikTok API request failed', {
      endpoint: path, mode, status: response.status, code: result.error?.code,
      message: result.error?.message, logId: result.error?.log_id,
    });
    const code = result.error?.code;
    const guidance: Record<string, string> = {
      unaudited_client_can_only_post_to_private_accounts: mode === 'MEDIA_UPLOAD'
        ? 'TikTok rejected the inbox upload because this unaudited app is connected to a public account. The request used MEDIA_UPLOAD and did not publish. Make the TikTok account private or complete the app audit.'
        : 'TikTok requires unaudited apps to post to a private account with Only me visibility. Make the TikTok account private, select Only me, or complete the TikTok app audit for public posting.',
      url_ownership_unverified: 'Verify the image URL domain or prefix in your TikTok developer app and make sure it matches TIKTOK_VERIFIED_URL_PREFIX.',
      privacy_level_option_mismatch: 'The selected privacy option is no longer available. Reopen the post form and select an option returned for this TikTok account.',
      spam_risk_too_many_posts: 'This TikTok account has reached its daily API posting limit. Try again later.',
      reached_active_user_cap: 'This TikTok app has reached its daily active creator limit. Try again later.',
      spam_risk_user_banned_from_posting: 'TikTok has restricted this account from posting. Check the account in TikTok.',
      scope_not_authorized: 'Reconnect this TikTok account and grant the required posting or upload permission.',
    };
    const detail = (code && guidance[code]) || result.error?.message || `TikTok request failed (${response.status}).`;
    const diagnostic = [code && `code: ${code}`, result.error?.log_id && `log ID: ${result.error.log_id}`].filter(Boolean).join(', ');
    throw new Error(diagnostic ? `${detail} (${diagnostic})` : detail);
  }
  return result.data;
}

export async function publishPhotoPost(post: PhotoPost, mode: PhotoPostMode = 'DIRECT_POST'): Promise<string> {
  validatePhotoUrls(post.images);
  const token = await accessToken(post.openId);
  const creator = mode === 'DIRECT_POST'
    ? await tiktokRequest<{ privacy_level_options?: string[]; comment_disabled?: boolean }>('creator_info/query/', token)
    : undefined;
  if (creator && !creator.privacy_level_options?.includes(post.privacyLevel)) throw new Error('The selected privacy level is unavailable for this account.');
  if (creator && post.brandContent && post.privacyLevel === 'SELF_ONLY') throw new Error('Branded content cannot be private.');
  const result = await tiktokRequest<{ publish_id?: string }>('content/init/', token, {
    post_mode: mode, media_type: 'PHOTO', is_aigc: post.isAigc,
    post_info: mode === 'MEDIA_UPLOAD'
      ? { title: post.title, description: post.description }
      : {
        title: post.title, description: post.description, privacy_level: post.privacyLevel,
        disable_comment: post.disableComment || Boolean(creator?.comment_disabled), auto_add_music: post.autoAddMusic,
        brand_content_toggle: post.brandContent, brand_organic_toggle: post.brandOrganic,
      },
    source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: post.images },
  }, mode);
  if (!result.publish_id) throw new Error('TikTok did not return a publish ID.');
  return result.publish_id;
}

export async function fetchPhotoPostStatus(openId: string, publishId: string) {
  const token = await accessToken(openId);
  const result = await tiktokRequest<{ status?: string; fail_reason?: string }>('status/fetch/', token, { publish_id: publishId });
  if (result.status === 'FAILED') console.error('TikTok photo post failed', { publishId, failReason: result.fail_reason });
  return { status: result.status, failReason: result.fail_reason };
}

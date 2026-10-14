import { z } from 'zod';
import { accessToken } from './tiktok';

export const photoPostSchema = z.object({
  openId: z.string().min(1), title: z.string().max(90), description: z.string().max(4000),
  images: z.array(z.string().url()).min(1).max(35), privacyLevel: z.string().min(1),
  disableComment: z.boolean(), autoAddMusic: z.boolean(), isAigc: z.boolean(),
  brandContent: z.boolean(), brandOrganic: z.boolean(),
});
export type PhotoPost = z.infer<typeof photoPostSchema>;

export function validatePhotoUrls(images: string[]) {
  const prefix = process.env.TIKTOK_VERIFIED_URL_PREFIX;
  if (!prefix?.startsWith('https://')) throw new Error('Set TIKTOK_VERIFIED_URL_PREFIX to the verified public HTTPS origin.');
  const verified = new URL(prefix);
  if (images.some((image) => {
    const url = new URL(image);
    return url.protocol !== 'https:' || url.origin !== verified.origin || !url.pathname.startsWith(verified.pathname) || Boolean(url.username || url.password);
  })) throw new Error('All images must use the verified URL prefix.');
}

async function tiktokRequest<T>(path: string, token: string, body?: unknown): Promise<T> {
  const response = await fetch(`https://open.tiktokapis.com/v2/post/publish/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json() as { data?: T; error?: { code?: string; message?: string } };
  if (!response.ok || result.error?.code !== 'ok' || !result.data) throw new Error(result.error?.message || `TikTok request failed (${response.status}).`);
  return result.data;
}

export async function publishPhotoPost(post: PhotoPost): Promise<string> {
  validatePhotoUrls(post.images);
  const token = await accessToken(post.openId);
  const creator = await tiktokRequest<{ privacy_level_options?: string[] }>('creator_info/query/', token);
  if (!creator.privacy_level_options?.includes(post.privacyLevel)) throw new Error('The selected privacy level is unavailable for this account.');
  const result = await tiktokRequest<{ publish_id?: string }>('content/init/', token, {
    post_mode: 'DIRECT_POST', media_type: 'PHOTO', is_aigc: post.isAigc,
    post_info: {
      title: post.title, description: post.description, privacy_level: post.privacyLevel,
      disable_comment: post.disableComment, auto_add_music: post.autoAddMusic,
      brand_content_toggle: post.brandContent, brand_organic_toggle: post.brandOrganic,
    },
    source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: post.images },
  });
  if (!result.publish_id) throw new Error('TikTok did not return a publish ID.');
  return result.publish_id;
}

export async function fetchPhotoPostStatus(openId: string, publishId: string) {
  const token = await accessToken(openId);
  const result = await tiktokRequest<{ status?: string; fail_reason?: string }>('status/fetch/', token, { publish_id: publishId });
  return { status: result.status, failReason: result.fail_reason };
}

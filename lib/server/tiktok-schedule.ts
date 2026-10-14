import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';
import { readAccounts } from './tiktok';
import { fetchPhotoPostStatus, photoPostSchema, publishPhotoPost, validatePhotoUrls } from './tiktok-publish';
import type { PhotoPost } from './tiktok-publish';
import { z } from 'zod';

export const scheduleInputSchema = photoPostSchema.extend({
  postMode: z.enum(['DIRECT_POST', 'MEDIA_UPLOAD']),
  postingConsent: z.literal(true),
  projectId: z.string().min(1), projectName: z.string().min(1),
  calendarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledAt: z.number().int().positive(),
});
export type ScheduleInput = z.infer<typeof scheduleInputSchema>;
export type ScheduledPostStatus = 'scheduled' | 'submitting' | 'submitted' | 'awaiting_creator' | 'published' | 'failed' | 'canceled';
export interface ScheduledPost extends ScheduleInput {
  id: string;
  status: ScheduledPostStatus;
  createdAt: number;
  updatedAt: number;
  publishId?: string;
  error?: string;
  checkedAt?: number;
}

const directory = () => join(dataDirectory(), 'tiktok-schedule');
const path = (id: string) => join(directory(), `${id}.json`);
let ticking = false;
let mutationQueue: Promise<void> = Promise.resolve();
const runner = globalThis as typeof globalThis & { __slidefarmTikTokScheduleTimer?: NodeJS.Timeout };

function exclusive<T>(action: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(action);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function writePost(post: ScheduledPost) {
  await mkdir(directory(), { recursive: true });
  const temporary = `${path(post.id)}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify({ ...post, updatedAt: Date.now() }), 'utf8');
  await rename(temporary, path(post.id));
}

export async function readScheduledPost(id: string): Promise<ScheduledPost | null> {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  try { return JSON.parse(await readFile(path(id), 'utf8')) as ScheduledPost; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

export async function listScheduledPosts(openId?: string): Promise<ScheduledPost[]> {
  await mkdir(directory(), { recursive: true });
  const names = (await readdir(directory())).filter((name) => /^[a-f0-9-]{36}\.json$/.test(name));
  const posts = await Promise.all(names.map((name) => readScheduledPost(name.slice(0, -5))));
  return posts.filter((post): post is ScheduledPost => Boolean(post && (!openId || post.openId === openId)))
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
}

async function validateInput(input: ScheduleInput) {
  if (input.scheduledAt < Date.now() - 60_000) throw new Error('Choose a future date and time.');
  validatePhotoUrls(input.images);
  if (input.postMode !== 'MEDIA_UPLOAD' && input.brandContent && input.privacyLevel === 'SELF_ONLY') throw new Error('Branded content cannot be private.');
  const account = (await readAccounts()).find((item) => item.openId === input.openId);
  const scope = input.postMode === 'MEDIA_UPLOAD' ? 'video.upload' : 'video.publish';
  if (!account?.scopes.includes(scope)) throw new Error(`Reconnect the TikTok account and grant ${scope} access.`);
}

function postDate(post: ScheduledPost) {
  const date = new Date(post.scheduledAt);
  return post.calendarDate || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function ensureDailyCapacity(input: ScheduleInput, excludedId?: string) {
  const posts = await listScheduledPosts(input.openId);
  const count = posts.filter((post) => post.id !== excludedId && post.status !== 'canceled' && postDate(post) === input.calendarDate).length;
  if (count >= 2) throw new Error('This account already has two posts on that day. Choose another day or cancel one first.');
}

export async function createScheduledPost(input: ScheduleInput) {
  return exclusive(async () => {
    await validateInput(input);
    await ensureDailyCapacity(input);
    const now = Date.now();
    const post: ScheduledPost = { ...input, id: randomUUID(), status: 'scheduled', createdAt: now, updatedAt: now };
    await writePost(post);
    startScheduleRunner();
    return post;
  });
}

export async function updateScheduledPost(id: string, input: ScheduleInput) {
  return exclusive(async () => {
    const current = await readScheduledPost(id);
    if (!current || current.status !== 'scheduled') return null;
    await validateInput(input);
    if (current.openId !== input.openId) throw new Error('A scheduled post cannot switch accounts.');
    await ensureDailyCapacity(input, id);
    const post: ScheduledPost = { ...current, ...input };
    await writePost(post);
    return post;
  });
}

export async function cancelScheduledPost(id: string) {
  return exclusive(async () => {
    const current = await readScheduledPost(id);
    if (!current || current.status !== 'scheduled') return false;
    await writePost({ ...current, status: 'canceled' });
    return true;
  });
}

export async function retryFailedPost(id: string, calendarDate: string) {
  return exclusive(async () => {
    const current = await readScheduledPost(id);
    if (!current || current.status !== 'failed') return null;
    const scheduledAt = Date.now() + 30_000;
    const post: ScheduledPost = { ...current, calendarDate, scheduledAt, status: 'scheduled', error: undefined, publishId: undefined, checkedAt: undefined };
    await validateInput(post);
    await ensureDailyCapacity(post, id);
    await writePost(post);
    startScheduleRunner();
    return post;
  });
}

export function startScheduleRunner() {
  if (runner.__slidefarmTikTokScheduleTimer) return;
  runner.__slidefarmTikTokScheduleTimer = setInterval(() => void tick(), 15_000);
  runner.__slidefarmTikTokScheduleTimer.unref();
  void tick();
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const posts = await listScheduledPosts();
    const due = await exclusive(async () => {
      const candidate = posts.find((post) => post.status === 'scheduled' && post.scheduledAt <= Date.now());
      if (!candidate) return null;
      const current = await readScheduledPost(candidate.id);
      if (!current || current.status !== 'scheduled' || current.scheduledAt > Date.now()) return null;
      await writePost({ ...current, status: 'submitting' });
      return current;
    });
    if (due) {
      try {
        const publishId = await publishPhotoPost(due as PhotoPost, due.postMode);
        await writePost({ ...due, status: 'submitted', publishId, checkedAt: Date.now() });
      } catch (error) {
        await writePost({ ...due, status: 'failed', error: error instanceof Error ? error.message : 'TikTok submission failed.' });
      }
    }
    const submitted = posts.find((post) => (post.status === 'submitted' || post.status === 'awaiting_creator') && post.publishId && (!post.checkedAt || Date.now() - post.checkedAt > 60_000));
    if (submitted?.publishId) {
      try {
        const result = await fetchPhotoPostStatus(submitted.openId, submitted.publishId);
        await exclusive(async () => {
          const current = await readScheduledPost(submitted.id);
          if ((current?.status === 'submitted' || current?.status === 'awaiting_creator') && current.publishId === submitted.publishId)
            await writePost({ ...current, checkedAt: Date.now(), status: result.status === 'PUBLISH_COMPLETE' ? 'published' : result.status === 'FAILED' ? 'failed' : current.postMode === 'MEDIA_UPLOAD' && result.status === 'SEND_TO_USER_INBOX' ? 'awaiting_creator' : 'submitted', error: result.failReason });
        });
      } catch {
        await exclusive(async () => {
          const current = await readScheduledPost(submitted.id);
          if ((current?.status === 'submitted' || current?.status === 'awaiting_creator') && current.publishId === submitted.publishId)
            await writePost({ ...current, checkedAt: Date.now() });
        });
      }
    }
  } catch (error) { console.error('TikTok schedule runner failed:', error); }
  finally { ticking = false; }
}

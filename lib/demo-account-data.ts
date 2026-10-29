import type { ScheduledPost } from '@/lib/server/tiktok-schedule';
import type { PostTimes } from '@/lib/server/tiktok-post-settings';
import { DEMO_ACCOUNT_ID } from './demo-account';

const POSTS_KEY = 'slidefarm-demo-posts';
const TIMES_KEY = 'slidefarm-demo-post-times';
export const defaultDemoTimes: PostTimes = ['10:00', '18:00'];

export function demoSlide(title: string, color: string) {
  const safeTitle = title.replace(/[<>&"']/g, '');
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640"><rect width="360" height="640" fill="${color}"/><circle cx="310" cy="100" r="125" fill="#ffffff" opacity=".12"/><circle cx="40" cy="530" r="170" fill="#ffffff" opacity=".1"/><text x="32" y="310" fill="white" font-family="Arial,sans-serif" font-size="32" font-weight="bold">${safeTitle}</text><text x="32" y="600" fill="white" font-family="Arial,sans-serif" font-size="16">dreamystars</text></svg>`)}`;
}

function samplePost(offset: number, title: string, color: string): ScheduledPost {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  day.setHours(10, 0, 0, 0);
  const calendarDate = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  const now = Date.now();
  return {
    id: crypto.randomUUID(), openId: DEMO_ACCOUNT_ID, projectId: `demo-${offset}`,
    projectName: title, calendarDate, scheduledAt: day.getTime(),
    title, description: `A preview of ${title.toLowerCase()} for the dreamystars showcase.`,
    images: [demoSlide(title, color)], privacyLevel: 'PUBLIC_TO_EVERYONE',
    postMode: 'DIRECT_POST', disableComment: false, autoAddMusic: true,
    isAigc: false, brandContent: false, brandOrganic: false, postingConsent: true,
    status: 'scheduled', createdAt: now, updatedAt: now,
  };
}

export function readDemoPosts(): ScheduledPost[] {
  try {
    const stored = sessionStorage.getItem(POSTS_KEY);
    if (stored) return JSON.parse(stored) as ScheduledPost[];
  } catch { /* Use sample posts when browser storage is unavailable. */ }
  return [samplePost(1, 'A little cosmic inspiration', '#312e81'), samplePost(3, 'Dream big today', '#a21caf')];
}

export function writeDemoPosts(posts: ScheduledPost[]) {
  sessionStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

export function readDemoTimes(): PostTimes {
  try {
    const stored = sessionStorage.getItem(TIMES_KEY);
    if (stored) {
      const value: unknown = JSON.parse(stored);
      if (Array.isArray(value) && value.length === 2 && value.every((time) => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return value as PostTimes;
    }
  } catch { /* Use default times when browser storage is unavailable. */ }
  return defaultDemoTimes;
}

export function writeDemoTimes(times: PostTimes) {
  sessionStorage.setItem(TIMES_KEY, JSON.stringify(times));
}

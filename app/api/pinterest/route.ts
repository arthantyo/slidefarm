import { NextRequest, NextResponse } from 'next/server';
import { readPinterestSettings } from '@/lib/server/pinterest-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractImages(value: unknown): { url: string; id: string }[] {
  if (!Array.isArray(value)) return [];
  const results = new Map<string, { url: string; id: string }>();
  const pinImage = (candidate: unknown): string | null => {
    if (typeof candidate !== 'string') return null;
    try {
      const url = new URL(candidate);
      return url.protocol === 'https:' && /(^|\.)pinimg\.com$/.test(url.hostname) ? candidate : null;
    } catch { return null; }
  };
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const pin = item as Record<string, unknown>;
    const sizes = pin.images && typeof pin.images === 'object' ? pin.images as Record<string, unknown> : {};
    const preferred = ['orig', 'originals', 'original', '736x', '564x', '474x', '236x'];
    const image = [...preferred, ...Object.keys(sizes)].map((size) => {
      const variant = sizes[size];
      return pinImage(typeof variant === 'object' && variant !== null ? (variant as Record<string, unknown>).url : variant);
    }).find((url) => url !== null) ?? pinImage(pin.image_url) ?? pinImage(pin.imageUrl);
    if (!image) continue;
    const imageKey = new URL(image).pathname.replace(/^\/(?:originals|\d+x)\//, '/');
    const id = typeof pin.id === 'string' || typeof pin.id === 'number' ? String(pin.id) : imageKey;
    if (!results.has(imageKey)) results.set(imageKey, { id, url: image });
  }
  return Array.from(results.values()).slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const mode = req.nextUrl.searchParams.get('mode');
  const query = req.nextUrl.searchParams.get('query')?.trim();
  if (!query || query.length > 500 || !['search', 'board'].includes(mode || '')) return NextResponse.json({ error: 'Enter a search or board link.' }, { status: 400 });
  const settings = await readPinterestSettings();
  if (!settings.token) return NextResponse.json({ error: 'Add your Apify API token in Settings.' }, { status: 503 });
  if (mode === 'board') {
    try { const url = new URL(query); if (url.protocol !== 'https:' || !/(^|\.)pinterest\.com$/.test(url.hostname)) throw new Error(); }
    catch { return NextResponse.json({ error: 'Enter a Pinterest board URL.' }, { status: 400 }); }
  }
  try {
    const input = mode === 'board'
      ? { startUrls: [query], maxItems: 10, endPage: 1, getDetails: false, proxy: { useApifyProxy: true } }
      : { search: query, maxItems: 10, endPage: 1, getDetails: false, proxy: { useApifyProxy: true } };
    const response = await fetch('https://api.apify.com/v2/actors/epctex~pinterest-scraper/run-sync-get-dataset-items?timeout=300', {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input), cache: 'no-store', signal: AbortSignal.timeout(310000),
    });
    if (!response.ok) return NextResponse.json({ error: `Apify returned ${response.status}. Check your token and Actor access.` }, { status: 502 });
    const items: unknown = await response.json();
    if (Array.isArray(items) && items.some((item) => item && typeof item === 'object' && (item as Record<string, unknown>).demo === true)) {
      return NextResponse.json({ error: 'The Apify Actor returned demo records instead of pins. Its Free Plan monthly run limit has been reached. Check your Apify plan or wait for the limit to reset.' }, { status: 402 });
    }
    const images = extractImages(items);
    if (!images.length) return NextResponse.json({ error: 'Apify returned no Pinterest images. Check the board or search term, then try again.' }, { status: 502 });
    return NextResponse.json({ images });
  } catch { return NextResponse.json({ error: 'Could not load Pinterest images from Apify.' }, { status: 502 }); }
}

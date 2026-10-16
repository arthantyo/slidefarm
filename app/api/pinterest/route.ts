import { NextRequest, NextResponse } from 'next/server';
import { readPinterestSettings } from '@/lib/server/pinterest-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractImages(value: unknown): { url: string; id: string }[] {
  const results = new Map<string, { url: string; id: string }>();
  const visit = (item: unknown, depth: number) => {
    if (depth > 8 || !item || typeof item !== 'object') return;
    if (Array.isArray(item)) { item.forEach((child) => visit(child, depth + 1)); return; }
    const object = item as Record<string, unknown>;
    for (const field of ['url', 'src', 'image_url', 'imageUrl', 'original', 'large']) {
      const url = object[field];
      if (typeof url === 'string') {
        try {
          const parsed = new URL(url);
          if (parsed.protocol === 'https:' && /(^|\.)pinimg\.com$/.test(parsed.hostname)) results.set(url, { url, id: String(object.id || url) });
        } catch { /* Ignore non-URLs. */ }
      }
    }
    Object.values(object).forEach((child) => visit(child, depth + 1));
  };
  visit(value, 0);
  return Array.from(results.values()).slice(0, 100);
}

export async function GET(req: NextRequest) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const mode = req.nextUrl.searchParams.get('mode');
  const query = req.nextUrl.searchParams.get('query')?.trim();
  if (!query || query.length > 500 || !['search', 'board'].includes(mode || '')) return NextResponse.json({ error: 'Enter a search or board link.' }, { status: 400 });
  const settings = await readPinterestSettings();
  const { key, host } = settings;
  const path = mode === 'board' ? settings.boardPath : settings.searchPath;
  if (!key || !host || !path) return NextResponse.json({ error: 'Configure Pinterest RapidAPI in Settings.' }, { status: 503 });
  if (!/^[a-z0-9-]+\.p\.rapidapi\.com$/.test(host) || !path.startsWith('/') || path.startsWith('//')) return NextResponse.json({ error: 'Invalid Pinterest RapidAPI configuration.' }, { status: 503 });
  if (mode === 'board') {
    try { const url = new URL(query); if (url.protocol !== 'https:' || !/(^|\.)pinterest\.com$/.test(url.hostname)) throw new Error(); }
    catch { return NextResponse.json({ error: 'Enter a Pinterest board URL.' }, { status: 400 }); }
  }
  try {
    const url = new URL(path, `https://${host}`);
    url.searchParams.set(mode === 'board' ? 'url' : 'query', query);
    const response = await fetch(url, { headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host }, cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!response.ok) return NextResponse.json({ error: `Pinterest provider returned ${response.status}.` }, { status: 502 });
    return NextResponse.json({ images: extractImages(await response.json()) });
  } catch { return NextResponse.json({ error: 'Could not load Pinterest images.' }, { status: 502 }); }
}

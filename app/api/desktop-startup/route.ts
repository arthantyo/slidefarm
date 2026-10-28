import { NextRequest } from 'next/server';
import { recordStartupDuration } from '@/lib/analytics/server-counter';

export const runtime = 'nodejs';

const milestones = new Set(['app_ready', 'window_loaded', 'dashboard_interactive', 'editor_interactive']);

export async function POST(request: NextRequest) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(request.nextUrl.hostname)) {
    return new Response(null, { status: 403 });
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return new Response(null, { status: 403 });
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return new Response(null, { status: 415 });
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 256) return new Response(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return new Response(null, { status: 400 });
  const { milestone, durationMs } = body as Record<string, unknown>;
  if (typeof milestone !== 'string' || !milestones.has(milestone) ||
      typeof durationMs !== 'number' || !Number.isFinite(durationMs) ||
      durationMs < 0 || durationMs > 86_400_000) {
    return new Response(null, { status: 400 });
  }
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT) {
    recordStartupDuration(milestone, durationMs);
  }
  return new Response(null, { status: 204 });
}

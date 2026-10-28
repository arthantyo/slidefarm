import { analyticsEvents } from '@/lib/analytics/events';
import { recordAnalyticsEvent } from '@/lib/analytics/server-counter';

export const runtime = 'nodejs';

const pages = new Set(['dashboard', 'editor', 'workflow_new', 'workflow_media', 'workflow_editor', 'workflows', 'account', 'accounts', 'images', 'media', 'settings', 'other']);
const sources = new Set(['blank', 'template']);
const formats = new Set(['png', 'jpg', 'pdf', 'zip', 'json']);

export async function POST(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return new Response(null, { status: 415 });
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 512) return new Response(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return new Response(null, { status: 400 });
  const { event, page, source, format } = body as Record<string, unknown>;
  if (!analyticsEvents.includes(event as (typeof analyticsEvents)[number]) ||
      (page !== undefined && (typeof page !== 'string' || !pages.has(page))) ||
      (source !== undefined && (typeof source !== 'string' || !sources.has(source))) ||
      (format !== undefined && (typeof format !== 'string' || !formats.has(format))) ||
      (event === 'page_view' && page === undefined) ||
      (event === 'project_created' && source === undefined) ||
      (event === 'project_exported' && format === undefined)) {
    return new Response(null, { status: 400 });
  }

  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT) {
    recordAnalyticsEvent({
      'event.name': event as string,
      ...(page ? { 'app.page': page as string } : {}),
      ...(source ? { 'app.source': source as string } : {}),
      ...(format ? { 'app.format': format as string } : {}),
    });
  }
  return new Response(null, { status: 204 });
}

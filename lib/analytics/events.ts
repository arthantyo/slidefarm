export const analyticsEvents = [
  'page_view',
  'project_created',
  'ai_generation_completed',
  'project_exported',
] as const;

export type AnalyticsEvent = (typeof analyticsEvents)[number];
export type AnalyticsAttributes = {
  page?: string;
  source?: 'blank' | 'template';
  format?: 'png' | 'jpg' | 'pdf' | 'zip' | 'json';
};

export function trackEvent(event: AnalyticsEvent, attributes: AnalyticsAttributes = {}) {
  if (typeof window === 'undefined') return;
  try {
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...attributes }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never interrupt an editor action.
  }
}

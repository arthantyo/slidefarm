import type { Counter, Histogram } from '@opentelemetry/api';

const counterKey = Symbol.for('slidefarm.analytics.counter');
const startupKey = Symbol.for('slidefarm.startup.histogram');

export function setAnalyticsCounter(counter: Counter) {
  (globalThis as unknown as Record<symbol, Counter>)[counterKey] = counter;
}

export function recordAnalyticsEvent(attributes: Record<string, string>) {
  (globalThis as unknown as Record<symbol, Counter | undefined>)[counterKey]?.add(1, attributes);
}

export function setStartupHistogram(histogram: Histogram) {
  (globalThis as unknown as Record<symbol, Histogram>)[startupKey] = histogram;
}

export function recordStartupDuration(milestone: string, durationMs: number) {
  (globalThis as unknown as Record<symbol, Histogram | undefined>)[startupKey]?.record(durationMs, {
    'startup.milestone': milestone,
  });
}

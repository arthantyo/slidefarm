import { setAnalyticsCounter, setStartupHistogram } from './lib/analytics/server-counter';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const tracesEnabled = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
  const metricsEnabled = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT);
  if (!tracesEnabled && !metricsEnabled) return;

  const [
    { metrics },
    { MeterProvider, PeriodicExportingMetricReader },
    { NodeTracerProvider },
    { BatchSpanProcessor },
    { OTLPMetricExporter },
    { OTLPTraceExporter },
    { resourceFromAttributes },
  ] = await Promise.all([
    import('@opentelemetry/api'),
    import('@opentelemetry/sdk-metrics'),
    import('@opentelemetry/sdk-trace-node'),
    import('@opentelemetry/sdk-trace-base'),
    import('@opentelemetry/exporter-metrics-otlp-proto'),
    import('@opentelemetry/exporter-trace-otlp-proto'),
    import('@opentelemetry/resources'),
  ]);

  const resource = resourceFromAttributes({ 'service.name': process.env.OTEL_SERVICE_NAME || 'slidefarm' });
  const configuredInterval = Number(process.env.OTEL_METRIC_EXPORT_INTERVAL);
  const metricExportInterval = Number.isInteger(configuredInterval) && configuredInterval > 0
    ? configuredInterval
    : 60000;
  const tracerProvider = tracesEnabled ? new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  }) : null;
  tracerProvider?.register();
  const meterProvider = metricsEnabled ? new MeterProvider({
    resource,
    readers: [new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: metricExportInterval,
    })],
  }) : null;
  if (meterProvider) {
    metrics.setGlobalMeterProvider(meterProvider);
    setAnalyticsCounter(meterProvider.getMeter('slidefarm.analytics').createCounter('slidefarm.user_actions', {
      description: 'Counts page views and completed user actions',
    }));
    setStartupHistogram(meterProvider.getMeter('slidefarm.desktop').createHistogram('slidefarm.desktop.startup.duration', {
      description: 'Elapsed time from Electron main process entry to each startup milestone',
      unit: 'ms',
    }));
  }
  process.once('SIGTERM', () => {
    void Promise.all([tracerProvider?.shutdown(), meterProvider?.shutdown()]);
  });
}

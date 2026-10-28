import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const serverEntry = resolve(process.env.SLIDEFARM_TEST_BUILD_DIR || '.next', 'standalone/server.js');
const dataDirectory = await mkdtemp(join(tmpdir(), 'slidefarm-integration-'));
const port = await new Promise((resolvePort, reject) => {
  const listener = createServer();
  listener.once('error', reject);
  listener.listen(0, '127.0.0.1', () => {
    const address = listener.address();
    listener.close(() => resolvePort(address.port));
  });
});
const origin = `http://127.0.0.1:${port}`;
const telemetryRequests = [];
const collector = createHttpServer((request, response) => {
  const chunks = [];
  request.on('data', (chunk) => { chunks.push(chunk); });
  request.on('end', () => {
    const body = Buffer.concat(chunks);
    telemetryRequests.push({
      path: request.url,
      authorization: request.headers.authorization,
      contentType: request.headers['content-type'],
      bytes: body.length,
      metricNames: body.toString('utf8'),
    });
    response.writeHead(200, { 'Content-Type': 'application/x-protobuf' });
    response.end();
  });
});
await new Promise((resolveListen, reject) => {
  collector.once('error', reject);
  collector.listen(0, '127.0.0.1', resolveListen);
});
const collectorPort = collector.address().port;
let serverOutput = '';
const server = spawn(process.execPath, [serverEntry], {
  cwd: dirname(serverEntry),
  env: {
    ...process.env,
    HOSTNAME: '127.0.0.1',
    PORT: String(port),
    SLIDEFARM_DATA_DIR: dataDirectory,
    OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${collectorPort}/otlp`,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: '',
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: '',
    OTEL_EXPORTER_OTLP_HEADERS: 'Authorization=Basic%20test-credentials',
    OTEL_METRIC_EXPORT_INTERVAL: '1000',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
for (const stream of [server.stdout, server.stderr]) {
  stream.on('data', (chunk) => {
    serverOutput = (serverOutput + chunk.toString()).slice(-8000);
  });
}

async function request(path, options) {
  const response = await fetch(`${origin}${path}`, options);
  return response;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) break;
    try {
      const response = await request('/');
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // Wait for the standalone server to bind its port.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  assert.ok(ready, `Standalone server did not start.\n${serverOutput}`);

  const empty = await request('/api/projects');
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), { exists: false, projects: [], folders: [] });

  const saved = await request('/api/projects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects: [{ id: 'integration-project', slides: [] }], folders: [] }),
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).ok, true);

  const loaded = await request('/api/projects');
  assert.equal(loaded.status, 200);
  assert.deepEqual((await loaded.json()).projects.map((project) => project.id), ['integration-project']);

  const invalid = await request('/api/projects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects: [{ id: 'missing-slides' }], folders: [] }),
  });
  assert.equal(invalid.status, 400);

  const analytics = await request('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'page_view', page: 'dashboard' }),
  });
  assert.equal(analytics.status, 204);

  const startup = await request('/api/desktop-startup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestone: 'dashboard_interactive', durationMs: 1250.5 }),
  });
  assert.equal(startup.status, 204);

  let exportedMetric;
  for (let attempt = 0; attempt < 20; attempt++) {
    exportedMetric = telemetryRequests.find((request) => request.path === '/otlp/v1/metrics');
    if (exportedMetric) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  assert.ok(exportedMetric, `Metric was not exported. Requests: ${JSON.stringify(telemetryRequests)}\n${serverOutput}`);
  assert.equal(exportedMetric.authorization, 'Basic test-credentials');
  assert.match(exportedMetric.contentType, /application\/x-protobuf/);
  assert.ok(exportedMetric.bytes > 0);
  assert.match(exportedMetric.metricNames, /slidefarm\.user_actions/);
  assert.match(exportedMetric.metricNames, /slidefarm\.desktop\.startup\.duration/);

  console.log('Standalone server integration checks passed.');
} finally {
  const exited = server.exitCode === null ? once(server, 'exit') : Promise.resolve();
  server.kill();
  let timeout;
  await Promise.race([exited, new Promise((resolveWait) => {
    timeout = setTimeout(resolveWait, 5000);
  })]);
  clearTimeout(timeout);
  await new Promise((resolveClose) => collector.close(resolveClose));
  await rm(dataDirectory, { recursive: true, force: true });
}

import 'server-only';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './project-files';

export interface AiUsageEntry {
  id: string;
  timestamp: number;
  feature: string;
  model: string;
  kind: 'text' | 'image';
  status: 'succeeded' | 'failed';
  inputTokens?: number;
  outputTokens?: number;
}

const usageFile = () => join(dataDirectory(), 'ai-usage.jsonl');

async function recordUsage(entry: Omit<AiUsageEntry, 'id' | 'timestamp'>) {
  await mkdir(dataDirectory(), { recursive: true });
  await appendFile(usageFile(), `${JSON.stringify({ id: randomUUID(), timestamp: Date.now(), ...entry })}\n`, 'utf8');
}

export async function readAiUsage(): Promise<AiUsageEntry[]> {
  try {
    const contents = await readFile(usageFile(), 'utf8');
    return contents.split('\n').filter(Boolean).map((line) => JSON.parse(line) as AiUsageEntry).reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function trackedOpenAiFetch(
  feature: string,
  kind: AiUsageEntry['kind'],
  url: string,
  init: RequestInit,
): Promise<Response> {
  const body = typeof init.body === 'string' ? JSON.parse(init.body) as { model?: string } : {};
  const model = body.model || 'unknown';
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    await recordUsage({ feature, model, kind, status: 'failed' }).catch(() => {});
    throw error;
  }
  try {
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    if (response.ok && kind === 'text') {
      const result = await response.clone().json().catch(() => null) as {
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      } | null;
      inputTokens = result?.usage?.prompt_tokens;
      outputTokens = result?.usage?.completion_tokens;
    }
    await recordUsage({ feature, model, kind, status: response.ok ? 'succeeded' : 'failed', inputTokens, outputTokens });
  } catch { /* Usage logging must not interrupt the AI request. */ }
  return response;
}

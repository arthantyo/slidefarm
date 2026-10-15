import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Template, Workflow } from '@/types';
import { dataDirectory } from './project-files';
import { effectiveImageModel } from './image-model-settings';
import { extractPlaceholderKeys } from '@/lib/canvas/template-filler';
import { parseSourceJson, sourceToTemplateData } from '@/lib/workflows/data';

export interface WorkflowJob {
  id: string;
  workflow: Workflow;
  template: Template;
  imageModel?: string;
  status: 'queued' | 'running' | 'ready' | 'complete' | 'failed';
  data?: Record<string, string | string[]>;
  images?: Record<string, string>;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const directory = () => join(dataDirectory(), 'workflow-jobs');
const file = (id: string) => join(directory(), `${id}.json`);
let draining = false;

export async function readWorkflowJob(id: string): Promise<WorkflowJob | null> {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  try { return JSON.parse(await readFile(file(id), 'utf8')) as WorkflowJob; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

async function writeJob(job: WorkflowJob) {
  await mkdir(directory(), { recursive: true });
  const temporary = `${file(job.id)}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ ...job, updatedAt: Date.now() }), 'utf8');
  await rename(temporary, file(job.id));
}

export async function enqueueWorkflow(workflow: Workflow, template: Template) {
  const now = Date.now();
  const job: WorkflowJob = { id: randomUUID(), workflow, template, imageModel: await effectiveImageModel(), status: 'queued', createdAt: now, updatedAt: now };
  await writeJob(job);
  void drain();
  return job;
}

export async function completeWorkflowJob(id: string) {
  const job = await readWorkflowJob(id);
  if (!job || job.status !== 'ready') return false;
  await writeJob({ ...job, status: 'complete' });
  return true;
}

export function resumeWorkflowJobs() { void drain(); }

async function drain() {
  if (draining) return;
  draining = true;
  try {
    await mkdir(directory(), { recursive: true });
    const names = (await readdir(directory())).filter((name) => /^[a-f0-9-]{36}\.json$/.test(name));
    for (const name of names) {
      const job = await readWorkflowJob(name.slice(0, -5));
      if (!job || (job.status !== 'queued' && job.status !== 'running')) continue;
      await writeJob({ ...job, status: 'running' });
      try {
        const { data, images } = await generate(job);
        await writeJob({ ...job, status: 'ready', data, images });
      } catch (error) {
        await writeJob({ ...job, status: 'failed', error: error instanceof Error ? error.message : 'Workflow failed.' });
      }
    }
  } finally { draining = false; }
}

async function openAI(path: string, body: unknown) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured.');
  const response = await fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body),
  });
  const result = await response.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }>; data?: Array<{ b64_json?: string }> };
  if (!response.ok) throw new Error(result.error?.message || `AI request failed (${response.status}).`);
  return result;
}

async function generate(job: WorkflowJob) {
  const { workflow, template } = job;
  const source = parseSourceJson(workflow.sourceJson);
  const keys = extractPlaceholderKeys(template.slides);
  const subjectKeys = Array.from(new Set(template.slides.flatMap((slide) => slide.elements.flatMap((element) =>
    element.type === 'image' && element.placeholder && (element.usePlaceholderAsSubject ?? Boolean(element.aiPlaceholderPrompt?.trim())) ? [element.placeholder] : []))));
  let data = sourceToTemplateData(source);
  if (workflow.sourceType === 'ai') {
    if (!workflow.systemPrompt.trim() || !keys.length) throw new Error('Enter an AI prompt and choose a template with placeholders.');
    const result = await openAI('chat/completions', {
      model: workflow.model || process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.7, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${workflow.systemPrompt}\n\nReturn only a JSON object with exactly these template placeholder keys: ${JSON.stringify(keys)}. Each value must be a string or an array of strings. Use the source data as input. Do not add other keys. For these AI image placeholder keys, provide only the subject: ${JSON.stringify(subjectKeys)}.` },
        { role: 'user', content: JSON.stringify(source) },
      ],
    });
    const generated = JSON.parse(result.choices?.[0]?.message?.content || 'null') as Record<string, unknown> | null;
    if (!generated || typeof generated !== 'object' || Array.isArray(generated)) throw new Error('AI returned invalid JSON.');
    data = {};
    for (const key of keys) {
      const value = generated[key];
      if (typeof value === 'string' || (Array.isArray(value) && value.every((part) => typeof part === 'string'))) data[key] = value as string | string[];
      else throw new Error(`AI did not provide text for ${key}.`);
    }
    const sourceData = sourceToTemplateData(source);
    for (const slide of template.slides) for (const element of slide.elements) {
      if (element.type !== 'image' || !element.placeholder || subjectKeys.includes(element.placeholder)) continue;
      const value = sourceData[element.placeholder];
      if (!value || (Array.isArray(value) ? value.some((part) => !part.trim()) : !value.trim())) throw new Error(`Enter an image URL or data URL for ${element.placeholder} in Input JSON.`);
      data[element.placeholder] = value;
    }
  }
  if (keys.some((key) => !(key in data))) throw new Error(`Missing template values: ${keys.filter((key) => !(key in data)).join(', ')}`);
  const images: Record<string, string> = {};
  const occurrences = new Map<string, number>();
  for (let slideIndex = 0; slideIndex < template.slides.length; slideIndex++) {
    for (let elementIndex = 0; elementIndex < template.slides[slideIndex].elements.length; elementIndex++) {
      const element = template.slides[slideIndex].elements[elementIndex];
      if (element.type !== 'image' || !element.placeholder || !(element.usePlaceholderAsSubject ?? Boolean(element.aiPlaceholderPrompt?.trim()))) continue;
      if (!element.aiPlaceholderPrompt?.trim()) throw new Error(`Set an AI image base prompt for ${element.placeholder}.`);
      const index = occurrences.get(element.placeholder) ?? 0;
      occurrences.set(element.placeholder, index + 1);
      const value = data[element.placeholder];
      const subject = (Array.isArray(value) ? value[index] : value)?.trim();
      if (!subject) throw new Error(`Missing image subject for ${element.placeholder}.`);
      const prompt = `${element.aiPlaceholderPrompt.trim()} ${subject}`;
      const ratio = element.width / element.height;
      const result = await openAI('images/generations', {
        model: job.imageModel || await effectiveImageModel(), prompt: `${prompt}\nCreate an image without text, letters, or watermarks.`,
        size: ratio > 1.2 ? '1536x1024' : ratio < 0.8 ? '1024x1536' : '1024x1024', quality: 'medium', background: 'auto', output_format: 'webp', n: 1,
      });
      if (!result.data?.[0]?.b64_json) throw new Error(`Could not generate image for ${element.placeholder}.`);
      images[`${slideIndex}:${elementIndex}`] = `data:image/webp;base64,${result.data[0].b64_json}`;
    }
  }
  return { data, images };
}

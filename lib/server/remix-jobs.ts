import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ImageElement, Project } from '@/types';
import type { RemixRequest } from '@/lib/ai/remix-types';
import { generateRemix } from '@/lib/ai/remix';
import { describeImageStyle } from '@/lib/ai/image-style';
import { assembleRemixedProject } from '@/lib/ai/assembly';
import { dataDirectory, readProjectFile } from './project-files';
import { effectiveImageModel } from './image-model-settings';

export interface RemixJob {
  id: string;
  sourceProjectId: string;
  request: RemixRequest;
  imageModel?: string;
  status: 'queued' | 'running' | 'ready' | 'failed' | 'complete';
  project?: Project;
  error?: string;
  createdAt: number;
}

const directory = () => join(dataDirectory(), 'remix-jobs');
const file = (id: string) => join(directory(), `${id}.json`);
const keys = new Map<string, string>();
let draining = false;

async function writeJob(job: RemixJob) {
  await mkdir(directory(), { recursive: true });
  const temporary = `${file(job.id)}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(job), 'utf8');
  await rename(temporary, file(job.id));
}

export async function readRemixJobs(): Promise<RemixJob[]> {
  await mkdir(directory(), { recursive: true });
  const names = (await readdir(directory())).filter((name) => /^[a-f0-9-]{36}\.json$/.test(name));
  return Promise.all(names.map(async (name) => JSON.parse(await readFile(join(directory(), name), 'utf8')) as RemixJob));
}

export async function enqueueRemix(sourceProjectId: string, request: RemixRequest, userKey?: string) {
  const job: RemixJob = { id: randomUUID(), sourceProjectId, request, imageModel: await effectiveImageModel(), status: 'queued', createdAt: Date.now() };
  if (userKey) keys.set(job.id, userKey);
  await writeJob(job);
  void drain();
  return job;
}

export async function completeRemix(id: string) {
  const job = (await readRemixJobs()).find((item) => item.id === id);
  if (!job || (job.status !== 'ready' && job.status !== 'failed')) return false;
  await writeJob({ ...job, status: 'complete', project: undefined });
  return true;
}

export function resumeRemixJobs() { void drain(); }

async function generateImage(prompt: string, sourceImage: string, width: number, height: number, apiKey: string, model: string): Promise<string> {
  const style = await describeImageStyle(sourceImage, apiKey);
  const ratio = width / height;
  const size = ratio > 1.2 ? '1536x1024' : ratio < 0.8 ? '1024x1536' : '1024x1024';
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: `Create an image of: ${prompt}\n\nVisual style: ${style}\n\nDepict the remixed subject clearly. Use the style description only for its visual treatment, not its original subject. No text, letters, or watermarks.`, size, quality: 'medium', background: 'auto', output_format: 'webp', n: 1 }),
  });
  const result = await response.json() as { data?: { b64_json?: string }[]; error?: { message?: string } };
  if (!response.ok || !result.data?.[0]?.b64_json) throw new Error(result.error?.message || `Image generation failed (${response.status}).`);
  return `data:image/webp;base64,${result.data[0].b64_json}`;
}

async function run(job: RemixJob) {
  const apiKey = keys.get(job.id) || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
  const source = (await readProjectFile())?.projects.find((item) => item.id === job.sourceProjectId);
  if (!source) throw new Error('The source project is no longer available.');
  const request: RemixRequest = {
    ...job.request,
    source: {
      ...job.request.source,
      slides: job.request.source.slides.map((slide, index) => ({
        ...slide,
        images: source.slides[index].elements.flatMap((image) => image.type === 'image' ? [{ name: image.name, description: image.imagePrompt, x: image.x, y: image.y, width: image.width, height: image.height }] : []),
      })),
    },
  };
  const remix = await generateRemix(request, apiKey);
  const imageModel = job.imageModel || await effectiveImageModel();
  const imageSources: string[][] = [];
  for (let slideIndex = 0; slideIndex < source.slides.length; slideIndex++) {
    const images = source.slides[slideIndex].elements.filter((element): element is ImageElement => element.type === 'image');
    const prompts = remix.slides[slideIndex].imagePrompts;
    const sources: string[] = [];
    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      if (!prompts[imageIndex]) { sources.push(images[imageIndex].src); continue; }
      try {
        sources.push(await generateImage(prompts[imageIndex], images[imageIndex].src, images[imageIndex].width, images[imageIndex].height, apiKey, imageModel));
      } catch (error) {
        throw new Error(`Could not remix image ${imageIndex + 1} on slide ${slideIndex + 1}: ${error instanceof Error ? error.message : 'Image generation failed.'}`);
      }
    }
    imageSources.push(sources);
  }
  return assembleRemixedProject(remix, source, imageSources);
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    for (const job of await readRemixJobs()) {
      if (job.status !== 'queued' && job.status !== 'running') continue;
      await writeJob({ ...job, status: 'running' });
      try { await writeJob({ ...job, status: 'ready', project: await run(job) }); }
      catch (error) { await writeJob({ ...job, status: 'failed', error: error instanceof Error ? error.message : 'Remix failed.' }); }
      finally { keys.delete(job.id); }
    }
  } finally { draining = false; }
}

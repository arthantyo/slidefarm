import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { RemixRequest } from '@/lib/ai/remix-types';
import { completeRemix, enqueueRemix, readRemixJobs, resumeRemixJobs } from '@/lib/server/remix-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const local = (req: NextRequest) => ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);
const requestSchema = z.object({
  sourceProjectId: z.string().min(1),
  request: z.object({
    source: z.object({ name: z.string(), slides: z.array(z.unknown()).min(1) }),
    instruction: z.string().trim().min(3).max(2000),
    model: z.string().trim().min(1).max(100).optional(),
    tone: z.enum(['educational', 'casual', 'professional', 'persuasive', 'inspirational']),
    density: z.enum(['concise', 'balanced', 'detailed']),
    language: z.string().max(100),
    customInstructions: z.string().max(2000).optional(),
  }),
});

export async function GET(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  resumeRemixJobs();
  try { return NextResponse.json({ jobs: (await readRemixJobs()).filter((job) => job.status !== 'complete') }); }
  catch { return NextResponse.json({ error: 'Could not load remix jobs.' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid remix job.' }, { status: 400 });
  try {
    const job = await enqueueRemix(parsed.data.sourceProjectId, parsed.data.request as RemixRequest, req.headers.get('x-openai-api-key') || undefined);
    return NextResponse.json({ jobId: job.id });
  } catch { return NextResponse.json({ error: 'Could not queue remix.' }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !await completeRemix(parsed.data.id)) return NextResponse.json({ error: 'Remix job not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

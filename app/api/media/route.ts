import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { WorkflowMedia } from '@/types';
import { readWorkflowMedia, saveWorkflowMedia } from '@/lib/server/workflow-media-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const local = (req: NextRequest) => ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);

export async function GET(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try { return NextResponse.json({ media: await readWorkflowMedia() }); }
  catch { return NextResponse.json({ error: 'Could not load media' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    const form = await req.formData();
    const output = form.get('output');
    const preview = form.get('preview');
    const workflowId = form.get('workflowId');
    const workflowName = form.get('workflowName');
    const projectName = form.get('projectName');
    const format = form.get('format');
    if (!(output instanceof File) || !(preview instanceof File) ||
      typeof workflowId !== 'string' || typeof workflowName !== 'string' || typeof projectName !== 'string' ||
      !['zip', 'pdf', 'png', 'jpg'].includes(String(format)) ||
      output.size > 100 * 1024 * 1024 || preview.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Invalid media upload' }, { status: 400 });
    }
    const item: WorkflowMedia = {
      id: randomUUID(), workflowId, workflowName, projectName,
      format: format as WorkflowMedia['format'], createdAt: Date.now(),
    };
    await saveWorkflowMedia(item, Buffer.from(await output.arrayBuffer()), Buffer.from(await preview.arrayBuffer()));
    return NextResponse.json({ media: item });
  } catch { return NextResponse.json({ error: 'Could not save media' }, { status: 500 }); }
}

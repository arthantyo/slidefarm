import { NextRequest, NextResponse } from 'next/server';
import { completeWorkflowJob, readWorkflowJob, resumeWorkflowJobs } from '@/lib/server/workflow-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const local = (req: NextRequest) => ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    resumeWorkflowJobs();
    const job = await readWorkflowJob(params.id);
    return job ? NextResponse.json({ job }) : NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  } catch { return NextResponse.json({ error: 'Could not load job.' }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    return await completeWorkflowJob(params.id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Job is not ready.' }, { status: 409 });
  } catch { return NextResponse.json({ error: 'Could not complete job.' }, { status: 500 }); }
}

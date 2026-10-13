import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Template, Workflow } from '@/types';
import { enqueueWorkflow } from '@/lib/server/workflow-jobs';
import { reachableNodes, workflowConnections } from '@/lib/workflows/graph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  const parsed = z.object({ workflow: z.object({ id: z.string(), name: z.string(), templateId: z.string(), sourceType: z.enum(['json', 'ai']), sourceJson: z.string(), systemPrompt: z.string() }).passthrough(), template: z.object({ id: z.string(), slides: z.array(z.unknown()).min(1) }).passthrough() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid workflow job.' }, { status: 400 });
  const workflow = parsed.data.workflow as unknown as Workflow;
  const template = parsed.data.template as unknown as Template;
  const reachable = reachableNodes(workflow);
  if (!workflow.name.trim() || workflow.templateId !== template.id || !reachable.has('template') || !workflowConnections(workflow).some((edge) => edge.from === 'source' && edge.to === 'template')) return NextResponse.json({ error: 'Connect Source to a valid template.' }, { status: 400 });
  try {
    const job = await enqueueWorkflow(workflow, template);
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch { return NextResponse.json({ error: 'Could not queue workflow.' }, { status: 500 }); }
}

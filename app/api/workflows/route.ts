import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readWorkflows, writeWorkflows } from '@/lib/server/workflow-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nodeIdSchema = z.union([z.enum(['source', 'template', 'project', 'export', 'draft', 'post']), z.custom<`export:${string}`>((value) => typeof value === 'string' && /^export:.+/.test(value))]);
const workflowSchema = z.object({
  id: z.string().min(1), name: z.string().min(1),
  nodes: z.array(nodeIdSchema).optional(),
  nodePositions: z.record(z.object({ x: z.number(), y: z.number() })).optional(),
  connections: z.array(z.object({ from: nodeIdSchema, to: nodeIdSchema })).optional(),
  exportFormats: z.record(z.enum(['zip', 'pdf', 'png', 'jpg'])).optional(),
  tiktok: z.record(z.object({ openId: z.string(), title: z.string(), description: z.string(), privacyLevel: z.string(), isAigc: z.boolean(), uploadConsent: z.boolean() })).optional(),
  projectFolderId: z.string().nullable().optional(),
  pendingProjectId: z.string().nullable().optional(),
  sourceType: z.enum(['json', 'ai']), sourceJson: z.string(),
  systemPrompt: z.string(), model: z.string().trim().min(1).max(100).optional(), templateId: z.string(),
  exportFormat: z.enum(['zip', 'pdf', 'png', 'jpg']),
  createdAt: z.number(), updatedAt: z.number(),
});
const local = (req: NextRequest) => ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);

export async function GET(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try { return NextResponse.json({ workflows: await readWorkflows() }); }
  catch { return NextResponse.json({ error: 'Could not load workflows' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  if (!local(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    const parsed = z.array(workflowSchema).safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid workflows' }, { status: 400 });
    await writeWorkflows(parsed.data);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Could not save workflows' }, { status: 500 }); }
}

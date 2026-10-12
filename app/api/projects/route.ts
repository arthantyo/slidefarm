import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readProjectFile, writeProjectFile } from '@/lib/server/project-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const payloadSchema = z.object({
  projects: z.array(z.object({ id: z.string(), slides: z.array(z.unknown()) }).passthrough()),
  folders: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
});

function localRequest(req: NextRequest) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname);
}

export async function GET(req: NextRequest) {
  if (!localRequest(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    const data = await readProjectFile();
    return NextResponse.json({ exists: data !== null, projects: data?.projects ?? [], folders: data?.folders ?? [] });
  } catch {
    return NextResponse.json({ error: 'Could not read local projects' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!localRequest(req)) return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  try {
    const body: unknown = await req.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid project data' }, { status: 400 });
    await writeProjectFile(body as Parameters<typeof writeProjectFile>[0]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save local projects' }, { status: 500 });
  }
}

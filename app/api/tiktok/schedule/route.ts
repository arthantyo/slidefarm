import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { local } from '@/lib/server/tiktok';
import { cancelScheduledPost, createScheduledPost, listScheduledPosts, retryFailedPost, scheduleInputSchema, startScheduleRunner, updateScheduledPost } from '@/lib/server/tiktok-schedule';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  try {
    startScheduleRunner();
    return NextResponse.json({ posts: await listScheduledPosts(req.nextUrl.searchParams.get('openId') || undefined) });
  } catch { return NextResponse.json({ error: 'Could not load scheduled posts.' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const parsed = scheduleInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid scheduled post.' }, { status: 400 });
  try { return NextResponse.json({ post: await createScheduledPost(parsed.data) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not schedule post.' }, { status: 400 }); }
}

export async function PATCH(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const body: unknown = await req.json().catch(() => null);
  if (body && typeof body === 'object' && 'action' in body && body.action === 'retry') {
    const retry = z.object({ action: z.literal('retry'), id: z.string().uuid(), calendarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(body);
    if (!retry.success) return NextResponse.json({ error: 'Invalid retry request.' }, { status: 400 });
    try {
      const post = await retryFailedPost(retry.data.id, retry.data.calendarDate);
      return post ? NextResponse.json({ post }) : NextResponse.json({ error: 'Only failed posts can be retried.' }, { status: 409 });
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not retry post.' }, { status: 400 }); }
  }
  const parsed = scheduleInputSchema.extend({ id: z.string().uuid() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid scheduled post.' }, { status: 400 });
  const { id, ...input } = parsed.data;
  try {
    const post = await updateScheduledPost(id, input);
    return post ? NextResponse.json({ post }) : NextResponse.json({ error: 'Only upcoming posts can be edited.' }, { status: 409 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update post.' }, { status: 400 }); }
}

export async function DELETE(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid scheduled post.' }, { status: 400 });
  try {
    return await cancelScheduledPost(parsed.data.id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Only upcoming posts can be canceled.' }, { status: 409 });
  } catch { return NextResponse.json({ error: 'Could not cancel post.' }, { status: 500 }); }
}

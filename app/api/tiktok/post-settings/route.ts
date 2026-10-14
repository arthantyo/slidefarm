import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { local, readAccounts } from '@/lib/server/tiktok';
import { readPostTimes, writePostTimes } from '@/lib/server/tiktok-post-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inputSchema = z.object({
  openId: z.string().min(1),
  times: z.tuple([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]),
});

export async function GET(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const openId = req.nextUrl.searchParams.get('openId');
  if (!openId) return NextResponse.json({ error: 'Select an account.' }, { status: 400 });
  try {
    if (!(await readAccounts()).some((account) => account.openId === openId)) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    return NextResponse.json({ times: await readPostTimes(openId) });
  } catch { return NextResponse.json({ error: 'Could not load posting times.' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter two valid posting times.' }, { status: 400 });
  try {
    if (!(await readAccounts()).some((account) => account.openId === parsed.data.openId)) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    await writePostTimes(parsed.data.openId, parsed.data.times);
    return NextResponse.json({ times: parsed.data.times });
  } catch { return NextResponse.json({ error: 'Could not save posting times.' }, { status: 500 }); }
}

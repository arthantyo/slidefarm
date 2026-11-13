import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { local } from '@/lib/server/tiktok';
import { readR2Settings, removeR2Settings, validateR2Settings, writeR2Settings } from '@/lib/server/r2-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({
  accountId: z.string().trim().max(32),
  bucket: z.string().trim().max(63),
  accessKeyId: z.string().trim().max(128),
  secretAccessKey: z.string().max(256),
  publicOrigin: z.string().trim().max(2048),
});

function publicSettings(settings: Awaited<ReturnType<typeof readR2Settings>>) {
  return {
    accountId: settings.accountId,
    bucket: settings.bucket,
    publicOrigin: settings.publicOrigin,
    hasAccessKey: Boolean(settings.accessKeyId),
    hasSecret: Boolean(settings.secretAccessKey),
    configured: validateR2Settings(settings) === null,
  };
}

export async function GET(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  try {
    return NextResponse.json(publicSettings(await readR2Settings()));
  } catch {
    return NextResponse.json({ error: 'Could not load R2 settings.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter valid R2 settings.' }, { status: 400 });
  try {
    const previous = await readR2Settings();
    const settings = {
      accountId: parsed.data.accountId,
      bucket: parsed.data.bucket,
      accessKeyId: parsed.data.accessKeyId || previous.accessKeyId,
      secretAccessKey: parsed.data.secretAccessKey.trim() || previous.secretAccessKey,
      publicOrigin: parsed.data.publicOrigin,
    };
    const error = validateR2Settings(settings);
    if (error) return NextResponse.json({ error }, { status: 400 });
    await writeR2Settings(settings);
    return NextResponse.json(publicSettings(settings));
  } catch {
    return NextResponse.json({ error: 'Could not save R2 settings.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!local(req.nextUrl.hostname)) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  try {
    await removeR2Settings();
    return NextResponse.json(publicSettings(await readR2Settings()));
  } catch {
    return NextResponse.json({ error: 'Could not reset R2 settings.' }, { status: 500 });
  }
}

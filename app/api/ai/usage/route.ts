import { NextResponse } from 'next/server';
import { readAiUsage } from '@/lib/server/ai-usage';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ entries: await readAiUsage() });
  } catch {
    return NextResponse.json({ error: 'Could not load AI usage.' }, { status: 500 });
  }
}

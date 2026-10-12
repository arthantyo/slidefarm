import { NextRequest, NextResponse } from 'next/server';
import type { GenerationOptions } from '@/types';
import { generatePlan } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerationOptions;

    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length < 3) {
      return NextResponse.json({ error: 'A valid prompt is required (min 3 characters)' }, { status: 400 });
    }

    const plan = await generatePlan(body);
    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

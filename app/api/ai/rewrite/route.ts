import { NextRequest, NextResponse } from 'next/server';
import { rewriteText } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { text, instruction } = await req.json() as { text: string; instruction: string };

    if (!text || !instruction) {
      return NextResponse.json({ error: 'Text and instruction are required' }, { status: 400 });
    }

    const result = await rewriteText(text, instruction);
    return NextResponse.json({ text: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

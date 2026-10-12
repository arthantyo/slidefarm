import { NextRequest, NextResponse } from 'next/server';
import { readWorkflowMediaFile } from '@/lib/server/workflow-media-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const contentTypes = { zip: 'application/zip', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg' };

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  }
  try {
    const preview = req.nextUrl.searchParams.get('preview') === '1';
    const result = await readWorkflowMediaFile(params.id, preview ? 'preview' : 'download');
    if (!result) return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    return new NextResponse(result.data, {
      headers: {
        'Content-Type': preview ? 'image/png' : contentTypes[result.item.format],
        'Content-Disposition': preview ? 'inline' : `attachment; filename="${result.item.id}.${result.item.format}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch { return NextResponse.json({ error: 'Could not load media file' }, { status: 500 }); }
}

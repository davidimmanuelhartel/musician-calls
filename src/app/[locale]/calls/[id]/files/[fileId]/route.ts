import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { callAccess } from '@/lib/call-access';
import { supabaseAdmin } from '@/lib/supabase/server';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params;
  const headers = {
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  };
  if (
    !z.uuid().safeParse(fileId).success ||
    !(await callAccess(id, request.nextUrl.searchParams.get('invite') || undefined))
  )
    return new Response('Not found', { status: 404, headers });
  const db = supabaseAdmin();
  const { data: file } = await db
    .from('attachments')
    .select('storage_path,filename')
    .eq('id', fileId)
    .eq('call_id', id)
    .maybeSingle();
  if (!file) return new Response('Not found', { status: 404, headers });
  const { data, error } = await db.storage.from('call-pdfs').download(file.storage_path);
  if (error || !data) return new Response('Not found', { status: 404, headers });
  return new Response(data.stream(), {
    headers: {
      ...headers,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    },
  });
}

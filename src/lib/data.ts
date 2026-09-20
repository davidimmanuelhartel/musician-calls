import 'server-only';
import { configured, supabaseServer } from './supabase/server';
import type { Attachment, Call, MusicianResponse } from './domain';
export async function openCalls(): Promise<Call[]> {
  if (!configured()) return [];
  const db = await supabaseServer();
  const { data, error } = await db
    .from('calls')
    .select('*')
    .eq('status', 'open')
    .gt('event_at', new Date().toISOString())
    .order('event_at');
  if (error) throw error;
  return data as Call[];
}
export async function getCall(id: string): Promise<Call | null> {
  if (!configured() || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await supabaseServer();
  const { data, error } = await db.from('calls').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Call | null;
}
export async function getAttachments(id: string): Promise<(Attachment & { url: string })[]> {
  const db = await supabaseServer();
  const { data, error } = await db
    .from('attachments')
    .select('*')
    .eq('call_id', id)
    .order('created_at');
  if (error) throw error;
  return Promise.all(
    (data as Attachment[]).map(async (f) => {
      const { data: link, error } = await db.storage
        .from('call-pdfs')
        .createSignedUrl(f.storage_path, 3600);
      if (error) throw error;
      return { ...f, url: link!.signedUrl };
    }),
  );
}
export async function ownCalls(userId: string): Promise<Call[]> {
  const db = await supabaseServer();
  const { data, error } = await db
    .from('calls')
    .select('*')
    .eq('organizer_id', userId)
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data as Call[];
}
export async function getResponses(callIds: string[]): Promise<MusicianResponse[]> {
  if (!callIds.length) return [];
  const db = await supabaseServer();
  const { data, error } = await db
    .from('responses')
    .select('*')
    .in('call_id', callIds)
    .order('created_at');
  if (error) throw error;
  return data as MusicianResponse[];
}

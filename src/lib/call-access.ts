import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { currentUser, supabaseAdmin, supabaseServer } from './supabase/server';
import type { Call } from './domain';
export async function callAccess(id: string, token?: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const user = await currentUser();
  if (user) {
    const db = await supabaseServer();
    const { data } = await db.from('calls').select('*').eq('id', id).maybeSingle();
    if (data) return { call: data as Call, member: true, recipient: null };
  }
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = supabaseAdmin();
  const { data: invitation } = await db
    .from('call_invitations')
    .select('substitute_id')
    .eq('call_id', id)
    .eq('token_hash', createHash('sha256').update(token).digest('hex'))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!invitation) return null;
  const [{ data: call }, { data: substitute }] = await Promise.all([
    db.from('calls').select('*').eq('id', id).maybeSingle(),
    db.from('ensemble_substitutes').select('*').eq('id', invitation.substitute_id).maybeSingle(),
  ]);
  if (
    !call ||
    !substitute ||
    substitute.ensemble_id !== call.ensemble_id ||
    substitute.instrument !== call.instrument
  )
    return null;
  return {
    call: call as Call,
    member: false,
    recipient: { name: substitute.name, email: substitute.email || '', phone: substitute.phone },
  };
}
export async function privateAttachments(callId: string, locale: string, token?: string) {
  // Caller must first authorize this call via callAccess. File route authorizes each download again.
  const { data, error } = await supabaseAdmin()
    .from('attachments')
    .select('id,filename')
    .eq('call_id', callId)
    .order('created_at');
  if (error) throw error;
  return (data || []).map((file) => ({
    ...file,
    url: `/${locale}/calls/${callId}/files/${file.id}${token ? `?invite=${token}` : ''}`,
  }));
}

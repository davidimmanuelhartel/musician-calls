import 'server-only';
import { configured, supabaseServer } from './supabase/server';
import type { Call, MusicianResponse } from './domain';
export async function getCall(id: string): Promise<Call | null> {
  if (!configured() || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await supabaseServer();
  const { data, error } = await db.from('calls').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Call | null;
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

export async function myEnsembles() {
  const db = await supabaseServer();
  // RLS returns only workspaces to which the signed-in user belongs.
  const { data, error } = await db.from('ensembles').select('*').order('name');
  if (error) throw error;
  return data;
}
export async function getEnsemble(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await supabaseServer();
  const { data, error } = await db.from('ensembles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
export async function ensembleCalls(id: string): Promise<Call[]> {
  if (!(await getEnsemble(id))) return [];
  const db = await supabaseServer();
  const { data, error } = await db
    .from('calls')
    .select('*')
    .eq('ensemble_id', id)
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data as Call[];
}
export async function getRoster(id: string) {
  const db = await supabaseServer();
  const { data, error } = await db.rpc('ensemble_roster', { ensemble: id });
  if (error) throw error;
  return data;
}

export async function getSubstitutes(ensembleId: string, instrument?: string) {
  const db = await supabaseServer();
  let query = db
    .from('ensemble_substitutes')
    .select('*')
    .eq('ensemble_id', ensembleId)
    .order('name');
  if (instrument) query = query.eq('instrument', instrument);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

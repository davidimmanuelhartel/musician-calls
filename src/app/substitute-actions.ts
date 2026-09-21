'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import { substituteSchema } from '@/lib/substitutes';
import type { ActionResult } from './actions';
export async function saveSubstitute(ensembleId: string, input: unknown): Promise<ActionResult> {
  const parsed = substituteSchema.safeParse(input);
  if (!z.uuid().safeParse(ensembleId).success || !parsed.success) return { error: 'required' };
  if (!(await currentUser())) return { error: 'authError' };
  const db = await supabaseServer();
  const { data, error } = await db.rpc('save_substitute', {
    ensemble: ensembleId,
    payload: parsed.data,
  });
  if (error) return { error: 'ensembleAccess' };
  revalidatePath('/', 'layout');
  return { success: true, id: data };
}
export async function removeSubstitute(ensembleId: string, id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(ensembleId).success || !z.uuid().safeParse(id).success)
    return { error: 'required' };
  if (!(await currentUser())) return { error: 'authError' };
  const db = await supabaseServer();
  const { error } = await db.rpc('remove_substitute', { ensemble: ensembleId, substitute: id });
  if (error) return { error: 'ensembleAccess' };
  revalidatePath('/', 'layout');
  return { success: true };
}
export async function inviteSubstitute(
  callId: string,
  id: string,
): Promise<ActionResult & { token?: string }> {
  if (!z.uuid().safeParse(callId).success || !z.uuid().safeParse(id).success)
    return { error: 'required' };
  if (!(await currentUser())) return { error: 'authError' };
  const db = await supabaseServer();
  const { data, error } = await db.rpc('invite_substitute', { call_id: callId, substitute: id });
  return error ? { error: 'inviteFailed' } : { success: true, token: data };
}

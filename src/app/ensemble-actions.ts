'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ensembleSchema, joinSchema } from '@/lib/ensembles';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import type { ActionResult } from './actions';
export async function saveEnsemble(input: unknown, existingId?: string): Promise<ActionResult> {
  const parsed = ensembleSchema.safeParse(input);
  if (!parsed.success || (existingId && !z.uuid().safeParse(existingId).success))
    return { error: 'required' };
  if (!(await currentUser())) return { error: 'authError' };
  const value = parsed.data;
  const db = await supabaseServer();
  const { data, error } = await db.rpc('save_ensemble', {
    ensemble: existingId,
    payload: {
      ...value,
      description: '',
      compensation_type: 'negotiable',
      compensation_amount: null,
      currency: null,
    },
  });
  if (error)
    return {
      error:
        error.code === '23505'
          ? 'ensembleExists'
          : error.message.includes('unauthorized')
            ? 'ensembleAccess'
            : 'genericError',
    };
  revalidatePath('/', 'layout');
  return { success: true, id: data };
}
export async function createInvite(id: string): Promise<ActionResult & { token?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: 'required' };
  if (!(await currentUser())) return { error: 'authError' };
  const db = await supabaseServer();
  const { data, error } = await db.rpc('create_ensemble_invite', { ensemble: id });
  return error ? { error: 'ensembleAccess' } : { success: true, token: data };
}
export async function joinEnsemble(input: unknown): Promise<ActionResult> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { error: 'required' };
  if (!(await currentUser())) return { error: 'authError' };
  const db = await supabaseServer();
  const { data, error } = await db.rpc('join_ensemble', {
    token: parsed.data.token,
    member_name: parsed.data.name,
    member_phone: parsed.data.phone,
  });
  if (error)
    return { error: error.message.includes('invalid_invite') ? 'invalidInvite' : 'genericError' };
  revalidatePath('/', 'layout');
  return { success: true, id: data };
}
export async function removeMember(ensembleId: string, userId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(ensembleId).success || !z.uuid().safeParse(userId).success)
    return { error: 'required' };
  if (!(await currentUser())) return { error: 'authError' };
  const db = await supabaseServer();
  const { error } = await db.rpc('remove_ensemble_member', {
    ensemble: ensembleId,
    member: userId,
  });
  if (error) return { error: 'ensembleAccess' };
  revalidatePath('/', 'layout');
  return { success: true };
}

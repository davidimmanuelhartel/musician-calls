'use server';
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { callSchema, eventTimes, responseSchema, safeNext } from '@/lib/domain';
import { isLocale, type Locale } from '@/lib/i18n';
import { configured, currentUser, supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
export type ActionResult = { error?: string; success?: boolean; id?: string };
export async function sendMagicLink(
  locale: Locale,
  email: string,
  next: string,
): Promise<ActionResult> {
  if (!isLocale(locale) || !z.email().max(254).safeParse(email).success)
    return { error: 'required' };
  if (!configured() || !process.env.APP_URL) return { error: 'configuration' };
  const db = await supabaseServer();
  const target = new URL('/auth/confirm', process.env.APP_URL);
  target.searchParams.set('locale', locale);
  target.searchParams.set('next', safeNext(next, locale));
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: target.toString(), data: { locale } },
  });
  return error
    ? { error: error.status === 429 ? 'rateLimited' : 'genericError' }
    : { success: true };
}
const filesSchema = z
  .array(
    z.object({
      filename: z.string().min(1).max(200),
      storage_path: z.string().max(300),
      size: z.number().int().positive().max(20971520),
      content_type: z.literal('application/pdf'),
    }),
  )
  .max(10);
export async function publishCall(input: unknown, files: unknown): Promise<ActionResult> {
  if (!configured()) return { error: 'configuration' };
  const parsed = callSchema.safeParse(input);
  const attachments = filesSchema.safeParse(files);
  if (!parsed.success) return { error: 'required' };
  if (!attachments.success) return { error: 'fileError' };
  const user = await currentUser();
  if (!user) return { error: 'authError' };
  let times;
  try {
    times = eventTimes(parsed.data);
  } catch {
    return { error: 'pastError' };
  }
  const db = await supabaseServer();
  const v = parsed.data;
  const { data, error } = await db.rpc('publish_call', {
    payload: {
      ...v,
      ...times,
      compensation_amount: v.compensation_type === 'paid' ? Number(v.compensation_amount) : null,
      currency: v.compensation_type === 'paid' ? v.currency : null,
    },
    files: attachments.data,
  });
  if (error)
    return {
      error: error.message.includes('invalid_files')
        ? 'uploadError'
        : error.message.includes('unauthorized')
          ? 'ensembleAccess'
          : 'genericError',
    };
  revalidatePath('/', 'layout');
  return { success: true, id: data };
}
export async function submitResponse(input: unknown, inviteToken?: string): Promise<ActionResult> {
  if (!inviteToken || !/^[a-f0-9]{64}$/.test(inviteToken)) return { error: 'invalidInvitation' };
  const parsed = responseSchema.safeParse(input);
  if (!parsed.success) return { error: 'required' };
  if (!configured() || !process.env.RATE_LIMIT_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return { error: 'configuration' };
  const h = await headers();
  // Production proxy must overwrite this header; use Vercel's trusted header on Vercel.
  const ip = process.env.VERCEL
    ? h.get('x-vercel-forwarded-for')?.split(',')[0]
    : h.get('x-forwarded-for')?.split(',')[0];
  const hash = createHmac('sha256', process.env.RATE_LIMIT_SECRET)
    .update(ip?.trim() || 'local')
    .digest('hex');
  const db = supabaseAdmin();
  const { error } = await db.rpc('submit_response', {
    payload: { ...parsed.data, invite_token: inviteToken },
    ip_hash: hash,
  });
  if (error)
    return {
      error: error.message.includes('invalid_invitation')
        ? 'invalidInvitation'
        : error.code === '23505'
          ? 'duplicate'
          : error.message.includes('rate_limited')
            ? 'rateLimited'
            : error.message.includes('closed')
              ? 'closedText'
              : 'genericError',
    };
  revalidatePath('/', 'layout');
  return { success: true };
}
export async function selectMusician(callId: string, responseId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(callId).success || !z.uuid().safeParse(responseId).success)
    return { error: 'required' };
  if (!(await currentUser())) return { error: 'authError' };
  const db = await supabaseServer();
  const { error } = await db.rpc('select_musician', { call_id: callId, response_id: responseId });
  if (error) return { error: 'selectFailed' };
  revalidatePath('/', 'layout');
  return { success: true };
}
export async function signOut(locale: Locale) {
  if (!isLocale(locale)) locale = 'en';
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect(`/${locale}`);
}

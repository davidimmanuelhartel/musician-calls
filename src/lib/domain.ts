import { Temporal } from '@js-temporal/polyfill';
import { z } from 'zod';
import { instruments, type Locale, dictionary } from './i18n';
export const TIMEZONE = 'Europe/Copenhagen';
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
const optionalText = (max: number) => z.string().trim().max(max).default('');
export const callSchema = z
  .object({
    id: z.uuid(),
    ensemble_id: z.uuid(),
    instrument: z.enum(Object.keys(instruments) as [string, ...string[]]),
    position: optionalText(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    call_time: z.string().regex(/^\d{2}:\d{2}$/),
    performance_time: optionalText(5),
    venue: z.string().trim().min(1).max(200),
    address: optionalText(300),
    repertoire: optionalText(3000),
    description: optionalText(5000),
    compensation_type: z.enum(['paid', 'unpaid', 'negotiable']),
    compensation_amount: optionalText(12),
    currency: z.enum(['DKK', 'EUR', 'SEK', 'NOK', 'GBP']),
  })
  .superRefine((v, ctx) => {
    if (
      v.compensation_type === 'paid' &&
      (!/^\d+(\.\d{1,2})?$/.test(v.compensation_amount) ||
        Number(v.compensation_amount) <= 0 ||
        Number(v.compensation_amount) > 1000000)
    )
      ctx.addIssue({ code: 'custom', path: ['compensation_amount'], message: 'Invalid amount' });
  });
export const responseSchema = z.object({
  call_id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone: optionalText(40),
  message: optionalText(2000),
  availability: z.enum(['available', 'maybe']),
  website: z.string().max(0).default(''),
});
export type CallInput = z.infer<typeof callSchema>;
export type Call = {
  id: string;
  organizer_id: string;
  ensemble_id: string;
  ensemble_name: string;
  instrument: string;
  position: string | null;
  call_at: string;
  performance_at: string | null;
  event_at: string;
  timezone: string;
  venue: string;
  address: string | null;
  repertoire: string | null;
  description: string | null;
  compensation_type: 'paid' | 'unpaid' | 'negotiable';
  compensation_amount: number | null;
  currency: string | null;
  status: 'open' | 'filled';
  published_at: string;
  filled_at: string | null;
};
export type Attachment = {
  id: string;
  call_id: string;
  filename: string;
  storage_path: string;
  size: number;
  content_type: string;
};
export type MusicianResponse = {
  substitute_id: string | null;
  id: string;
  call_id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  availability: 'available' | 'maybe';
  selected: boolean;
  created_at: string;
};
export function callStatus(call: Pick<Call, 'status' | 'event_at'>, now = Date.now()) {
  return call.status === 'filled'
    ? 'filled'
    : Date.parse(call.event_at) <= now
      ? 'expired'
      : 'open';
}
export function eventTimes(
  input: Pick<CallInput, 'date' | 'call_time' | 'performance_time'>,
  now = Date.now(),
) {
  const parse = (time: string) =>
    Temporal.ZonedDateTime.from(`${input.date}T${time}[${TIMEZONE}]`, {
      disambiguation: 'reject',
    }).toInstant();
  const call = parse(input.call_time);
  const performance = input.performance_time ? parse(input.performance_time) : null;
  if (
    (performance ?? call).epochMilliseconds <= now ||
    (performance && Temporal.Instant.compare(performance, call) < 0)
  )
    throw new Error('pastError');
  return { call_at: call.toString(), performance_at: performance?.toString() ?? null };
}
export function dateLabel(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'da' ? 'da-DK' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(new Date(value));
}
export function timeLabel(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'da' ? 'da-DK' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIMEZONE,
  }).format(new Date(value));
}
export function feeLabel(
  call: Pick<Call, 'compensation_type' | 'compensation_amount' | 'currency'>,
  locale: Locale,
) {
  return call.compensation_type === 'paid'
    ? `${new Intl.NumberFormat(locale === 'da' ? 'da-DK' : 'en-GB').format(call.compensation_amount ?? 0)} ${call.currency}`
    : dictionary(locale)[call.compensation_type];
}
export function safeNext(next: string | null, locale: Locale) {
  const fallback = `/${locale}/ensembles`;
  if (typeof next !== 'string' || !next.startsWith(`/${locale}/`) || next.includes('\\'))
    return fallback;
  const url = new URL(next, 'https://tutti.invalid');
  if (url.hash) return fallback;
  const id = '[0-9a-f-]{36}';
  const route = new RegExp(
    `^/${locale}/(?:ensembles(?:/new|/${id}(?:/edit)?)?|join/[a-f0-9]{64}|dashboard(?:/${id})?)$`,
  );
  if (route.test(url.pathname) && !url.search) return next;
  if (
    url.pathname === `/${locale}/calls/new` &&
    url.searchParams.size === 1 &&
    z.uuid().safeParse(url.searchParams.get('ensemble')).success
  )
    return next;
  return fallback;
}

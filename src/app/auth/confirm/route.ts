import { type NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { isLocale } from '@/lib/i18n';
import { safeNext } from '@/lib/domain';
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const raw = p.get('locale') ?? 'en';
  const locale = isLocale(raw) ? raw : 'en';
  const db = await supabaseServer();
  const token = p.get('token_hash');
  const code = p.get('code');
  const result = token
    ? await db.auth.verifyOtp({ token_hash: token, type: 'email' })
    : code
      ? await db.auth.exchangeCodeForSession(code)
      : { error: true };
  const url = new URL(
    result.error ? `/${locale}/login?error=linkError` : safeNext(p.get('next'), locale),
    process.env.APP_URL || request.url,
  );
  return NextResponse.redirect(url, {
    headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

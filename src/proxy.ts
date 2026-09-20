import type { Database } from '@/lib/database.types';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@/lib/i18n';
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/auth/')) {
    const first = pathname.split('/')[1];
    if (!isLocale(first)) {
      const cookie = request.cookies.get('locale')?.value;
      const preferences = (request.headers.get('accept-language') ?? '')
        .split(',')
        .map((item) => {
          const [tag, q] = item.trim().split(';q=');
          return { tag: tag.split('-')[0], q: q ? Number(q) : 1 };
        })
        .sort((a, b) => b.q - a.q);
      const locale =
        cookie && isLocale(cookie)
          ? cookie
          : (preferences.find((p) => isLocale(p.tag) && p.q > 0)?.tag ?? 'en');
      return NextResponse.redirect(
        new URL(
          `/${locale}${pathname === '/' ? '' : pathname}${request.nextUrl.search}`,
          request.url,
        ),
      );
    }
  }
  let response = NextResponse.next({ request });
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const db = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (values) => {
            values.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            values.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    await db.auth.getClaims();
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};

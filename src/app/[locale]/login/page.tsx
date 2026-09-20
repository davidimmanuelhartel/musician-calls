import { notFound, redirect } from 'next/navigation';
import { dictionary, isLocale } from '@/lib/i18n';
import { safeNext } from '@/lib/domain';
import { currentUser } from '@/lib/supabase/server';
import { LoginForm } from '@/components/login-form';
export default async function Login({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const p = await searchParams;
  const next = safeNext(p.next || null, locale);
  if (await currentUser()) redirect(next);
  const t = dictionary(locale);
  return (
    <div className="login">
      <p className="eyebrow">TUTTI / {t.dashboard}</p>
      <h1>{t.loginTitle}</h1>
      <p>{t.loginIntro}</p>
      <LoginForm
        locale={locale}
        next={next}
        initialError={p.error === 'linkError' ? 'linkError' : undefined}
      />
    </div>
  );
}

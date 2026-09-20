import { notFound } from 'next/navigation';
import { dictionary, isLocale } from '@/lib/i18n';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import { LoginForm } from '@/components/login-form';
import { JoinEnsemble } from '@/components/ensemble-access';
export const metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default async function Join({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale) || !/^[a-f0-9]{64}$/.test(token)) notFound();
  const t = dictionary(locale);
  const user = await currentUser();
  let profile = null;
  if (user) {
    const db = await supabaseServer();
    profile = (
      await db.from('organizer_profiles').select('name,phone').eq('id', user.id).maybeSingle()
    ).data;
  }
  return (
    <div className="login">
      <p className="eyebrow">{t.privateEnsemble}</p>
      <h1>{t.joinEnsemble}</h1>
      <p>{t.joinIntro}</p>
      {user ? (
        <JoinEnsemble
          locale={locale}
          token={token}
          profile={{ name: profile?.name || '', phone: profile?.phone || '' }}
        />
      ) : (
        <LoginForm locale={locale} next={`/${locale}/join/${token}`} />
      )}
    </div>
  );
}

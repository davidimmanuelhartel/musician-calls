import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { dictionary, isLocale } from '@/lib/i18n';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import { EnsembleForm } from '@/components/ensemble-form';
export default async function NewEnsemble({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/ensembles/new`);
  const t = dictionary(locale);
  const db = await supabaseServer();
  const { data: profile } = await db
    .from('organizer_profiles')
    .select('name,phone')
    .eq('id', user.id)
    .maybeSingle();
  return (
    <div className="page">
      <Link className="back" href={`/${locale}/ensembles`}>
        {t.returnEnsembles}
      </Link>
      <div className="page-title">
        <p className="eyebrow">{t.privateEnsemble}</p>
        <h1>{t.newEnsemble}</h1>
        <p>{t.profileIntro}</p>
      </div>
      <div style={{ maxWidth: 740 }}>
        <EnsembleForm
          locale={locale}
          profile={{ name: profile?.name || '', phone: profile?.phone || '' }}
        />
      </div>
    </div>
  );
}

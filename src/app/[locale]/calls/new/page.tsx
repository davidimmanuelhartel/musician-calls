import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { dictionary, isLocale } from '@/lib/i18n';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import { getEnsemble } from '@/lib/data';
import { CreateCallForm } from '@/components/create-call-form';
export default async function NewCall({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ensemble?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { ensemble: id } = await searchParams;
  if (!id) redirect(`/${locale}/ensembles`);
  const user = await currentUser();
  if (!user)
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/calls/new?ensemble=${id}`)}`);
  const ensemble = await getEnsemble(id);
  if (!ensemble) notFound();
  const db = await supabaseServer();
  const { data: profile, error } = await db
    .from('organizer_profiles')
    .select('name,phone')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  const t = dictionary(locale);
  return (
    <div className="page">
      <Link className="back" href={`/${locale}/ensembles/${id}`}>
        <ArrowLeft />
        {t.ensembleBack}
      </Link>
      <div className="page-title">
        <p className="eyebrow">{ensemble.name}</p>
        <h1>{t.callFromEnsemble}</h1>
        <p>{t.callFromEnsembleIntro}</p>
      </div>
      <div className="form-layout">
        <CreateCallForm
          key={`${user.id}:${id}`}
          locale={locale}
          ensemble={ensemble}
          user={{
            id: user.id,
            email: user.email || '',
            name: profile.name,
            phone: profile.phone || '',
          }}
        />
        <aside className="aside-note">
          <h3>{ensemble.name}</h3>
          <p>{t.savedDetails}</p>
          <p>{t.callOnlyChanges}</p>
        </aside>
      </div>
    </div>
  );
}

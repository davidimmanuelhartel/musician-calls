import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { dictionary, isLocale } from '@/lib/i18n';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import { getEnsemble } from '@/lib/data';
import { EnsembleForm } from '@/components/ensemble-form';
export default async function EditEnsemble({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/ensembles/${id}/edit`);
  const ensemble = await getEnsemble(id);
  if (!ensemble || ensemble.owner_id !== user.id) notFound();
  const t = dictionary(locale);
  const db = await supabaseServer();
  const { data: profile } = await db
    .from('organizer_profiles')
    .select('name,phone')
    .eq('id', user.id)
    .single();
  return (
    <div className="page">
      <Link className="back" href={`/${locale}/ensembles/${id}`}>
        {t.ensembleBack}
      </Link>
      <div className="page-title">
        <p className="eyebrow">{ensemble.name}</p>
        <h1>{t.editEnsemble}</h1>
        <p>{t.profileIntro}</p>
      </div>
      <div style={{ maxWidth: 740 }}>
        <EnsembleForm
          locale={locale}
          ensemble={ensemble}
          profile={{ name: profile?.name || '', phone: profile?.phone || '' }}
        />
      </div>
    </div>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowUpRight, Plus, Users } from 'lucide-react';
import { dictionary, isLocale } from '@/lib/i18n';
import { currentUser } from '@/lib/supabase/server';
import { myEnsembles } from '@/lib/data';
import { signOut } from '@/app/actions';
export default async function Ensembles({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/ensembles`);
  const t = dictionary(locale);
  const ensembles = await myEnsembles();
  return (
    <div className="page">
      <div className="section-head">
        <div className="page-title" style={{ marginBottom: 0 }}>
          <p className="eyebrow">TUTTI / {t.privateEnsemble}</p>
          <h1>{t.myEnsembles}</h1>
          <p>{t.ensembleIntro}</p>
        </div>
        <form action={signOut.bind(null, locale)}>
          <button className="button secondary small">{t.signOut}</button>
        </form>
      </div>
      <Link className="button" style={{ marginBottom: 24 }} href={`/${locale}/ensembles/new`}>
        <Plus />
        {t.newEnsemble}
      </Link>
      {ensembles.length ? (
        <div className="cards">
          {ensembles.map((e) => (
            <article className="call-card" key={e.id}>
              <div className="card-top">
                <span className="instrument-icon">
                  <Users />
                </span>
                <span className="badge">{e.owner_id === user.id ? t.owner : t.member}</span>
              </div>
              <h3>{e.name}</h3>
              <p>{e.venue}</p>
              <div className="card-bottom">
                <span className="hint">{t.privateEnsemble}</span>
                <Link className="text-link" href={`/${locale}/ensembles/${e.id}`}>
                  {t.openEnsemble}
                  <ArrowUpRight />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Users />
          <h3>{t.noEnsembles}</h3>
          <p>{t.noEnsemblesText}</p>
        </div>
      )}
    </div>
  );
}

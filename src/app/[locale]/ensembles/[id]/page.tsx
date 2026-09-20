import Link from 'next/link';
import { readSeating, chairLabel, ensembleTypes, type EnsembleType } from '@/lib/seating';
import { notFound, redirect } from 'next/navigation';
import { Plus, ArrowUpRight, ArrowLeft, LockKeyhole } from 'lucide-react';
import { dictionary, isLocale, instrumentName } from '@/lib/i18n';
import { currentUser } from '@/lib/supabase/server';
import { getEnsemble, ensembleCalls, getResponses, getRoster } from '@/lib/data';
import { callStatus, dateLabel, timeLabel } from '@/lib/domain';
import { InviteMembers, RemoveMember } from '@/components/ensemble-access';
export const metadata = { robots: { index: false, follow: false } };
export default async function EnsemblePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/ensembles/${id}`);
  const ensemble = await getEnsemble(id);
  if (!ensemble) notFound();
  const t = dictionary(locale);
  const owner = ensemble.owner_id === user.id;
  const [calls, members] = await Promise.all([ensembleCalls(id), getRoster(id)]);
  const responses = await getResponses(calls.map((c) => c.id));
  return (
    <div className="page">
      <Link className="back" href={`/${locale}/ensembles`}>
        <ArrowLeft />
        {t.returnEnsembles}
      </Link>
      <div className="section-head">
        <div className="page-title" style={{ marginBottom: 0 }}>
          <p className="eyebrow">
            <LockKeyhole size={13} style={{ display: 'inline', marginRight: 8 }} />
            {t.privateEnsemble}
          </p>
          <h1>{ensemble.name}</h1>
          <p>{t.privatePageNote}</p>
        </div>
        <Link className="button" href={`/${locale}/calls/new?ensemble=${id}`}>
          <Plus />
          {t.findSub}
        </Link>
      </div>
      <div className="ensemble-layout">
        <div>
          <h2 style={{ fontSize: 30 }}>{t.ensembleCalls}</h2>
          {calls.length ? (
            calls.map((call) => {
              const rows = responses.filter((r) => r.call_id === call.id);
              return (
                <article className="dashboard-row" key={call.id}>
                  <div>
                    <h3>{call.position || instrumentName(call.instrument, locale)}</h3>
                    <p>
                      {dateLabel(call.event_at, locale)} · {timeLabel(call.event_at, locale)}
                    </p>
                    <p>
                      {rows.filter((r) => r.availability === 'available').length}{' '}
                      {t.availableLabel.toLowerCase()} ·{' '}
                      {rows.filter((r) => r.availability === 'maybe').length}{' '}
                      {t.maybeLabel.toLowerCase()}
                    </p>
                  </div>
                  <div className="dashboard-actions">
                    <span className={`badge ${callStatus(call)}`}>{t[callStatus(call)]}</span>
                    <Link
                      className="button secondary small"
                      href={`/${locale}/dashboard/${call.id}`}
                    >
                      {t.viewResponses}
                      <ArrowUpRight />
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty">
              <h3>{t.noEnsembleCalls}</h3>
              <p>{t.noEnsembleCallsText}</p>
            </div>
          )}
          <section className="form-panel" style={{ marginTop: 28 }}>
            <h2>
              {t.members} ({members.length})
            </h2>
            {members.map((member) => (
              <div className="member-row" key={member.user_id}>
                <div>
                  <strong>{member.name}</strong>
                  <p className="hint">
                    {member.user_id === ensemble.owner_id ? t.owner : t.member}
                  </p>
                </div>
                {owner && member.user_id !== user.id && (
                  <RemoveMember
                    locale={locale}
                    ensembleId={id}
                    memberId={member.user_id}
                    name={member.name}
                  />
                )}
              </div>
            ))}
          </section>
        </div>
        <aside>
          <section className="form-panel">
            <h2>{t.seating}</h2>
            <p>{ensembleTypes[ensemble.ensemble_type as EnsembleType][locale === 'da' ? 1 : 0]}</p>
            {readSeating(ensemble.seating).length ? (
              <details>
                <summary>
                  {t.seating} ({readSeating(ensemble.seating).length})
                </summary>
                <ul>
                  {readSeating(ensemble.seating).map((chair, index) => (
                    <li key={index}>{chairLabel(chair, locale)}</li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="hint">{t.noSeating}</p>
            )}
          </section>
          <section className="form-panel">
            <h2>{t.sharedDefaults}</h2>
            <div className="saved-defaults">
              <strong>{ensemble.venue}</strong>
              {ensemble.address && <span>{ensemble.address}</span>}
              <span>
                {ensemble.compensation_type === 'paid'
                  ? `${ensemble.compensation_amount} ${ensemble.currency}`
                  : t[ensemble.compensation_type as 'unpaid' | 'negotiable']}
              </span>
              {ensemble.description && <p className="prose">{ensemble.description}</p>}
            </div>
            {owner ? (
              <Link
                className="button secondary small"
                style={{ marginTop: 16 }}
                href={`/${locale}/ensembles/${id}/edit`}
              >
                {t.editEnsemble}
              </Link>
            ) : (
              <p className="hint">{t.memberDefaults}</p>
            )}
          </section>
          {owner && (
            <InviteMembers
              key={members.map((member) => member.user_id).join(':')}
              locale={locale}
              ensembleId={id}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

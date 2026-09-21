import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { dictionary, isLocale, instrumentName } from '@/lib/i18n';
import { currentUser } from '@/lib/supabase/server';
import { getCall, getResponses, getEnsemble, getSubstitutes } from '@/lib/data';
import { callStatus } from '@/lib/domain';
import { InviteSubstitutes } from '@/components/invite-substitutes';
import { SelectMusician } from '@/components/select-musician';
export default async function Manage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/dashboard/${id}`);
  const call = await getCall(id);
  if (!call || !(await getEnsemble(call.ensemble_id))) notFound();
  const t = dictionary(locale);
  const responses = await getResponses([id]);
  const substitutes = await getSubstitutes(call.ensemble_id, call.instrument);
  const status = callStatus(call);
  const groups = [
    { key: 'selected', label: t.selected, rows: responses.filter((r) => r.selected) },
    {
      key: 'available',
      label: t.availableLabel,
      rows: responses.filter((r) => !r.selected && r.availability === 'available'),
    },
    {
      key: 'maybe',
      label: t.maybeLabel,
      rows: responses.filter((r) => !r.selected && r.availability === 'maybe'),
    },
  ];
  return (
    <div className="page">
      <Link className="back" href={`/${locale}/ensembles/${call.ensemble_id}`}>
        <ArrowLeft />
        {t.ensembleBack}
      </Link>
      <div className="section-head">
        <div className="page-title" style={{ marginBottom: 0 }}>
          <span className={`badge ${status}`}>{t[status]}</span>
          <h1 style={{ marginTop: 20 }}>
            {call.position || instrumentName(call.instrument, locale)}
          </h1>
          <p>{call.ensemble_name}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="text-link" href={`/${locale}/calls/${id}`}>
            {t.publicPage}
            <ArrowUpRight />
          </Link>
        </div>
      </div>
      {status === 'filled' && <div className="alert success">{t.selectedText}</div>}
      {status === 'open' && (
        <InviteSubstitutes
          locale={locale}
          callId={id}
          ensembleId={call.ensemble_id}
          substitutes={substitutes}
        />
      )}
      <h2 style={{ fontSize: 28 }}>
        {t.responses} ({responses.length})
      </h2>
      {!responses.length && (
        <div className="empty">
          <h3>{t.noResponses}</h3>
          <p>{t.noResponsesText}</p>
        </div>
      )}
      {groups
        .filter((g) => g.rows.length)
        .map((group) => (
          <section key={group.key} style={{ marginTop: 30 }}>
            <p className="eyebrow">
              {group.label} ({group.rows.length})
            </p>
            {group.rows.map((r) => (
              <article className="response-card" key={r.id}>
                <div className="response-head">
                  <h3>{r.name}</h3>
                  <span className={`badge ${group.key}`}>{group.label}</span>
                </div>
                <div className="contact-links">
                  <a href={`mailto:${r.email}`}>{r.email}</a>
                  {r.phone && <a href={`tel:${r.phone.replace(/[^+\d]/g, '')}`}>{r.phone}</a>}
                </div>
                {r.message && <blockquote>{r.message}</blockquote>}
                {status === 'open' && r.substitute_id && (
                  <SelectMusician locale={locale} callId={id} responseId={r.id} name={r.name} />
                )}
              </article>
            ))}
          </section>
        ))}
    </div>
  );
}

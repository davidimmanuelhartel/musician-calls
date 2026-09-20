import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowUpRight, Plus, Music2 } from 'lucide-react';
import { dictionary, isLocale, instrumentName } from '@/lib/i18n';
import { currentUser } from '@/lib/supabase/server';
import { ownCalls, getResponses } from '@/lib/data';
import { callStatus, dateLabel, timeLabel } from '@/lib/domain';
import { signOut } from '@/app/actions';
export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  const t = dictionary(locale);
  const calls = await ownCalls(user.id);
  const responses = await getResponses(calls.map((c) => c.id));
  return (
    <div className="page">
      <div className="section-head">
        <div className="page-title" style={{ marginBottom: 0 }}>
          <p className="eyebrow">{t.dashboard}</p>
          <h1>{t.yourCalls}</h1>
          <p>{t.dashboardIntro}</p>
        </div>
        <form action={signOut.bind(null, locale)}>
          <button className="button secondary small">{t.signOut}</button>
        </form>
      </div>
      <div style={{ marginBottom: 25 }}>
        <Link className="button" href={`/${locale}/calls/new`}>
          <Plus />
          {t.findSub}
        </Link>
      </div>
      {calls.length ? (
        calls.map((call) => {
          const rows = responses.filter((r) => r.call_id === call.id);
          return (
            <article className="dashboard-row" key={call.id}>
              <div>
                <h3>{call.position || instrumentName(call.instrument, locale)}</h3>
                <p>{call.ensemble_name}</p>
                <p>
                  {dateLabel(call.event_at, locale)} · {timeLabel(call.event_at, locale)}
                </p>
              </div>
              <div className="dashboard-actions">
                <div>
                  <span className={`badge ${callStatus(call)}`}>{t[callStatus(call)]}</span>
                  <p style={{ marginTop: 8 }}>
                    {rows.filter((r) => r.availability === 'available').length}{' '}
                    {t.availableLabel.toLowerCase()} ·{' '}
                    {rows.filter((r) => r.availability === 'maybe').length}{' '}
                    {t.maybeLabel.toLowerCase()}
                  </p>
                </div>
                <Link className="button secondary small" href={`/${locale}/dashboard/${call.id}`}>
                  {t.viewResponses}
                  <ArrowUpRight />
                </Link>
              </div>
            </article>
          );
        })
      ) : (
        <div className="empty">
          <Music2 />
          <h3>{t.noOwnCalls}</h3>
          <p>{t.noOwnText}</p>
        </div>
      )}
    </div>
  );
}

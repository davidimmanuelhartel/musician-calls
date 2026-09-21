import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Music2,
  MapPin,
  Banknote,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { dictionary, isLocale, instrumentName } from '@/lib/i18n';
import { getSubstitutes } from '@/lib/data';
import { callAccess, privateAttachments } from '@/lib/call-access';
import { InviteSubstitutes } from '@/components/invite-substitutes';
import { callStatus, dateLabel, timeLabel, feeLabel } from '@/lib/domain';
import { ResponseForm } from '@/components/response-form';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ published?: string; invite?: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const access = await callAccess(id, query.invite);
  if (!access) notFound();
  const { call, member: own, recipient } = access;
  const attachments = await privateAttachments(id, locale, own ? undefined : query.invite);
  const substitutes = own ? await getSubstitutes(call.ensemble_id, call.instrument) : [];
  const t = dictionary(locale);
  const status = callStatus(call);
  return (
    <div className="page">
      <Link className="back" href={`/${locale}`}>
        <ArrowLeft />
        {t.back}
      </Link>
      {own && query.published === '1' && (
        <div className="alert success notice-row">
          <div>
            <strong>{t.published} ✓</strong>
            <p>{t.shareText}</p>
          </div>
        </div>
      )}
      <div className="detail-layout">
        <div>
          <div className="detail-title">
            <span className={`badge ${status}`}>{t[status]}</span>
            <h1>{call.position || instrumentName(call.instrument, locale)}</h1>
            <p>{call.ensemble_name}</p>
            <span className="instrument-tag">{instrumentName(call.instrument, locale)}</span>
          </div>
          <div className="facts">
            <div className="fact">
              <CalendarDays />
              <div>
                <small>{t.date}</small>
                <strong>{dateLabel(call.event_at, locale)}</strong>
              </div>
            </div>
            <div className="fact">
              <Clock3 />
              <div>
                <small>{t.callTime}</small>
                <strong>{timeLabel(call.call_at, locale)}</strong>
              </div>
            </div>
            {call.performance_at && (
              <div className="fact">
                <Music2 />
                <div>
                  <small>{t.performance}</small>
                  <strong>{timeLabel(call.performance_at, locale)}</strong>
                </div>
              </div>
            )}
            <div className="fact">
              <MapPin />
              <div>
                <small>{t.venue}</small>
                <strong>{call.venue}</strong>
                {call.address && <p className="hint">{call.address}</p>}
              </div>
            </div>
            <div className="fact">
              <Banknote />
              <div>
                <small>{t.compensation}</small>
                <strong>{feeLabel(call, locale)}</strong>
              </div>
            </div>
          </div>
          <p className="hint">{t.timezone}</p>
          {call.repertoire && (
            <section className="content-section">
              <h2>{t.repertoire}</h2>
              <p className="prose">{call.repertoire}</p>
            </section>
          )}
          {call.description && (
            <section className="content-section">
              <h2>{t.information}</h2>
              <p className="prose">{call.description}</p>
            </section>
          )}
          {attachments.length > 0 && (
            <section className="content-section">
              <h2>{t.attachments}</h2>
              <div className="file-list">
                {attachments.map((file) => (
                  <a
                    key={file.id}
                    className="file-row"
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="file-name">
                      <FileText />
                      {file.filename}
                    </span>
                    <ArrowUpRight />
                  </a>
                ))}
              </div>
            </section>
          )}
          {own && (
            <Link className="button secondary" href={`/${locale}/dashboard/${id}`}>
              {t.viewResponses}
              <ArrowUpRight />
            </Link>
          )}
        </div>
        <div>
          {own ? (
            status === 'open' ? (
              <InviteSubstitutes
                locale={locale}
                callId={id}
                ensembleId={call.ensemble_id}
                substitutes={substitutes}
              />
            ) : (
              <p>{t.closedText}</p>
            )
          ) : (
            <ResponseForm
              locale={locale}
              callId={id}
              open={status === 'open'}
              inviteToken={query.invite!}
              recipient={recipient!}
            />
          )}
        </div>
      </div>
    </div>
  );
}

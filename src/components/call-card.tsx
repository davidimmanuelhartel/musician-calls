import Link from 'next/link';
import { ArrowUpRight, CalendarDays, MapPin, Music2 } from 'lucide-react';
import { dictionary, instrumentName, type Locale } from '@/lib/i18n';
import { type Call, dateLabel, timeLabel, feeLabel, callStatus } from '@/lib/domain';
export function CallCard({ call, locale }: { call: Call; locale: Locale }) {
  const t = dictionary(locale);
  return (
    <article className="call-card">
      <div className="card-top">
        <span className="instrument-icon">
          <Music2 aria-hidden="true" />
        </span>
        <span className={`badge ${callStatus(call)}`}>{t[callStatus(call)]}</span>
      </div>
      <h3>{call.position || instrumentName(call.instrument, locale)}</h3>
      <p className="ensemble">{call.ensemble_name}</p>
      <div className="meta">
        <CalendarDays aria-hidden="true" />
        <span>
          {dateLabel(call.event_at, locale)} · {timeLabel(call.event_at, locale)}
        </span>
      </div>
      <div className="meta">
        <MapPin aria-hidden="true" />
        <span>{call.venue}</span>
      </div>
      <div className="card-bottom">
        <span className="fee">{feeLabel(call, locale)}</span>
        <Link className="text-link" href={`/${locale}/calls/${call.id}`}>
          {t.viewCall}
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

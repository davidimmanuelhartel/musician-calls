import Link from 'next/link';
import { ArrowRight, Music2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { dictionary, isLocale } from '@/lib/i18n';
import { openCalls } from '@/lib/data';
import { configured } from '@/lib/supabase/server';
import { CallCard } from '@/components/call-card';
import { EnsembleArt } from '@/components/ensemble-art';
export const dynamic = 'force-dynamic';
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionary(locale);
  const calls = await openCalls();
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>
            {locale === 'da' ? 'Find musikere,' : 'Find musicians'}
            <br />
            <em>{locale === 'da' ? 'når du har brug for dem.' : 'when you need them.'}</em>
          </h1>
          <p className="hero-description">{t.subheadline}</p>
          <div className="hero-actions">
            <Link className="button" href={`/${locale}/calls/new`}>
              {t.findSub}
              <ArrowRight />
            </Link>
            <a className="text-link" href="#open-calls">
              {t.browse}
              <ArrowRight />
            </a>
          </div>
          <p className="hero-note">{t.noAccount}</p>
        </div>
        <EnsembleArt locale={locale} />
      </section>
      <section className="steps" aria-label={t.how}>
        {[
          [t.step1, t.step1text],
          [t.step2, t.step2text],
          [t.step3, t.step3text],
        ].map(([title, text], i) => (
          <div className="step" key={title}>
            <span className="step-number">0{i + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>
      <section id="open-calls">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              {t.upcoming} / {t.openCalls} ({calls.length})
            </p>
            <h2>{t.openIntro}</h2>
          </div>
          <p className="small-copy">{t.openText}</p>
        </div>
        {!configured() ? (
          <div className="alert">{t.configuration}</div>
        ) : calls.length ? (
          <div className="cards">
            {calls.map((call) => (
              <CallCard key={call.id} call={call} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Music2 size={30} />
            <h3>{t.noCalls}</h3>
            <p>{t.noCallsText}</p>
            <Link className="button secondary" href={`/${locale}/calls/new`}>
              {t.findSub}
              <ArrowRight />
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { dictionary, isLocale } from '@/lib/i18n';
import { EnsembleArt } from '@/components/ensemble-art';
export const dynamic = 'force-dynamic';
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionary(locale);
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
            <Link className="button" href={`/${locale}/ensembles`}>
              {t.findSub}
              <ArrowRight />
            </Link>
          </div>
          <p className="hero-note">{t.privateCallsNote}</p>
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
    </>
  );
}

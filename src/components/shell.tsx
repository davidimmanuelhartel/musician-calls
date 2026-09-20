import Link from 'next/link';
import { Suspense } from 'react';
import { dictionary, type Locale } from '@/lib/i18n';
import { LanguageToggle } from './language-toggle';
export function Header({ locale }: { locale: Locale }) {
  const t = dictionary(locale);
  return (
    <header className="header">
      <Link className="brand" href={`/${locale}`} aria-label="Tutti">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        tutti<span className="wordmark-dot">.</span>
      </Link>
      <div className="nav">
        <Link className="nav-link browse-nav" href={`/${locale}#open-calls`}>
          {t.openCalls}
        </Link>
        <Link className="nav-link" href={`/${locale}/dashboard`}>
          {t.dashboard}
        </Link>
        <Link className="button small create-nav" href={`/${locale}/calls/new`}>
          {t.findSub}
        </Link>
        <Suspense>
          <LanguageToggle locale={locale} />
        </Suspense>
      </div>
    </header>
  );
}
export function Footer({ locale }: { locale: Locale }) {
  const t = dictionary(locale);
  return (
    <footer className="footer">
      <p>
        <span className="footer-brand">tutti.</span>
        {t.footer}
      </p>
      <p>{t.footerNote}</p>
    </footer>
  );
}

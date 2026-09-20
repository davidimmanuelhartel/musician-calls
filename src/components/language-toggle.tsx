'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { type Locale, locales } from '@/lib/i18n';
export function LanguageToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <nav className="language" aria-label={locale === 'da' ? 'Sprog' : 'Language'}>
      {locales.map((l) => {
        const params = new URLSearchParams(search.toString());
        const next = params.get('next');
        if (next) params.set('next', next.replace(/^\/(en|da)(?=\/|$)/, `/${l}`));
        const query = params.toString();
        return (
          <Link
            key={l}
            href={`${pathname.replace(/^\/(en|da)(?=\/|$)/, `/${l}`)}${query ? `?${query}` : ''}`}
            hrefLang={l}
            aria-current={l === locale ? 'true' : undefined}
            onClick={() => {
              document.cookie = `locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
            }}
          >
            {l.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}

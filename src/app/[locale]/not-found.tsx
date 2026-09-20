'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { dictionary } from '@/lib/i18n';
export default function NotFound() {
  const params = useParams();
  const locale = params.locale === 'da' ? 'da' : 'en';
  const t = dictionary(locale);
  return (
    <div className="page empty">
      <h1>{t.notFound}</h1>
      <Link className="button" href={`/${locale}`}>
        {t.returnHome}
      </Link>
    </div>
  );
}

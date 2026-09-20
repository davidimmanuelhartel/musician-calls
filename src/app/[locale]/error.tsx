'use client';
import { useParams } from 'next/navigation';
import { dictionary } from '@/lib/i18n';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const params = useParams();
  const t = dictionary(params.locale === 'da' ? 'da' : 'en');
  return (
    <div className="page">
      <div className="alert" role="alert">
        {t.genericError}
      </div>
      <button className="button" onClick={reset}>
        {params.locale === 'da' ? 'Prøv igen' : 'Try again'}
      </button>
    </div>
  );
}

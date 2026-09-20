'use client';
import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { dictionary, type Locale } from '@/lib/i18n';
export function CopyLink({ locale, path }: { locale: Locale; path: string }) {
  const t = dictionary(locale);
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState('');
  return (
    <div>
      <button
        className="button secondary small"
        onClick={async () => {
          const url = new URL(path, window.location.origin).toString();
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          } catch {
            setFallback(url);
          }
        }}
      >
        {copied ? <Check /> : <Link2 />}
        <span aria-live="polite">{copied ? t.copied : t.copy}</span>
      </button>
      {fallback && (
        <input aria-label={t.copy} readOnly value={fallback} onFocus={(e) => e.target.select()} />
      )}
    </div>
  );
}

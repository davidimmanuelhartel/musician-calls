'use client';
import { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { dictionary, type Dictionary, type Locale } from '@/lib/i18n';
import { sendMagicLink } from '@/app/actions';
export function LoginForm({
  locale,
  next,
  initialError,
}: {
  locale: Locale;
  next: string;
  initialError?: string;
}) {
  const t = dictionary(locale);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(initialError || '');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const result = await sendMagicLink(locale, email, next);
          if (result.error) setError(result.error);
          else setSent(true);
        } catch {
          setError('genericError');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        {t.email} *
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button className="button" disabled={busy}>
        {busy ? t.sending : t.sendLink}
        <ArrowRight />
      </button>
      {error && (
        <div className="alert" role="alert">
          {t[error as keyof Dictionary] || t.genericError}
        </div>
      )}
      {sent && (
        <div className="alert success" role="status">
          <Mail size={18} />
          <strong>{t.checkEmail}</strong>
          <br />
          {t.checkEmailText}
        </div>
      )}
    </form>
  );
}

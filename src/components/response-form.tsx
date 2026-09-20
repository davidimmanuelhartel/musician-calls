'use client';
import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { dictionary, type Dictionary, type Locale } from '@/lib/i18n';
import { submitResponse } from '@/app/actions';
export function ResponseForm({
  locale,
  callId,
  open,
}: {
  locale: Locale;
  callId: string;
  open: boolean;
}) {
  const t = dictionary(locale);
  const [choice, setChoice] = useState<'available' | 'maybe' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  return (
    <aside className="respond-box">
      {done ? (
        <div role="status">
          <Check />
          <h3>{t.thanks}</h3>
          <p>{t.thanksText}</p>
        </div>
      ) : !open ? (
        <>
          <Check />
          <h3>{t.closedText}</h3>
        </>
      ) : !choice ? (
        <>
          <h3>{t.respondTitle}</h3>
          <p>{t.respondIntro}</p>
          <button className="button" onClick={() => setChoice('available')}>
            {t.available}
            <ArrowRight />
          </button>
          <button className="button secondary" onClick={() => setChoice('maybe')}>
            {t.maybe}
          </button>
          <p className="hint">{t.noAccount}</p>
        </>
      ) : (
        <form
          className="respond-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            setBusy(true);
            setError('');
            try {
              const result = await submitResponse({
                ...values,
                call_id: callId,
                availability: choice,
              });
              if (result.error) setError(result.error);
              else setDone(true);
            } catch {
              setError('genericError');
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>{t.respondTitle}</h3>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">{t.chooseAvailability}</legend>
            <div className="choice-row">
              {(['available', 'maybe'] as const).map((c) => (
                <label key={c}>
                  <input
                    type="radio"
                    checked={choice === c}
                    name="choice"
                    onChange={() => setChoice(c)}
                  />
                  {c === 'available' ? t.availableLabel : t.maybeLabel}
                </label>
              ))}
            </div>
            <label className="field">
              {t.name} *<input name="name" autoComplete="name" required maxLength={100} autoFocus />
            </label>
            <label className="field">
              {t.email} *
              <input name="email" type="email" autoComplete="email" required maxLength={254} />
            </label>
            <label className="field">
              {t.phone} <small>{t.optional}</small>
              <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
            </label>
            <label className="field">
              {t.message} <small>{t.optional}</small>
              <textarea name="message" maxLength={2000} />
            </label>
            <div className="honeypot" aria-hidden="true">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <p className="hint">{t.privacy}</p>
            {error && (
              <div className="alert" role="alert">
                {t[error as keyof Dictionary] || t.genericError}
              </div>
            )}
            <button className="button" disabled={busy}>
              {busy ? t.sending : t.send}
              <ArrowRight />
            </button>
            <button className="button secondary" type="button" onClick={() => setChoice(null)}>
              {t.cancel}
            </button>
          </fieldset>
        </form>
      )}
    </aside>
  );
}

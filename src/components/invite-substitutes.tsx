'use client';
import Link from 'next/link';
import { useState } from 'react';
import { dictionary, type Locale } from '@/lib/i18n';
import type { Substitute } from '@/lib/substitutes';
import { inviteSubstitute } from '@/app/substitute-actions';
import { CopyLink } from './copy-link';
export function InviteSubstitutes({
  locale,
  callId,
  ensembleId,
  substitutes,
}: {
  locale: Locale;
  callId: string;
  ensembleId: string;
  substitutes: Substitute[];
}) {
  const t = dictionary(locale);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  return (
    <section className="form-panel">
      <h2>{t.contactSubstitutes}</h2>
      <p className="hint">{t.privateInviteHint}</p>
      {!substitutes.length && <p>{t.noMatchingSubstitutes}</p>}
      {substitutes.map((s) => (
        <article className="substitute-row" key={s.id}>
          <div>
            <strong>{s.name}</strong>
            <div className="contact-links">
              <a href={`tel:${s.phone.replace(/[^+\d]/g, '')}`}>{s.phone}</a>
              {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
            </div>
            {links[s.id] && (
              <div className="invitation-link">
                <input
                  aria-label={`${t.invitationFor} ${s.name}`}
                  readOnly
                  value={links[s.id]}
                  onFocus={(e) => e.target.select()}
                />
                <CopyLink locale={locale} path={links[s.id]} />
              </div>
            )}
          </div>
          <button
            type="button"
            className="button secondary small"
            disabled={!!busy}
            onClick={async () => {
              setBusy(s.id);
              setError('');
              try {
                const r = await inviteSubstitute(callId, s.id);
                if (r.error || !r.token) setError(t.inviteFailed);
                else
                  setLinks((v) => ({
                    ...v,
                    [s.id]: new URL(
                      `/${locale}/calls/${callId}?invite=${r.token}`,
                      window.location.origin,
                    ).toString(),
                  }));
              } catch {
                setError(t.inviteFailed);
              } finally {
                setBusy('');
              }
            }}
          >
            {busy === s.id ? t.working : links[s.id] ? t.replaceInvitation : t.createInvitation}
          </button>
        </article>
      ))}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <Link className="text-link" href={`/${locale}/ensembles/${ensembleId}#substitutes`}>
        {t.manageSubstitutes}
      </Link>
    </section>
  );
}

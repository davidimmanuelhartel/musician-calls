'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dictionary, type Dictionary, type Locale } from '@/lib/i18n';
import { createInvite, joinEnsemble, removeMember } from '@/app/ensemble-actions';
import { CopyLink } from './copy-link';
export function InviteMembers({ locale, ensembleId }: { locale: Locale; ensembleId: string }) {
  const t = dictionary(locale);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="form-panel">
      <h2>{t.inviteMembers}</h2>
      <p className="hint">{t.inviteHint}</p>
      <button
        type="button"
        className="button secondary"
        style={{ marginTop: 16 }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const result = await createInvite(ensembleId);
            if (result.error) setError(result.error);
            else setToken(result.token!);
          } catch {
            setError('genericError');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? t.working : token ? t.replaceInvite : t.generateInvite}
      </button>
      {token && (
        <div className="alert success">
          <p>{t.inviteReady}</p>
          <input
            aria-label={t.generateInvite}
            readOnly
            value={`${window.location.origin}/${locale}/join/${token}`}
            onFocus={(e) => e.target.select()}
          />
          <div style={{ marginTop: 12 }}>
            <CopyLink locale={locale} path={`/${locale}/join/${token}`} />
          </div>
        </div>
      )}
      {error && (
        <div role="alert" className="alert">
          {t[error as keyof Dictionary] || t.genericError}
        </div>
      )}
    </section>
  );
}
export function JoinEnsemble({
  locale,
  token,
  profile,
}: {
  locale: Locale;
  token: string;
  profile: { name: string; phone: string };
}) {
  const t = dictionary(locale);
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const data = new FormData(e.currentTarget);
        try {
          const result = await joinEnsemble({
            token,
            name: data.get('name'),
            phone: data.get('phone'),
          });
          if (result.error) setError(result.error);
          else router.push(`/${locale}/ensembles/${result.id}`);
        } catch {
          setError('genericError');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-panel">
        <label className="field">
          {t.name} *
          <input
            name="name"
            defaultValue={profile.name}
            required
            maxLength={100}
            autoComplete="name"
          />
        </label>
        <label className="field" style={{ marginTop: 18 }}>
          <span className="field-label">
            {t.phone} <small>{t.optional}</small>
          </span>
          <input
            name="phone"
            type="tel"
            defaultValue={profile.phone}
            maxLength={40}
            autoComplete="tel"
          />
        </label>
        <p className="hint">{t.joinNote}</p>
        {error && (
          <div role="alert" className="alert">
            {t[error as keyof Dictionary] || t.genericError}
          </div>
        )}
        <button className="button" disabled={busy} style={{ marginTop: 20 }}>
          {busy ? t.working : t.joinEnsemble}
        </button>
      </div>
    </form>
  );
}
export function RemoveMember({
  locale,
  ensembleId,
  memberId,
  name,
}: {
  locale: Locale;
  ensembleId: string;
  memberId: string;
  name: string;
}) {
  const t = dictionary(locale);
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <button className="button secondary small" onClick={() => dialog.current?.showModal()}>
        {t.removeMember}
      </button>
      <dialog ref={dialog} aria-labelledby={`remove-${memberId}`}>
        <h2 id={`remove-${memberId}`}>{t.removeMemberTitle}</h2>
        <strong>{name}</strong>
        <p>{t.removeMemberText}</p>
        {error && (
          <div className="alert" role="alert">
            {t[error as keyof Dictionary] || t.genericError}
          </div>
        )}
        <div className="dialog-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            {t.cancel}
          </button>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const result = await removeMember(ensembleId, memberId);
                if (result.error) setError(result.error);
                else {
                  dialog.current?.close();
                  router.refresh();
                }
              } catch {
                setError('genericError');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t.working : t.removeMember}
          </button>
        </div>
      </dialog>
    </>
  );
}

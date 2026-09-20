'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dictionary, type Dictionary, type Locale } from '@/lib/i18n';
import { selectMusician } from '@/app/actions';
export function SelectMusician({
  locale,
  callId,
  responseId,
  name,
}: {
  locale: Locale;
  callId: string;
  responseId: string;
  name: string;
}) {
  const t = dictionary(locale);
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <>
      <button
        className="button small"
        onClick={() => {
          setError('');
          dialog.current?.showModal();
        }}
      >
        {t.select}
      </button>
      <dialog ref={dialog} aria-labelledby={`select-${responseId}`}>
        <h2 id={`select-${responseId}`}>{t.confirmTitle}</h2>
        <strong>{name}</strong>
        <p>{t.confirmText}</p>
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
                const result = await selectMusician(callId, responseId);
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
            {busy ? t.working : t.confirm}
          </button>
        </div>
      </dialog>
    </>
  );
}

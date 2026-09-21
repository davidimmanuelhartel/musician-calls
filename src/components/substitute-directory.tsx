'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dictionary, instruments, instrumentName, type Locale } from '@/lib/i18n';
import { type Substitute, substituteSchema } from '@/lib/substitutes';
import { saveSubstitute, removeSubstitute } from '@/app/substitute-actions';
export function SubstituteDirectory({
  locale,
  ensembleId,
  substitutes,
}: {
  locale: Locale;
  ensembleId: string;
  substitutes: Substitute[];
}) {
  const t = dictionary(locale),
    router = useRouter();
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState({ name: '', instrument: '', phone: '', email: '' });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function edit(s?: Substitute) {
    setEditing(s?.id || crypto.randomUUID());
    setValues({
      name: s?.name || '',
      instrument: s?.instrument || filter,
      phone: s?.phone || '',
      email: s?.email || '',
    });
    setError('');
  }
  const rows = substitutes.filter((s) => !filter || s.instrument === filter);
  return (
    <section className="form-panel" style={{ marginTop: 28 }}>
      <div className="section-head">
        <h2>
          {t.substitutes} ({substitutes.length})
        </h2>
        <button type="button" className="button secondary small" onClick={() => edit()}>
          {t.addSubstitute}
        </button>
      </div>
      <label className="field">
        {t.instrument}
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">{t.allInstruments}</option>
          {Object.entries(instruments).map(([key, names]) => (
            <option key={key} value={key}>
              {names[locale === 'da' ? 1 : 0]}
            </option>
          ))}
        </select>
      </label>
      {editing && (
        <form
          className="substitute-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (!substituteSchema.safeParse({ ...values, id: editing }).success) {
              setError(t.required);
              return;
            }
            setBusy(true);
            try {
              const result = await saveSubstitute(ensembleId, { ...values, id: editing });
              if (result.error) setError(t.genericError);
              else {
                setEditing(null);
                router.refresh();
              }
            } catch {
              setError(t.genericError);
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
            <div className="form-grid">
              <label className="field">
                {t.substituteName} *
                <input
                  required
                  maxLength={100}
                  value={values.name}
                  onChange={(e) => setValues({ ...values, name: e.target.value })}
                />
              </label>
              <label className="field">
                {t.instrument} *
                <select
                  required
                  value={values.instrument}
                  onChange={(e) => setValues({ ...values, instrument: e.target.value })}
                >
                  <option value="">{t.chooseInstrument}</option>
                  {Object.entries(instruments).map(([key, names]) => (
                    <option key={key} value={key}>
                      {names[locale === 'da' ? 1 : 0]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t.phone} *
                <input
                  type="tel"
                  required
                  maxLength={40}
                  value={values.phone}
                  onChange={(e) => setValues({ ...values, phone: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">
                  {t.email} <small>{t.optional}</small>
                </span>
                <input
                  type="email"
                  maxLength={254}
                  value={values.email}
                  onChange={(e) => setValues({ ...values, email: e.target.value })}
                />
              </label>
            </div>
            <div className="substitute-actions">
              <button className="button small">{busy ? t.working : t.saveChanges}</button>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setEditing(null)}
              >
                {t.cancel}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {!rows.length && <p className="hint">{t.noSubstitutes}</p>}
      {rows.map((s) => (
        <article className="substitute-row" key={s.id}>
          <div>
            <strong>{s.name}</strong>
            <p className="hint">{instrumentName(s.instrument, locale)}</p>
            <div className="contact-links">
              <a href={`tel:${s.phone.replace(/[^+\d]/g, '')}`}>{s.phone}</a>
              {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
            </div>
          </div>
          <div className="substitute-actions">
            <button type="button" className="button secondary small" onClick={() => edit(s)}>
              {t.editSubstitute}
            </button>
            <button
              type="button"
              disabled={busy}
              className="button secondary small"
              onClick={async () => {
                if (!window.confirm(t.removeSubstituteConfirm)) return;
                setBusy(true);
                try {
                  const r = await removeSubstitute(ensembleId, s.id);
                  if (r.error) setError(t.genericError);
                  else {
                    if (editing === s.id) setEditing(null);
                    router.refresh();
                  }
                } catch {
                  setError(t.genericError);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t.removeSubstitute}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

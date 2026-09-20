'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dictionary, type Dictionary, type Locale } from '@/lib/i18n';
import { type Ensemble, ensembleSchema } from '@/lib/ensembles';
import { SeatingEditor } from '@/components/seating-editor';
import { readSeating, type EnsembleType } from '@/lib/seating';
import { saveEnsemble } from '@/app/ensemble-actions';
export function EnsembleForm({
  locale,
  ensemble,
  profile,
}: {
  locale: Locale;
  ensemble?: Ensemble;
  profile: { name: string; phone: string };
}) {
  const t = dictionary(locale);
  const [ensembleType, setEnsembleType] = useState<EnsembleType>(
    (ensemble?.ensemble_type as EnsembleType) || 'custom',
  );
  const [chairs, setChairs] = useState(() => readSeating(ensemble?.seating));
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [id, setId] = useState(ensemble?.id || '');
  const [values, setValues] = useState<Record<string, string>>({
    name: ensemble?.name || '',
    venue: ensemble?.venue || '',
    address: ensemble?.address || '',
    description: ensemble?.description || '',
    compensation_type: ensemble?.compensation_type || 'negotiable',
    compensation_amount: ensemble?.compensation_amount?.toString() || '',
    currency: ensemble?.currency || 'DKK',
    organizer_name: profile.name,
    organizer_phone: profile.phone,
  });
  function change(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  function field(key: string, label: string, required = false, maxLength = 200, type = 'text') {
    return (
      <label className="field">
        {label}
        {required ? ' *' : <small>{t.optional}</small>}
        <input
          name={key}
          value={values[key]}
          onChange={(e) => change(key, e.target.value)}
          required={required}
          maxLength={maxLength}
          type={type}
          min={type === 'number' ? '0.01' : undefined}
          step={type === 'number' ? '0.01' : undefined}
        />
      </label>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const identifier = id || crypto.randomUUID();
        setId(identifier);
        const input = { ...values, id: identifier, ensemble_type: ensembleType, seating: chairs };
        if (!ensembleSchema.safeParse(input).success) {
          setError('required');
          setBusy(false);
          return;
        }
        try {
          const result = await saveEnsemble(input, ensemble?.id);
          if (result.error) setError(result.error);
          else router.push(`/${locale}/ensembles/${result.id}`);
        } catch {
          setError('genericError');
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <section className="form-panel">
          <h2>{t.sharedDefaults}</h2>
          <div className="form-grid">
            {field('name', t.ensemble, true, 150)}
            {field('venue', t.venue, true)}
            {field('address', t.address, false, 300)}
            <label className="field">
              {t.compensation}
              <select
                name="compensation_type"
                value={values.compensation_type}
                onChange={(e) => change('compensation_type', e.target.value)}
              >
                <option value="negotiable">{t.negotiable}</option>
                <option value="unpaid">{t.unpaid}</option>
                <option value="paid">{t.paid}</option>
              </select>
            </label>
            {values.compensation_type === 'paid' && (
              <>
                {field('compensation_amount', t.amount, true, 12, 'number')}
                <label className="field">
                  {t.currency}
                  <select
                    value={values.currency}
                    onChange={(e) => change('currency', e.target.value)}
                  >
                    {['DKK', 'EUR', 'SEK', 'NOK', 'GBP'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
          <label className="field" style={{ marginTop: 22 }}>
            {t.information}
            <small>{t.optional}</small>
            <textarea
              name="description"
              value={values.description}
              onChange={(e) => change('description', e.target.value)}
              maxLength={5000}
            />
          </label>
        </section>
        <SeatingEditor
          locale={locale}
          type={ensembleType}
          chairs={chairs}
          onChange={(type, seating) => {
            setEnsembleType(type);
            setChairs(seating);
          }}
        />
        {!ensemble && (
          <section className="form-panel">
            <h2>{t.contact}</h2>
            <div className="form-grid">
              {field('organizer_name', t.name, true, 100)}
              {field('organizer_phone', t.phone, false, 40, 'tel')}
            </div>
            <p className="hint">{t.contactOnce}</p>
          </section>
        )}
        {error && (
          <div role="alert" className="alert">
            {t[error as keyof Dictionary] || t.genericError}
          </div>
        )}
        <button className="button" disabled={busy}>
          {busy ? t.working : ensemble ? t.saveChanges : t.newEnsemble}
        </button>
      </fieldset>
    </form>
  );
}

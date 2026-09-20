'use client';
import { dictionary, instruments, type Locale } from '@/lib/i18n';
import { ensembleTypes, seatingTemplate, type Chair, type EnsembleType } from '@/lib/seating';
export function SeatingEditor({
  locale,
  type,
  chairs,
  onChange,
}: {
  locale: Locale;
  type: EnsembleType;
  chairs: Chair[];
  onChange: (type: EnsembleType, chairs: Chair[]) => void;
}) {
  const t = dictionary(locale);
  function update(index: number, key: keyof Chair, value: string) {
    onChange(
      type,
      chairs.map((chair, i) => (i === index ? { ...chair, [key]: value } : chair)),
    );
  }
  return (
    <section className="form-panel">
      <h2>{t.seating}</h2>
      <p className="hint">{t.seatingHint}</p>
      <label className="field">
        {t.ensembleType}
        <select
          value={type}
          onChange={(e) => {
            const next = e.target.value as EnsembleType;
            if (!chairs.length || window.confirm(t.replaceSeating))
              onChange(next, seatingTemplate(next));
          }}
        >
          {Object.entries(ensembleTypes).map(([key, names]) => (
            <option key={key} value={key}>
              {names[locale === 'da' ? 1 : 0]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="button secondary small"
        style={{ margin: '16px 0' }}
        onClick={() => {
          if (!chairs.length || window.confirm(t.replaceSeating))
            onChange(type, seatingTemplate(type));
        }}
      >
        {t.applyTemplate}
      </button>
      {chairs.map((chair, index) => (
        <div className="chair-editor-row" key={index}>
          <label className="field">
            {t.instrument}
            <select
              value={chair.instrument}
              onChange={(e) => update(index, 'instrument', e.target.value)}
            >
              {Object.entries(instruments).map(([key, names]) => (
                <option key={key} value={key}>
                  {names[locale === 'da' ? 1 : 0]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t.chairEnglish}
            <input
              required
              maxLength={100}
              value={chair.en}
              onChange={(e) => update(index, 'en', e.target.value)}
            />
          </label>
          <label className="field">
            {t.chairDanish}
            <input
              required
              maxLength={100}
              value={chair.da}
              onChange={(e) => update(index, 'da', e.target.value)}
            />
          </label>
          <button
            className="button secondary small"
            type="button"
            aria-label={`${t.removeChair} ${index + 1}`}
            onClick={() =>
              onChange(
                type,
                chairs.filter((_, i) => i !== index),
              )
            }
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="button secondary small"
        type="button"
        disabled={chairs.length >= 100}
        onClick={() => onChange(type, [...chairs, { instrument: 'other', en: '', da: '' }])}
      >
        {t.addChair}
      </button>
    </section>
  );
}

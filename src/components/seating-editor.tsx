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
  const suggestions = [
    ...Object.keys(ensembleTypes).flatMap((key) => seatingTemplate(key as EnsembleType)),
    ...Object.entries(instruments).map(([instrument, names]) => ({
      instrument,
      en: names[0],
      da: names[1],
    })),
  ];
  const labels = [...new Set(suggestions.map((chair) => chair[locale]))];
  function update(index: number, value: string) {
    const known = suggestions.find(
      (chair) => chair[locale].toLowerCase() === value.trim().toLowerCase(),
    );
    onChange(
      type,
      chairs.map((chair, i) =>
        i === index ? (known ? { ...known } : { ...chair, en: value, da: value }) : chair,
      ),
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
      {type !== 'custom' && (
        <button
          type="button"
          className="button secondary small"
          style={{ margin: '16px 0', display: 'block' }}
          onClick={() => {
            if (!chairs.length || window.confirm(t.replaceSeating))
              onChange(type, seatingTemplate(type));
          }}
        >
          {t.applyTemplate}
        </button>
      )}
      <datalist id="chair-suggestions">
        {labels.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      {chairs.map((chair, index) => (
        <div className="chair-editor-row" key={index}>
          <label className="field">
            {t.chairName}
            <input
              required
              maxLength={100}
              list="chair-suggestions"
              value={chair[locale]}
              onChange={(e) => update(index, e.target.value)}
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
        style={{ marginTop: 16 }}
        onClick={() => onChange(type, [...chairs, { instrument: 'other', en: '', da: '' }])}
      >
        {t.addChair}
      </button>
    </section>
  );
}

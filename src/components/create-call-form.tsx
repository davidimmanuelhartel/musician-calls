'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, X } from 'lucide-react';
import { dictionary, instruments, type Locale, type Dictionary } from '@/lib/i18n';
import { MAX_FILE_SIZE, callSchema, eventTimes } from '@/lib/domain';
import { type Ensemble, ensembleDefaults } from '@/lib/ensembles';
import { readSeating, chairLabel } from '@/lib/seating';
import { VenueField } from '@/components/venue-field';
import { clearDraft, readDraft, writeDraft } from '@/lib/draft';
import { supabaseBrowser } from '@/lib/supabase/client';
import { publishCall } from '@/app/actions';
export function CreateCallForm({
  locale,
  user,
  ensemble,
}: {
  locale: Locale;
  user: { id: string; email: string; name: string; phone: string };
  ensemble: Ensemble;
}) {
  const t = dictionary(locale);
  const chairs = readSeating(ensemble.seating);
  const [customChair, setCustomChair] = useState(false);
  const router = useRouter();
  const scope = `call:${user.id}:${ensemble.id}`;
  const serializedDefaults = JSON.stringify({
    instrument: '',
    position: '',
    date: '',
    call_time: '',
    performance_time: '',
    repertoire: '',
    ...ensembleDefaults(ensemble),
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    readDraft(scope)
      .then((d) => {
        if (!live) return;
        setValues({
          ...JSON.parse(serializedDefaults),
          ...d?.values,
          description: [d?.values.description, d?.values.repertoire].filter(Boolean).join('\n\n'),
          repertoire: '',
          id: d?.values.id || crypto.randomUUID(),
        });
        setFiles(d?.files || []);
        setReady(true);
      })
      .catch(() => {
        if (!live) return;
        setValues({ ...JSON.parse(serializedDefaults), id: crypto.randomUUID() });
        setError('storageError');
        setReady(true);
      });
    return () => {
      live = false;
    };
  }, [scope, serializedDefaults]);
  useEffect(() => {
    if (!ready) return;
    let live = true;
    writeDraft(scope, { values, files })
      .then(() => {
        if (live) setSaved(true);
      })
      .catch(() => {
        if (live) {
          setSaved(false);
          setError('storageError');
        }
      });
    return () => {
      live = false;
    };
  }, [scope, values, files, ready]);
  function change(name: string, value: string) {
    setSaved(false);
    setValues((v) => ({ ...v, [name]: value }));
  }
  function field(name: string, label: string, type = 'text', required = false, maxLength = 200) {
    return (
      <label className="field">
        <span className="field-label">
          {label}
          {required ? ' *' : <small>{t.optional}</small>}
        </span>
        <input
          name={name}
          type={type}
          value={values[name] || ''}
          onChange={(e) => change(name, e.target.value)}
          required={required}
          maxLength={maxLength}
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0.01' : undefined}
          max={type === 'number' ? '1000000' : undefined}
        />
      </label>
    );
  }
  async function addFiles(incomingList: FileList | null) {
    if (!incomingList) return;
    const incoming = Array.from(incomingList);
    if (
      files.length + incoming.length > 10 ||
      incoming.some(
        (f) =>
          !f.size ||
          f.size > MAX_FILE_SIZE ||
          !f.name.toLowerCase().endsWith('.pdf') ||
          f.name.length > 200,
      )
    ) {
      setError('fileError');
      return;
    }
    for (const file of incoming) {
      if ((await file.slice(0, 5).text()) !== '%PDF-') {
        setError('fileError');
        return;
      }
    }
    setError('');
    setSaved(false);
    setFiles((f) => [...f, ...incoming]);
    if (fileInput.current) fileInput.current.value = '';
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const input = { ...values, ensemble_id: ensemble.id };
      const parsed = callSchema.safeParse(input);
      if (!parsed.success) {
        setError('required');
        return;
      }
      try {
        eventTimes(parsed.data);
      } catch {
        setError('pastError');
        return;
      }
      await writeDraft(scope, { values, files });
      const db = supabaseBrowser();
      const existing = await db
        .from('calls')
        .select('id')
        .eq('id', values.id)
        .eq('organizer_id', user.id)
        .eq('ensemble_id', ensemble.id)
        .maybeSingle();
      if (existing.data) {
        setReady(false);
        await clearDraft(scope).catch(() => undefined);
        router.push(`/${locale}/calls/${values.id}?published=1`);
        return;
      }
      const uploaded: {
        filename: string;
        storage_path: string;
        size: number;
        content_type: 'application/pdf';
      }[] = [];
      for (const file of files) {
        const path = `${user.id}/${values.id}/${crypto.randomUUID()}.pdf`;
        const { error: uploadError } = await db.storage
          .from('call-pdfs')
          .upload(path, file, { contentType: 'application/pdf', upsert: false });
        if (uploadError) {
          if (uploaded.length)
            await db.storage.from('call-pdfs').remove(uploaded.map((f) => f.storage_path));
          setError('uploadError');
          return;
        }
        uploaded.push({
          filename: file.name,
          storage_path: path,
          size: file.size,
          content_type: 'application/pdf',
        });
      }
      const result = await publishCall(input, uploaded);
      if (result.error) {
        if (uploaded.length)
          await db.storage.from('call-pdfs').remove(uploaded.map((f) => f.storage_path));
        setError(result.error);
        return;
      }
      setReady(false);
      await clearDraft(scope).catch(() => undefined);
      router.push(`/${locale}/calls/${result.id}?published=1`);
    } catch {
      setError('genericError');
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <p aria-live="polite">{t.working}</p>;
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <section className="form-panel">
          <h2>{t.basics}</h2>
          <div className="form-grid">
            {chairs.length > 0 && (
              <label className="field full">
                {t.savedChair} *
                <select
                  value={
                    customChair
                      ? 'custom'
                      : String(
                          chairs.findIndex(
                            (c) =>
                              c.instrument === values.instrument &&
                              (c.en === values.position || c.da === values.position),
                          ),
                        )
                  }
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setCustomChair(true);
                      return;
                    }
                    const chair = chairs[Number(e.target.value)];
                    if (chair) {
                      setCustomChair(false);
                      setSaved(false);
                      setValues((v) => ({
                        ...v,
                        instrument: chair.instrument,
                        position: chairLabel(chair, locale),
                      }));
                    }
                  }}
                >
                  <option value="-1" disabled>
                    {t.chooseChair}
                  </option>
                  {chairs.map((chair, index) => (
                    <option key={index} value={index}>
                      {chairLabel(chair, locale)}
                    </option>
                  ))}
                  <option value="custom">{t.customChair}</option>
                </select>
              </label>
            )}
            {(chairs.length === 0 ||
              customChair ||
              (!!values.instrument &&
                !chairs.some(
                  (c) =>
                    c.instrument === values.instrument &&
                    (c.en === values.position || c.da === values.position),
                ))) && (
              <>
                <label className="field">
                  {t.instrument} *
                  <select
                    name="instrument"
                    value={values.instrument}
                    onChange={(e) => change('instrument', e.target.value)}
                    required
                  >
                    <option value="">{t.chooseInstrument}</option>
                    {Object.entries(instruments).map(([id, names]) => (
                      <option key={id} value={id}>
                        {names[locale === 'da' ? 1 : 0]}
                      </option>
                    ))}
                  </select>
                </label>
                {field('position', t.position, 'text', false, 100)}
              </>
            )}
            {field('date', t.date, 'date', true)}
            {field('call_time', t.callTime, 'time', true)}
            {field('performance_time', t.performance, 'time')}
          </div>
          <p className="hint">{t.timezone}</p>
        </section>
        <section className="form-panel">
          <h2>{t.sharedDefaults}</h2>
          <div className="saved-defaults">
            <strong>{ensemble.name}</strong>
            <span>{values.venue}</span>
            {values.address && <span>{values.address}</span>}
          </div>
          <p className="hint">{t.savedDetails}</p>
          <details className="call-overrides">
            <summary>{t.changeCallDetails}</summary>
            <p className="hint">{t.callOnlyChanges}</p>
            <VenueField
              locale={locale}
              venue={values.venue}
              address={values.address}
              onChange={(venue, address) => {
                setSaved(false);
                setValues((v) => ({ ...v, venue, address }));
              }}
            />
          </details>
        </section>
        <section className="form-panel">
          <h2>{t.callDetails}</h2>
          <div className="form-grid">
            <label className="field">
              {t.compensation}
              <select
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
                {field('compensation_amount', t.amount, 'number', true, 12)}
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
          <label className="field" style={{ marginTop: 20 }}>
            <span className="field-label">
              {t.information} <small>{t.optional}</small>
            </span>
            <textarea
              name="description"
              value={values.description}
              onChange={(e) => change('description', e.target.value)}
              maxLength={5000}
            />
          </label>
        </section>
        <section className="form-panel">
          <h2>{t.attachments}</h2>
          <label className="field">
            {t.addFiles}
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(e) => void addFiles(e.target.files)}
            />
          </label>
          <p className="hint">{t.pdfHint}</p>
          <div className="file-list">
            {files.map((file, i) => (
              <div className="file-row" key={`${file.name}-${i}`}>
                <span className="file-name">
                  <FileText />
                  {file.name}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${t.remove} ${file.name}`}
                  onClick={() => {
                    setSaved(false);
                    setFiles((f) => f.filter((_, index) => index !== i));
                  }}
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        </section>
        <p className="hint">
          {t.postedBy} <strong>{user.name}</strong> · {user.email}
          <br />
          {t.teamContact}
        </p>
        {error && (
          <div className="alert" role="alert">
            {t[error as keyof Dictionary] || t.genericError}
          </div>
        )}
        <div className="submit-row">
          <p className="hint" role="status">
            {saved ? t.draftSaved : ''}
          </p>
          <button className="button" disabled={busy}>
            {busy ? t.publishing : t.publish}
            <ArrowRight />
          </button>
        </div>
      </fieldset>
    </form>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, X } from 'lucide-react';
import { dictionary, instruments, type Locale, type Dictionary } from '@/lib/i18n';
import { MAX_FILE_SIZE, callSchema, eventTimes } from '@/lib/domain';
import { clearDraft, readDraft, writeDraft } from '@/lib/draft';
import { supabaseBrowser } from '@/lib/supabase/client';
import { publishCall, sendMagicLink } from '@/app/actions';
const defaults: Record<string, string> = {
  ensemble_name: '',
  instrument: '',
  position: '',
  date: '',
  call_time: '',
  performance_time: '',
  venue: '',
  address: '',
  repertoire: '',
  description: '',
  compensation_type: 'negotiable',
  compensation_amount: '',
  currency: 'DKK',
  organizer_name: '',
  organizer_email: '',
  organizer_phone: '',
};
export function CreateCallForm({
  locale,
  user,
}: {
  locale: Locale;
  user: { id: string; email: string; name: string; phone: string } | null;
}) {
  const t = dictionary(locale);
  const router = useRouter();
  const [values, setValues] = useState(defaults);
  const [files, setFiles] = useState<File[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    readDraft()
      .then((d) => {
        if (!live) return;
        setValues({
          ...defaults,
          ...d?.values,
          id: d?.values.id || crypto.randomUUID(),
          organizer_email: user?.email || d?.values.organizer_email || '',
          organizer_name: d?.values.organizer_name || user?.name || '',
          organizer_phone: d?.values.organizer_phone || user?.phone || '',
        });
        setFiles(d?.files || []);
        setReady(true);
      })
      .catch(() => {
        if (live) {
          setValues({
            ...defaults,
            id: crypto.randomUUID(),
            organizer_email: user?.email || '',
            organizer_name: user?.name || '',
            organizer_phone: user?.phone || '',
          });
          setError('storageError');
          setReady(true);
        }
      });
    return () => {
      live = false;
    };
  }, [user]);
  useEffect(() => {
    if (!ready) return;
    let current = true;
    writeDraft({ values, files })
      .then(() => {
        if (current) setSaved(true);
      })
      .catch(() => {
        if (current) {
          setSaved(false);
          setError('storageError');
        }
      });
    return () => {
      current = false;
    };
  }, [values, files, ready]);
  function change(name: string, value: string) {
    setSaved(false);
    setValues((v) => ({ ...v, [name]: value }));
  }
  function field(name: string, label: string, type = 'text', required = false, maxLength = 200) {
    return (
      <label className="field">
        {label}
        {required ? ' *' : <small>{t.optional}</small>}
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
          readOnly={name === 'organizer_email' && !!user}
          autoComplete={
            name === 'organizer_email'
              ? 'email'
              : name === 'organizer_name'
                ? 'name'
                : name === 'organizer_phone'
                  ? 'tel'
                  : undefined
          }
        />
      </label>
    );
  }
  async function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const incoming = Array.from(newFiles);
    if (
      files.length + incoming.length > 10 ||
      incoming.some(
        (f) =>
          f.size === 0 ||
          f.size > MAX_FILE_SIZE ||
          !f.name.toLowerCase().endsWith('.pdf') ||
          f.name.length > 200,
      )
    ) {
      setError('fileError');
      return;
    }
    for (const file of incoming) {
      const header = await file.slice(0, 5).text();
      if (header !== '%PDF-') {
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
      const parsed = callSchema.safeParse(values);
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
      await writeDraft({ values, files });
      if (!user) {
        const result = await sendMagicLink(locale, values.organizer_email, `/${locale}/calls/new`);
        if (result.error) setError(result.error);
        else setSent(true);
        return;
      }
      const db = supabaseBrowser();
      const uploaded: {
        filename: string;
        storage_path: string;
        size: number;
        content_type: 'application/pdf';
      }[] = [];
      // Check for an already published call after a lost response before uploading again.
      const existing = await db
        .from('calls')
        .select('id')
        .eq('id', values.id)
        .eq('organizer_id', user.id)
        .maybeSingle();
      if (existing.data) {
        setReady(false);
        await clearDraft().catch(() => undefined);
        router.push(`/${locale}/calls/${values.id}?published=1`);
        return;
      }
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
      const result = await publishCall(values, uploaded);
      if (result.error) {
        await db.storage.from('call-pdfs').remove(uploaded.map((f) => f.storage_path));
        setError(result.error);
        return;
      }
      setReady(false);
      await clearDraft().catch(() => undefined);
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
          <h2>01 / {t.basics}</h2>
          <div className="form-grid">
            {field('ensemble_name', t.ensemble, 'text', true, 150)}
            <label className="field">
              {t.instrument} *
              <select
                name="instrument"
                required
                value={values.instrument}
                onChange={(e) => change('instrument', e.target.value)}
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
            {field('date', t.date, 'date', true)}
            {field('call_time', t.callTime, 'time', true)}
            {field('performance_time', t.performance, 'time')}
            {field('venue', t.venue, 'text', true)}
            {field('address', t.address, 'text', false, 300)}
          </div>
          <p className="hint">{t.timezone}</p>
        </section>
        <section className="form-panel">
          <h2>02 / {t.details}</h2>
          <div className="form-grid">
            <label className="field">
              {t.compensation}
              <select
                name="compensation_type"
                value={values.compensation_type}
                onChange={(e) => change('compensation_type', e.target.value)}
              >
                <option value="negotiable">{t.negotiable}</option>
                <option value="paid">{t.paid}</option>
                <option value="unpaid">{t.unpaid}</option>
              </select>
            </label>
            {values.compensation_type === 'paid' && (
              <>
                {field('compensation_amount', t.amount, 'number', true, 12)}
                <label className="field">
                  {t.currency}
                  <select
                    name="currency"
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
            {[
              ['repertoire', t.repertoire, 3000],
              ['description', t.information, 5000],
            ].map(([name, label, max]) => (
              <label className="field full" key={String(name)}>
                {label}
                <small>{t.optional}</small>
                <textarea
                  name={String(name)}
                  value={values[name] || ''}
                  maxLength={Number(max)}
                  onChange={(e) => change(String(name), e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
        <section className="form-panel">
          <h2>03 / {t.attachments}</h2>
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
                  {file.name} <small>({(file.size / 1024 / 1024).toFixed(1)} MB)</small>
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${t.remove} ${file.name}`}
                  onClick={() => {
                    setSaved(false);
                    setFiles((f) => f.filter((_, index) => i !== index));
                  }}
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="form-panel">
          <h2>04 / {t.contact}</h2>
          <div className="form-grid">
            {field('organizer_name', t.name, 'text', true, 100)}
            {field('organizer_email', t.email, 'email', true, 254)}
            {field('organizer_phone', t.phone, 'tel', false, 40)}
          </div>
          <p className="hint">{t.privateContact}</p>
        </section>
        {error && (
          <div className="alert" role="alert">
            {t[error as keyof Dictionary] || t.genericError}
          </div>
        )}
        {sent && (
          <div className="alert success" role="status">
            <strong>{t.checkEmail}</strong>
            <br />
            {t.checkEmailText}
          </div>
        )}
        <div className="submit-row">
          <p className="hint" role="status">
            {saved ? t.draftSaved : ''}
          </p>
          <button className="button" disabled={busy}>
            {busy ? t.publishing : user ? t.publish : t.verifyPublish}
            <ArrowRight />
          </button>
        </div>
      </fieldset>
    </form>
  );
}

'use client';
import { useEffect, useId, useState } from 'react';
import { dictionary, type Locale } from '@/lib/i18n';
import { searchVenues, type VenueResult } from '@/app/venue-actions';
export function VenueField({
  locale,
  venue,
  address,
  onChange,
}: {
  locale: Locale;
  venue: string;
  address: string;
  onChange: (venue: string, address: string) => void;
}) {
  const t = dictionary(locale);
  const id = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<VenueResult[]>([]);
  const [status, setStatus] = useState('');
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (query === null || query.trim().length < 3) return;
    let live = true;
    const timer = setTimeout(async () => {
      const response = await searchVenues(query, locale);
      if (!live) return;
      setResults(response.results);
      setStatus(
        response.error ? 'venueUnavailable' : response.results.length ? '' : 'venueNoResults',
      );
    }, 450);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, locale]);
  function select(result: VenueResult) {
    onChange(result.venue, result.address);
    setQuery(null);
    setResults([]);
    setStatus('');
    setActive(-1);
  }
  return (
    <div className="venue-field">
      <label className="field" htmlFor={id}>
        {t.venue} *
      </label>
      <input
        id={id}
        name="venue"
        required
        maxLength={200}
        autoComplete="off"
        placeholder={t.venueSearch}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={results.length > 0}
        aria-controls={`${id}-results`}
        aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
        aria-describedby={`${id}-hint`}
        value={venue}
        onChange={(e) => {
          onChange(e.target.value, '');
          setQuery(e.target.value);
          setResults([]);
          setActive(-1);
          setStatus(e.target.value.trim().length >= 3 ? 'venueSearching' : '');
        }}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
            setResults([]);
            setActive(-1);
            setQuery(null);
            setStatus('');
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setResults([]);
            setActive(-1);
            setQuery(null);
            setStatus('');
            setActive(-1);
          }
          if (results.length && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
            setActive(
              (i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length,
            );
          }
          if (e.key === 'Enter' && results.length) {
            e.preventDefault();
            select(results[active < 0 ? 0 : active]);
          }
        }}
      />
      {results.length > 0 && (
        <ul
          id={`${id}-results`}
          role="listbox"
          className="venue-results"
          aria-label={t.venueSearch}
        >
          {results.map((result, index) => (
            <li
              key={`${result.venue}-${result.address}`}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(result)}
            >
              <strong>{result.venue}</strong>
              <span>{result.address}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="hint" id={`${id}-hint`}>
        {t.venueHint}
      </p>
      {status && (
        <p className="hint" role="status">
          {t[status as 'venueSearching' | 'venueUnavailable' | 'venueNoResults']}
        </p>
      )}
      {address && <p className="venue-address">{address}</p>}
      <details className="venue-manual">
        <summary>{t.venueManual}</summary>
        <label className="field">
          {t.address}
          <input
            name="address"
            maxLength={300}
            value={address}
            autoComplete="street-address"
            onChange={(e) => onChange(venue, e.target.value)}
          />
        </label>
      </details>
      <p className="venue-credit">
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{' '}
        ·{' '}
        <a href="https://photon.komoot.io" target="_blank" rel="noreferrer">
          Photon
        </a>
      </p>
    </div>
  );
}

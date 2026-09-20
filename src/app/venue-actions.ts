'use server';
import { currentUser } from '@/lib/supabase/server';
export type VenueResult = { venue: string; address: string };
export async function searchVenues(
  query: string,
  locale: string,
): Promise<{ results: VenueResult[]; error?: boolean }> {
  if (
    typeof query !== 'string' ||
    query.trim().length < 3 ||
    query.length > 200 ||
    !(await currentUser())
  )
    return { results: [] };
  try {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', query.trim());
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycode', 'DK');
    if (locale === 'en') url.searchParams.set('lang', 'en');
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
      headers: { 'User-Agent': 'Tutti-Local-POC/0.1' },
    });
    if (!response.ok) throw new Error('Search unavailable');
    const data = await response.json();
    const results: VenueResult[] = [];
    for (const feature of data.features || []) {
      const p = feature.properties;
      if (!p || p.countrycode?.toUpperCase() !== 'DK') continue;
      const street = [p.street || (p.type === 'street' ? p.name : ''), p.housenumber]
        .filter(Boolean)
        .join(' ');
      const city = [p.postcode, p.city || p.town || p.village || p.district]
        .filter(Boolean)
        .join(' ');
      const address = [street, city, locale === 'da' ? 'Danmark' : 'Denmark']
        .filter(Boolean)
        .join(', ');
      const venue = p.name || street;
      if (venue && !results.some((r) => r.venue === venue && r.address === address))
        results.push({ venue: String(venue).slice(0, 200), address: address.slice(0, 300) });
    }
    return { results };
  } catch {
    return { results: [], error: true };
  }
}

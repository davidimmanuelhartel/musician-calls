import 'server-only';
import type { Database } from '@/lib/database.types';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export async function supabaseServer() {
  const jar = await cookies();
  if (!configured()) throw new Error('configuration');
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            /* Proxy handles refresh in server components. */
          }
        },
      },
    },
  );
}
export function supabaseAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('configuration');
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function currentUser() {
  if (!configured()) return null;
  const db = await supabaseServer();
  return (await db.auth.getUser()).data.user;
}

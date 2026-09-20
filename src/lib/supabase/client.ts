'use client';
import type { Database } from '@/lib/database.types';
import { createBrowserClient } from '@supabase/ssr';
export function supabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

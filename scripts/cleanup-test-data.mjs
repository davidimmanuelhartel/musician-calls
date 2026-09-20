import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Cleanup is restricted to local Supabase.');
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [];
for (let page = 1; ; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  users.push(...data.users);
  if (data.users.length < 1000) break;
}
const fixtures = users.filter((user) =>
  /^(?:ensemble-test-[0-9a-f-]{36}|policy-[0-9a-f-]{36}|organizer-[0-9a-f]{8})@example\.com$/.test(
    user.email || '',
  ),
);
let removed = 0;
for (const user of fixtures) {
  const { data: calls, error: readError } = await db
    .from('calls')
    .select('id')
    .eq('organizer_id', user.id);
  if (readError) throw readError;
  for (const call of calls) {
    const { data: files, error: filesError } = await db
      .from('attachments')
      .select('storage_path')
      .eq('call_id', call.id);
    if (filesError) throw filesError;
    if (files.length) {
      const { error } = await db.storage
        .from('call-pdfs')
        .remove(files.map((file) => file.storage_path));
      if (error) throw error;
    }
    const { error } = await db.from('calls').delete().eq('id', call.id);
    if (error) throw error;
  }
}
for (const user of fixtures) {
  const { error: ensembleError } = await db.from('ensembles').delete().eq('owner_id', user.id);
  if (ensembleError) throw ensembleError;
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw error;
  removed++;
}
console.log(
  `Removed ${removed} synthetic test accounts and their calls/ensembles. Other local accounts and calls were preserved.`,
);

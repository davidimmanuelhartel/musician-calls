import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const anon = createClient(url, key, options);
async function organizer() {
  const email = `policy-${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const db = createClient(url, key, options);
  const auth = await db.auth.verifyOtp({ type: 'email', token_hash: data.properties.hashed_token });
  if (auth.error) throw auth.error;
  return { db, id: auth.data.user!.id };
}
async function publish(db: typeof anon) {
  const id = crypto.randomUUID();
  const { data, error } = await db.rpc('publish_call', {
    payload: {
      id,
      ensemble_name: 'Permissions test',
      instrument: 'trombone',
      call_at: new Date(Date.now() + 86400000).toISOString(),
      performance_at: null,
      venue: 'Test venue',
      compensation_type: 'unpaid',
      compensation_amount: null,
      currency: null,
      organizer_name: 'Private organizer',
      organizer_phone: '+4512345678',
    },
    files: [],
  });
  if (error) throw error;
  return data as string;
}
async function respond(
  call: string,
  email = `test-${crypto.randomUUID()}@example.com`,
  ip = crypto.randomUUID(),
) {
  return admin.rpc('submit_response', {
    payload: {
      call_id: call,
      name: 'Private musician',
      email,
      phone: '+4598765432',
      availability: 'available',
    },
    ip_hash: ip,
  });
}

test('database ownership, anonymous access, duplicates and atomic selection', async () => {
  const owner = await organizer();
  const stranger = await organizer();
  const call = await publish(owner.db);
  const foreignCall = await publish(stranger.db);
  const publicData = await anon.from('calls').select('*').eq('id', call).single();
  expect(publicData.error).toBeNull();
  expect(publicData.data).not.toHaveProperty('organizer_email');
  expect(publicData.data).not.toHaveProperty('organizer_phone');
  expect((await anon.from('responses').select('*')).error).not.toBeNull();
  expect((await anon.from('call_contacts').select('*')).error).not.toBeNull();
  const email = `duplicate-${crypto.randomUUID()}@example.com`;
  expect((await respond(call, email)).error).toBeNull();
  expect((await respond(call, email.toUpperCase())).error?.code).toBe('23505');
  expect((await respond(call)).error).toBeNull();
  expect((await respond(foreignCall)).error).toBeNull();
  const ownResponses = await owner.db.from('responses').select('*').eq('call_id', call);
  expect(ownResponses.data).toHaveLength(2);
  expect((await stranger.db.from('responses').select('*').eq('call_id', call)).data).toHaveLength(
    0,
  );
  expect(
    (await stranger.db.from('call_contacts').select('*').eq('call_id', call)).data,
  ).toHaveLength(0);
  const ids = ownResponses.data!.map((r) => r.id);
  expect(
    (await stranger.db.rpc('select_musician', { call_id: call, response_id: ids[0] })).error
      ?.message,
  ).toContain('unauthorized');
  const foreignResponse = (
    await stranger.db.from('responses').select('id').eq('call_id', foreignCall).single()
  ).data!.id;
  expect(
    (await owner.db.rpc('select_musician', { call_id: call, response_id: foreignResponse })).error
      ?.message,
  ).toContain('invalid_response');
  expect(
    (
      await anon.rpc('submit_response', {
        payload: {
          call_id: call,
          name: 'Bypass',
          email: 'bypass@example.com',
          availability: 'available',
        },
        ip_hash: 'bypass',
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await owner.db
        .from('calls')
        .update({ status: 'filled', filled_at: new Date().toISOString() })
        .eq('id', call)
    ).error,
  ).not.toBeNull();
  const selected = await Promise.all(
    ids.map((id) => owner.db.rpc('select_musician', { call_id: call, response_id: id })),
  );
  expect(selected.filter((r) => !r.error)).toHaveLength(1);
  expect(
    (await owner.db.from('responses').select('id').eq('call_id', call).eq('selected', true)).data,
  ).toHaveLength(1);
  expect((await respond(call)).error?.message).toContain('closed');
});

test('expired calls reject responses and selection; anonymous rate limit is shared across calls', async () => {
  const owner = await organizer();
  const call = await publish(owner.db);
  const ip = crypto.randomUUID();
  for (let i = 0; i < 5; i++)
    expect((await respond(call, `rate-${i}-${ip}@example.com`, ip)).error).toBeNull();
  expect((await respond(call, `rate-6-${ip}@example.com`, ip)).error?.message).toContain(
    'rate_limited',
  );
  const updated = await admin
    .from('calls')
    .update({ call_at: new Date(Date.now() - 86400000).toISOString() })
    .eq('id', call);
  expect(updated.error).toBeNull();
  expect((await respond(call)).error?.message).toContain('closed');
  const response = (
    await owner.db.from('responses').select('id').eq('call_id', call).limit(1).single()
  ).data!;
  expect(
    (await owner.db.rpc('select_musician', { call_id: call, response_id: response.id })).error
      ?.message,
  ).toContain('closed');
});

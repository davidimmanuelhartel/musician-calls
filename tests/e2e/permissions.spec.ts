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
const owners = new Map<string, typeof anon>();
const tokens = new Map<string, string>();
async function publish(db: typeof anon) {
  const id = crypto.randomUUID();
  const workspace = await db.rpc('save_ensemble', {
    payload: {
      id: crypto.randomUUID(),
      name: `Permissions test ${id}`,
      venue: 'Test venue',
      compensation_type: 'unpaid',
      organizer_name: 'Private organizer',
    },
  });
  if (workspace.error) throw workspace.error;
  const { data, error } = await db.rpc('publish_call', {
    payload: {
      id,
      ensemble_id: workspace.data,
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
  owners.set(data as string, db);
  return data as string;
}
async function respond(
  call: string,
  email = `test-${crypto.randomUUID()}@example.com`,
  ip = crypto.randomUUID(),
) {
  const tokenKey = `${call}:${email.toLowerCase()}`;
  let token = tokens.get(tokenKey);
  if (!token) {
    const db = owners.get(call)!;
    const c = (await db.from('calls').select('*').eq('id', call).single()).data!;
    const sub = await db.rpc('save_substitute', {
      ensemble: c.ensemble_id,
      payload: {
        id: crypto.randomUUID(),
        name: 'Private musician',
        instrument: c.instrument,
        phone: '+4598765432',
        email,
      },
    });
    if (sub.error) throw sub.error;
    const invitation = await db.rpc('invite_substitute', { call_id: call, substitute: sub.data });
    if (invitation.error) throw invitation.error;
    token = invitation.data;
    tokens.set(tokenKey, token!);
  }
  return admin.rpc('submit_response', {
    payload: {
      call_id: call,
      invite_token: token,
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
  expect(publicData.error).not.toBeNull();
  expect(publicData.data).toBeNull();
  expect((await stranger.db.from('calls').select('*').eq('id', call)).data).toEqual([]);
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
  expect((await respond(call, email)).error?.message).toContain('closed');
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
  expect((await respond(call, `rate-0-${ip}@example.com`, ip)).error?.message).toContain('closed');
  const response = (
    await owner.db.from('responses').select('id').eq('call_id', call).limit(1).single()
  ).data!;
  expect(
    (await owner.db.rpc('select_musician', { call_id: call, response_id: response.id })).error
      ?.message,
  ).toContain('closed');
});

test('private directory and invitations enforce membership, instrument, identity and revocation', async ({
  request,
}) => {
  const owner = await organizer();
  const outsider = await organizer();
  const call = await publish(owner.db);
  const otherCall = await publish(owner.db);
  const c = (await owner.db.from('calls').select('*').eq('id', call).single()).data!;
  const payload = {
    id: crypto.randomUUID(),
    name: 'Listed musician',
    instrument: 'trombone',
    phone: '+4512345678',
    email: 'listed@example.com',
  };
  expect(
    (await outsider.db.rpc('save_substitute', { ensemble: c.ensemble_id, payload })).error?.message,
  ).toContain('unauthorized');
  expect(
    (await owner.db.rpc('save_substitute', { ensemble: c.ensemble_id, payload })).error,
  ).toBeNull();
  expect((await anon.from('ensemble_substitutes').select('*')).error).not.toBeNull();
  expect(
    (await outsider.db.from('ensemble_substitutes').select('*').eq('id', payload.id)).data,
  ).toEqual([]);
  expect(
    (await outsider.db.rpc('invite_substitute', { call_id: call, substitute: payload.id })).error
      ?.message,
  ).toContain('unauthorized');
  expect(
    (await owner.db.rpc('invite_substitute', { call_id: otherCall, substitute: payload.id })).error
      ?.message,
  ).toContain('invalid_substitute');
  const wrong = { ...payload, id: crypto.randomUUID(), instrument: 'violin' };
  await owner.db.rpc('save_substitute', { ensemble: c.ensemble_id, payload: wrong });
  expect(
    (await owner.db.rpc('invite_substitute', { call_id: call, substitute: wrong.id })).error
      ?.message,
  ).toContain('invalid_substitute');
  const invite = async () => {
    const r = await owner.db.rpc('invite_substitute', { call_id: call, substitute: payload.id });
    expect(r.error).toBeNull();
    return r.data as string;
  };
  const submit = (token?: string, callId = call) =>
    admin.rpc('submit_response', {
      payload: {
        call_id: callId,
        invite_token: token,
        name: 'Forged identity',
        phone: '+4500000000',
        email: 'forged@example.com',
        availability: 'available',
      },
      ip_hash: crypto.randomUUID(),
    });
  expect((await submit()).error?.message).toContain('invalid_invitation');
  const oldToken = await invite();
  const token = await invite();
  expect((await submit(oldToken)).error?.message).toContain('invalid_invitation');
  expect((await submit(token, otherCall)).error?.message).toContain('invalid_invitation');
  expect((await request.get(`/en/calls/${call}`)).status()).toBe(404);
  expect((await request.get(`/en/calls/${call}?invite=${token}`)).status()).toBe(200);
  expect((await submit(token)).error).toBeNull();
  const response = (await owner.db.from('responses').select('*').eq('call_id', call).single())
    .data!;
  expect(response.name).toBe(payload.name);
  expect(response.email).toBe(payload.email);
  expect(response.phone).toBe(payload.phone);
  expect((await submit(token)).error?.code).toBe('23505');
  expect(
    (
      await owner.db.rpc('save_substitute', {
        ensemble: c.ensemble_id,
        payload: { ...payload, phone: '+4599999999' },
      })
    ).error,
  ).toBeNull();
  expect((await submit(token)).error?.message).toContain('invalid_invitation');
  expect((await request.get(`/en/calls/${call}?invite=${token}`)).status()).toBe(404);
  const expired = await invite();
  await admin
    .from('call_invitations')
    .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
    .eq('call_id', call)
    .eq('substitute_id', payload.id);
  expect((await submit(expired)).error?.message).toContain('invalid_invitation');
  expect((await request.get(`/en/calls/${call}?invite=${expired}`)).status()).toBe(404);
  const replacement = await invite();
  expect(
    (
      await outsider.db.rpc('remove_substitute', {
        ensemble: c.ensemble_id,
        substitute: payload.id,
      })
    ).error?.message,
  ).toContain('unauthorized');
  expect(
    (await owner.db.rpc('remove_substitute', { ensemble: c.ensemble_id, substitute: payload.id }))
      .error,
  ).toBeNull();
  expect((await request.get(`/en/calls/${call}?invite=${replacement}`)).status()).toBe(404);
  expect(
    (await owner.db.rpc('select_musician', { call_id: call, response_id: response.id })).error
      ?.message,
  ).toContain('invalid_response');
});

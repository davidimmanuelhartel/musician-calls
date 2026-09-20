import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const anon = createClient(url, key, options);
async function account() {
  const email = `ensemble-test-${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const db = createClient(url, key, options);
  const auth = await db.auth.verifyOtp({ type: 'email', token_hash: data.properties.hashed_token });
  if (auth.error) throw auth.error;
  return { db, id: auth.data.user!.id, email };
}
function ensemblePayload(name = `Private Ensemble ${crypto.randomUUID()}`) {
  return {
    id: crypto.randomUUID(),
    name,
    venue: 'Private rehearsal hall',
    address: 'Private address',
    description: 'Wear black. Bring a stand.',
    compensation_type: 'paid',
    compensation_amount: 800,
    currency: 'DKK',
    organizer_name: 'Ensemble Owner',
  };
}
async function createEnsemble(
  owner: Awaited<ReturnType<typeof account>>,
  payload = ensemblePayload(),
) {
  const { data, error } = await owner.db.rpc('save_ensemble', { payload });
  if (error) throw error;
  return { id: data as string, payload };
}
async function signIn(page: Page, email: string, next: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  await page.goto(
    `${process.env.APP_URL}/auth/confirm?locale=en&next=${encodeURIComponent(next)}&token_hash=${data.properties.hashed_token}`,
  );
  await page.waitForURL(`**${next}`);
}
function callPayload(ensemble_id?: string) {
  return {
    id: crypto.randomUUID(),
    ensemble_id,
    instrument: 'trombone',
    call_at: new Date(Date.now() + 86400000).toISOString(),
    performance_at: null,
  };
}

test('private ensemble membership gates calls, responses, defaults, edits, and removal', async () => {
  const owner = await account();
  const member = await account();
  const outsider = await account();
  const { id, payload } = await createEnsemble(owner);
  expect((await anon.from('ensembles').select('*')).error).not.toBeNull();
  expect((await outsider.db.from('ensembles').select('*').eq('id', id)).data).toEqual([]);
  expect(
    (await outsider.db.from('ensemble_members').select('*').eq('ensemble_id', id)).data,
  ).toEqual([]);
  expect((await outsider.db.rpc('ensemble_roster', { ensemble: id })).data).toEqual([]);
  expect((await owner.db.rpc('publish_call', { payload: callPayload() })).error?.message).toContain(
    'unauthorized',
  );
  expect(
    (await outsider.db.rpc('publish_call', { payload: callPayload(id) })).error?.message,
  ).toContain('unauthorized');
  expect(
    (await outsider.db.from('ensemble_members').insert({ ensemble_id: id, user_id: outsider.id }))
      .error,
  ).not.toBeNull();
  const invite = await owner.db.rpc('create_ensemble_invite', { ensemble: id });
  expect(invite.error).toBeNull();
  expect(
    (await member.db.rpc('join_ensemble', { token: invite.data, member_name: 'Member One' })).data,
  ).toBe(id);
  expect(
    (await member.db.rpc('join_ensemble', { token: invite.data, member_name: 'Member One' })).data,
  ).toBe(id);
  expect((await owner.db.rpc('ensemble_roster', { ensemble: id })).data).toHaveLength(2);
  expect((await member.db.from('ensemble_invites').select('*')).error).not.toBeNull();
  expect(
    (await member.db.rpc('create_ensemble_invite', { ensemble: id })).error?.message,
  ).toContain('unauthorized');
  expect(
    (
      await member.db.rpc('save_ensemble', {
        ensemble: id,
        payload: { ...payload, name: 'Attempted change' },
      })
    ).error?.message,
  ).toContain('unauthorized');
  const input = {
    ...callPayload(id),
    ensemble_name: 'Forged name',
    organizer_name: 'Forged person',
  };
  const published = await member.db.rpc('publish_call', { payload: input });
  expect(published.error).toBeNull();
  const callId = published.data;
  const call = (await anon.from('calls').select('*').eq('id', callId).single()).data!;
  expect(call.ensemble_name).toBe(payload.name);
  expect(call.venue).toBe(payload.venue);
  expect(call.compensation_amount).toBe(800);
  expect(call.organizer_id).toBe(member.id);
  const contact = (await owner.db.from('call_contacts').select('*').eq('call_id', callId).single())
    .data!;
  expect(contact.name).toBe('Member One');
  expect(contact.email).toBe(member.email);
  expect(
    (
      await owner.db.rpc('save_ensemble', {
        ensemble: id,
        payload: { ...payload, name: 'Updated ensemble', venue: 'New hall' },
      })
    ).error,
  ).toBeNull();
  const snapshot = (await anon.from('calls').select('*').eq('id', callId).single()).data!;
  expect(snapshot.ensemble_name).toBe(payload.name);
  expect(snapshot.venue).toBe(payload.venue);
  expect(
    (
      await admin.rpc('submit_response', {
        payload: {
          call_id: callId,
          name: 'Musician',
          email: `player-${crypto.randomUUID()}@example.com`,
          availability: 'available',
        },
        ip_hash: crypto.randomUUID(),
      })
    ).error,
  ).toBeNull();
  const response = (await owner.db.from('responses').select('*').eq('call_id', callId).single())
    .data!;
  expect(response.name).toBe('Musician');
  expect((await outsider.db.from('responses').select('*').eq('call_id', callId)).data).toEqual([]);
  expect(
    (await owner.db.rpc('select_musician', { call_id: callId, response_id: response.id })).error,
  ).toBeNull();
  expect(
    (await owner.db.rpc('remove_ensemble_member', { ensemble: id, member: owner.id })).error
      ?.message,
  ).toContain('unauthorized');
  expect(
    (await owner.db.rpc('remove_ensemble_member', { ensemble: id, member: member.id })).error,
  ).toBeNull();
  expect((await member.db.from('ensembles').select('*').eq('id', id)).data).toEqual([]);
  expect((await member.db.from('responses').select('*').eq('call_id', callId)).data).toEqual([]);
  expect(
    (await member.db.rpc('publish_call', { payload: callPayload(id) })).error?.message,
  ).toContain('unauthorized');
  expect(
    (await member.db.rpc('select_musician', { call_id: callId, response_id: response.id })).error
      ?.message,
  ).toContain('unauthorized');
  expect(
    (await member.db.rpc('join_ensemble', { token: invite.data, member_name: 'Member One' })).error
      ?.message,
  ).toContain('invalid_invite');
});

test('rotated and expired invitations cannot join; nonmembers cannot edit or delete members', async () => {
  const owner = await account();
  const member = await account();
  const { id, payload } = await createEnsemble(owner);
  const first = (await owner.db.rpc('create_ensemble_invite', { ensemble: id })).data;
  const second = (await owner.db.rpc('create_ensemble_invite', { ensemble: id })).data;
  expect(
    (await member.db.rpc('join_ensemble', { token: first, member_name: 'Musician' })).error
      ?.message,
  ).toContain('invalid_invite');
  expect(
    (await member.db.rpc('save_ensemble', { ensemble: id, payload })).error?.message,
  ).toContain('unauthorized');
  expect(
    (await member.db.rpc('remove_ensemble_member', { ensemble: id, member: owner.id })).error
      ?.message,
  ).toContain('unauthorized');
  expect(
    (
      await admin
        .from('ensemble_invites')
        .update({ expires_at: new Date(0).toISOString() })
        .eq('ensemble_id', id)
    ).error,
  ).toBeNull();
  expect(
    (await member.db.rpc('join_ensemble', { token: second, member_name: 'Musician' })).error
      ?.message,
  ).toContain('invalid_invite');
});

test('members join the existing private page and create simpler calls; drafts stay with their ensemble', async ({
  page,
  browser,
}) => {
  const owner = await account();
  const { id, payload } = await createEnsemble(owner);
  const second = await createEnsemble(owner, {
    ...ensemblePayload(),
    name: `Second ${crypto.randomUUID()}`,
    venue: 'Second venue',
  });
  await signIn(page, owner.email, `/en/ensembles/${id}`);
  await page.getByRole('button', { name: 'Create invite link', exact: true }).click();
  const invite = page.getByRole('textbox', { name: 'Create invite link', exact: true });
  await expect(invite).toHaveValue(/\/en\/join\//);
  const invitation = await invite.inputValue();
  const member = await account();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await context.newPage();
  await mp.goto(`${process.env.APP_URL}/en/ensembles/${id}`);
  await expect(mp).toHaveURL(/\/en\/login/);
  await expect(mp.getByText(payload.venue, { exact: true })).toHaveCount(0);
  await mp.goto(invitation);
  await expect(mp.getByRole('heading', { name: 'Join ensemble', exact: true })).toBeVisible();
  await expect(mp.getByText(payload.name, { exact: true })).toHaveCount(0);
  await signIn(mp, member.email, new URL(invitation).pathname);
  await mp.getByLabel('Your name').fill('Orchestra Member');
  await mp.getByRole('button', { name: 'Join ensemble', exact: true }).click();
  await expect(mp.getByRole('heading', { name: payload.name, exact: true })).toBeVisible();
  await expect(mp.getByRole('link', { name: 'Edit ensemble', exact: true })).toHaveCount(0);
  await expect(mp.getByRole('button', { name: 'Create invite link', exact: true })).toHaveCount(0);
  await mp.getByRole('link', { name: 'Find a substitute', exact: true }).last().click();
  await expect(mp).toHaveURL(new RegExp(`ensemble=${id}`));
  await expect(mp.getByLabel('Your name')).toHaveCount(0);
  await expect(mp.getByLabel('Ensemble name')).toHaveCount(0);
  await expect(mp.getByText(payload.venue, { exact: true })).toBeVisible();
  await mp.getByRole('combobox', { name: 'Instrument *', exact: true }).selectOption('violin');
  await mp
    .getByLabel('Date', { exact: false })
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await mp.getByLabel('Call time').fill('18:00');
  await mp.getByRole('button', { name: 'Publish call', exact: true }).click();
  await expect(mp.getByText('Call published', { exact: false }).first()).toBeVisible();
  const callId = new URL(mp.url()).pathname.split('/').pop()!;
  await page.reload();
  await expect(page.getByText('Violin', { exact: true })).toBeVisible();
  await page.goto(`/en/dashboard/${callId}`);
  await expect(page.getByRole('heading', { name: 'Responses (0)', exact: true })).toBeVisible();
  await page.goto(`/en/calls/new?ensemble=${id}`);
  await page.getByLabel('Position / chair').fill('First ensemble draft');
  await expect(page.getByText('Your draft is saved on this device.')).toBeVisible();
  await page.goto(`/en/calls/new?ensemble=${second.id}`);
  await expect(page.getByLabel('Position / chair')).toHaveValue('');
  await expect(page.getByText('Second venue', { exact: true })).toBeVisible();
  await page.getByLabel('Position / chair').fill('Second ensemble draft');
  await expect(page.getByText('Your draft is saved on this device.')).toBeVisible();
  await page.goto(`/en/calls/new?ensemble=${id}`);
  await expect(page.getByLabel('Position / chair')).toHaveValue('First ensemble draft');
  await mp.goto(`${process.env.APP_URL}/en/calls/new?ensemble=${second.id}`);
  await expect(mp.getByRole('button', { name: 'Publish call', exact: true })).toHaveCount(0);
  await page.goto(`/en/ensembles/${id}`);
  await page.screenshot({ path: 'test-results/ensemble-desktop.png', fullPage: true });
  await mp.goto(`${process.env.APP_URL}/da/ensembles/${id}`);
  await mp.screenshot({ path: 'test-results/ensemble-mobile.png', fullPage: true });
  expect(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

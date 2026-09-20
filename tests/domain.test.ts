import assert from 'node:assert/strict';
import { test } from 'node:test';
import { callStatus, eventTimes, responseSchema, safeNext, feeLabel } from '../src/lib/domain';
import { en, da } from '../src/lib/i18n';
test('expired is derived, filled remains filled after the event', () => {
  const past = new Date(0).toISOString();
  assert.equal(callStatus({ status: 'open', event_at: past }), 'expired');
  assert.equal(callStatus({ status: 'filled', event_at: past }), 'filled');
});
test('Copenhagen times use summer and winter offsets', () => {
  assert.equal(
    eventTimes({ date: '2030-07-01', call_time: '16:30', performance_time: '19:30' }, 0).call_at,
    '2030-07-01T14:30:00Z',
  );
  assert.equal(
    eventTimes({ date: '2030-01-01', call_time: '16:30', performance_time: '' }, 0).call_at,
    '2030-01-01T15:30:00Z',
  );
});
test('rejects nonexistent and ambiguous clock times and backwards performances', () => {
  assert.throws(() =>
    eventTimes({ date: '2026-03-29', call_time: '02:30', performance_time: '' }, 0),
  );
  assert.throws(() =>
    eventTimes({ date: '2026-10-25', call_time: '02:30', performance_time: '' }, 0),
  );
  assert.throws(() =>
    eventTimes({ date: '2030-01-01', call_time: '19:30', performance_time: '16:30' }, 0),
  );
});
test('uses performance as expiration, otherwise call time', () => {
  assert.doesNotThrow(() =>
    eventTimes(
      { date: '2030-01-01', call_time: '16:30', performance_time: '19:30' },
      Date.parse('2030-01-01T16:00:00Z'),
    ),
  );
  assert.throws(() =>
    eventTimes(
      { date: '2030-01-01', call_time: '16:30', performance_time: '' },
      Date.parse('2030-01-01T16:00:00Z'),
    ),
  );
});
test('auth return paths cannot redirect externally or outside the active language', () => {
  assert.equal(safeNext('//evil.example', 'en'), '/en/dashboard');
  assert.equal(safeNext('/da/calls/new', 'en'), '/en/dashboard');
  assert.equal(safeNext('/en/calls/new', 'en'), '/en/calls/new');
  assert.equal(safeNext('/en/calls/new?next=https://evil.example', 'en'), '/en/dashboard');
});
test('response validation normalizes email and catches bots and blank names', () => {
  const v = {
    call_id: crypto.randomUUID(),
    name: 'Musician',
    email: 'TEST@example.com',
    availability: 'available',
  };
  assert.equal(responseSchema.parse(v).email, 'test@example.com');
  assert.equal(responseSchema.safeParse({ ...v, website: 'bot' }).success, false);
  assert.equal(responseSchema.safeParse({ ...v, name: '  ' }).success, false);
});
test('every English message has Danish copy, with localized compensation', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(da).sort());
  assert.equal(
    feeLabel({ compensation_type: 'negotiable', compensation_amount: null, currency: null }, 'da'),
    'Efter aftale',
  );
});

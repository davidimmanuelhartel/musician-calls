import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ensembleTypes,
  seatingTemplate,
  seatingSchema,
  type EnsembleType,
} from '../src/lib/seating';
test('all ensemble templates contain valid bilingual chairs and the expected instrumentation', () => {
  for (const type of Object.keys(ensembleTypes) as EnsembleType[]) {
    const chairs = seatingTemplate(type);
    assert.equal(seatingSchema.safeParse(chairs).success, true, type);
    assert.equal(chairs.length > 0, type !== 'custom');
    assert.equal(new Set(chairs.map((c) => c.en)).size, chairs.length);
  }
  assert.equal(seatingTemplate('big_band').filter((c) => c.instrument === 'saxophone').length, 5);
  assert.equal(
    seatingTemplate('strings').some((c) => c.instrument === 'trumpet'),
    false,
  );
  assert.equal(
    seatingSchema.safeParse([{ instrument: 'invented', en: 'Chair', da: 'Stemme' }]).success,
    false,
  );
});

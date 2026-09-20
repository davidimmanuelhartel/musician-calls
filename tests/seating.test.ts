import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readSeating,
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

test('single chairs are unnumbered; multiple chairs and custom names retain their names', () => {
  const bigBand = seatingTemplate('big_band');
  assert.equal(bigBand.find((c) => c.instrument === 'piano')?.en, 'Piano');
  assert.equal(bigBand.find((c) => c.instrument === 'drums')?.da, 'Trommer');
  assert.deepEqual(
    bigBand.filter((c) => c.instrument === 'trombone').map((c) => c.en),
    ['Trombone 1', 'Trombone 2', 'Trombone 3'],
  );
  const legacy = { instrument: 'piano', en: 'Piano 1', da: 'Klaver 1' };
  assert.equal(readSeating([legacy])[0].da, 'Klaver');
  assert.equal(
    readSeating([legacy, { ...legacy, en: 'Piano 2', da: 'Klaver 2' }])[0].en,
    'Piano 1',
  );
  assert.equal(readSeating([{ ...legacy, en: 'Solo piano' }])[0].en, 'Solo piano');
});

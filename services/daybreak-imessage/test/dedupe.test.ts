import assert from 'node:assert/strict';
import test from 'node:test';
import { MessageDeduper } from '../src/dedupe.js';

test('suppresses in-flight and completed redeliveries but releases failures', () => {
  const deduper = new MessageDeduper(100, 10);
  assert.equal(deduper.begin('one', 1_000), true);
  assert.equal(deduper.begin('one', 1_000), false);
  deduper.release('one');
  assert.equal(deduper.begin('one', 1_001), true);
  deduper.complete('one', 1_002);
  assert.equal(deduper.begin('one', 1_050), false);
  assert.equal(deduper.begin('one', 1_103), true);
});

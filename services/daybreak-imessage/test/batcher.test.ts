import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';
import { MessageBatcher } from '../src/batcher.js';

test('debounces message bursts into one ordered turn per conversation', async () => {
  const batches: string[][] = [];
  const batcher = new MessageBatcher<string>(10, async (_key, items) => {
    batches.push(items.map((item) => item.text));
  });
  batcher.enqueue('chat-1', { value: 'a', text: 'hey' });
  batcher.enqueue('chat-1', { value: 'b', text: 'wait' });
  batcher.enqueue('chat-1', { value: 'c', text: 'NVDA news' });
  await wait(30);
  await batcher.stop();
  assert.deepEqual(batches, [['hey', 'wait', 'NVDA news']]);
});

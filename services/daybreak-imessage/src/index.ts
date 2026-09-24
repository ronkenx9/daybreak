import { Spectrum, type Message, type Space } from '@spectrum-ts/core';
import { imessage } from '@spectrum-ts/imessage';
import { MessageBatcher } from './batcher.js';
import { loadConfig } from './config.js';
import { DaybreakConversation } from './conversation.js';
import { DaybreakClient } from './daybreak-client.js';
import { startHealthServer } from './health.js';

const config = loadConfig();
let ready = false;
let stopping = false;
const health = startHealthServer(config.healthPort, () => ready && !stopping);

const app = await Spectrum({
  projectId: config.spectrumProjectId,
  projectSecret: config.spectrumProjectSecret,
  providers: [imessage.config()],
  telemetry: false,
  options: { logLevel: 'warn' },
});

const conversation = new DaybreakConversation(
  new DaybreakClient(config.apiBase, config.requestTimeoutMs),
  config.appBase,
  undefined,
  config.maxReplyChars,
);

const batcher = new MessageBatcher<{ space: Space; message: Message }>(
  config.debounceMs,
  async (spaceId, items) => {
    const latest = items.at(-1)?.value;
    if (!latest) return;
    const text = items.map((item) => item.text.trim()).filter(Boolean).join('\n');
    const response = await conversation.respond(text, spaceId);
    await latest.space.responding(async () => {
      await latest.message.read().catch(() => undefined);
      await latest.message.reply(response);
    });
  },
);

async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  ready = false;
  console.info(`[daybreak-imessage] stopping after ${signal}`);
  await batcher.stop();
  await app.stop();
  await new Promise<void>((resolve) => health.close(() => resolve()));
}

process.once('SIGINT', () => void shutdown('SIGINT').finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown('SIGTERM').finally(() => process.exit(0)));

ready = true;
console.info(`[daybreak-imessage] ready on Spectrum Cloud; health port ${config.healthPort}`);

try {
  for await (const [space, message] of app.messages) {
    if (stopping) break;
    if (message.platform !== 'imessage' || message.direction === 'outbound') continue;
    if (message.content.type !== 'text') {
      await message.reply('I can read text messages right now. Send “help” for Daybreak examples.').catch(() => undefined);
      continue;
    }
    batcher.enqueue(space.id, { value: { space, message }, text: message.content.text });
  }
} catch (error) {
  console.error('[daybreak-imessage] Spectrum stream stopped', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
} finally {
  await shutdown('stream end');
}

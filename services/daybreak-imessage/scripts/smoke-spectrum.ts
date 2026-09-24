import { Spectrum } from '@spectrum-ts/core';
import { imessage } from '@spectrum-ts/imessage';
import { loadConfig } from '../src/config.js';

const config = loadConfig();
const timeout = setTimeout(() => {
  console.error('Spectrum connection timed out');
  process.exit(1);
}, 20_000);

try {
  const app = await Spectrum({
    projectId: config.spectrumProjectId,
    projectSecret: config.spectrumProjectSecret,
    providers: [imessage.config()],
    telemetry: false,
    options: { logLevel: 'error' },
  });
  await app.stop();
  console.log('spectrum cloud connection verified');
} finally {
  clearTimeout(timeout);
}

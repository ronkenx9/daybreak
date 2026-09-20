import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../public/assets/daybreak-icon-v2.svg');
const assets = resolve(here, '../assets');
const mark = await readFile(source);
const canvas = (size, width) => sharp({ create: { width: size, height: size, channels: 4, background: '#FAFBFF' } })
  .composite([{ input: mark, left: (size - width) / 2, top: (size - width) / 2, density: Math.round(width / 64 * 72) }]);

await canvas(1024, 560).png().toFile(join(assets, 'icon.png'));
await canvas(1024, 450).png().toFile(join(assets, 'splash-icon.png'));
console.log('Daybreak iOS assets generated from the existing brand mark');

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const service = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(service, '../..');
const required = [
  'src/index.ts', 'src/config.ts', 'src/conversation.ts', 'src/daybreak-client.ts',
  'Dockerfile', '.dockerignore', '../../render.yaml', '.env.example', 'README.md', '../../docs/IMESSAGE-AGENT.md',
];
for (const file of required) {
  if (!existsSync(resolve(service, file))) throw new Error(`Missing ${file}`);
}

const pkg = JSON.parse(readFileSync(resolve(service, 'package.json'), 'utf8'));
if (pkg.dependencies?.['@spectrum-ts/core'] !== '12.2.0' || pkg.dependencies?.['@spectrum-ts/imessage'] !== '12.2.0') {
  throw new Error('Spectrum core and iMessage packages must be pinned to tested version 12.2.0');
}
if (!String(pkg.scripts?.start).includes('dist/src/index.js')) throw new Error('Production start script is not wired');

const example = readFileSync(resolve(service, '.env.example'), 'utf8');
if (!example.includes('SPECTRUM_PROJECT_SECRET=replace-with-spectrum-project-secret')) throw new Error('Secret example must remain a placeholder');

const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
if (tracked.includes('services/daybreak-imessage/.env.local')) throw new Error('.env.local must never be tracked');
for (const path of tracked) {
  const full = resolve(root, path);
  let source = '';
  try { source = readFileSync(full, 'utf8'); } catch { continue; }
  const assignments = source.match(/^\s*SPECTRUM_PROJECT_(?:ID|SECRET)\s*=\s*[^\s"']+/gm) ?? [];
  for (const assignment of assignments) {
    if (!assignment.includes('replace-with-')) throw new Error(`Possible Spectrum credential in tracked file: ${path}`);
  }
}

const dockerfile = readFileSync(resolve(service, 'Dockerfile'), 'utf8');
if (!dockerfile.includes('node:22-alpine') || !dockerfile.includes('USER node')) throw new Error('Docker runtime must use Node 22 and a non-root user');
const dockerignore = readFileSync(resolve(service, '.dockerignore'), 'utf8');
if (!dockerignore.split('\n').includes('.env.*')) throw new Error('Docker context must exclude local environment files');
const blueprint = readFileSync(resolve(root, 'render.yaml'), 'utf8');
if (!blueprint.includes('type: worker') || !blueprint.includes('services/daybreak-imessage/Dockerfile')) throw new Error('Render worker blueprint is not wired');
const docs = readFileSync(resolve(root, 'docs/IMESSAGE-AGENT.md'), 'utf8');
for (const phrase of ['persistent process', 'shared', 'dedicated', 'does not place trades']) {
  if (!docs.toLowerCase().includes(phrase)) throw new Error(`Docs missing: ${phrase}`);
}
console.log('imessage agent package verified');

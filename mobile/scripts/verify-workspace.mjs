import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const files = execFileSync(resolve(root, 'node_modules/.bin/tsc'), ['--listFilesOnly'], { cwd: root, encoding: 'utf8' }).split('\n');
assert(files.some((file) => file.endsWith('/app/page.tsx')), 'Web sources must remain in the root typecheck');
assert(!files.some((file) => file.includes('/dayworld/mobile/')), 'Mobile sources must be isolated from the web typecheck');
console.log('WEB_WORKSPACE_OK');

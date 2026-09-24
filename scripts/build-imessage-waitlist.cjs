const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
process.stdout.write(build.stdout || '');
process.stderr.write(build.stderr || '');
if (build.status !== 0) process.exit(build.status || 1);
for (const artifact of [
  '.next/server/app/imessage/page.js',
  '.next/server/app/api/imessage/waitlist/route.js',
]) {
  if (!existsSync(resolve(root, artifact))) {
    console.error(`missing production artifact: ${artifact}`);
    process.exit(1);
  }
}
console.log('imessage waitlist production build verified');

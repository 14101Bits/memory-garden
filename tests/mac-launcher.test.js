import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = ['macos/install.command', 'macos/launch.sh', 'macos/stop.command'];

test('all Mac shell scripts pass Bash syntax checks', () => {
  for (const script of scripts) {
    const result = spawnSync('bash', ['-n', join(root, script)], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${script}: ${result.stderr}`);
  }
});

test('launcher binds to loopback and does not use privileged commands', () => {
  const script = readFileSync(join(root, 'macos/launch.sh'), 'utf8');
  assert.match(script, /--bind 127\.0\.0\.1/);
  assert.match(script, /-a Anki/);
  assert.match(script, /iTCP:\"\$port\"/);
  assert.doesNotMatch(script, /\bsudo\b/);
});

test('AppleScript launcher compiles on macOS', { skip: process.platform !== 'darwin' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'memory-garden-applescript-'));
  try {
    const result = spawnSync('osacompile', ['-o', join(dir, 'Memory Garden.app'), join(root, 'macos/MemoryGarden.applescript')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installer creates a user-scoped app and preserves it when rerun', () => {
  const dir = mkdtempSync(join(tmpdir(), 'memory-garden-installer-'));
  const bin = join(dir, 'bin');
  const apps = join(dir, 'My Applications');
  try {
    mkdirSync(bin);
    writeFileSync(join(bin, 'uname'), '#!/bin/sh\necho Darwin\n');
    writeFileSync(join(bin, 'osacompile'), `#!/bin/sh\nif [ "$1" != "-o" ]; then exit 42; fi\nmkdir -p "$2/Contents/Resources"\n`);
    writeFileSync(join(bin, 'open'), '#!/bin/sh\nexit 0\n');
    for (const exe of ['uname', 'osacompile', 'open']) chmodSync(join(bin, exe), 0o755);
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, MEMORY_GARDEN_APPLICATIONS_DIR: apps };
    for (let i = 0; i < 2; i++) {
      const result = spawnSync('bash', [join(root, 'macos/install.command')], { encoding: 'utf8', env });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(readFileSync(join(apps, 'Memory Garden.app/Contents/Resources/project-root.txt'), 'utf8').trim(), root);
    }
    assert.ok(readdirSync(apps).some(name => /^Memory Garden\.backup\..+\.app$/.test(name)));
    assert.ok(existsSync(join(apps, 'Memory Garden.app')));
    rmSync(join(apps, 'Memory Garden.app'), { recursive: true });
    mkdirSync(join(apps, 'Memory Garden.app'));
    writeFileSync(join(apps, 'Memory Garden.app/keep-me.txt'), 'unrelated user app');
    const refused = spawnSync('bash', [join(root, 'macos/install.command')], { encoding: 'utf8', env });
    assert.equal(refused.status, 1);
    assert.equal(readFileSync(join(apps, 'Memory Garden.app/keep-me.txt'), 'utf8'), 'unrelated user app');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

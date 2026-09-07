import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from 'ink-testing-library';
import { SubScreen } from '../src/ui/app.mjs';

const tick = () => new Promise((r) => setTimeout(r, 75));

test('ui-set: setelah submit nama, ketikan value TIDAK masuk ke field nama', async () => {
  const { lastFrame, stdin } = render(
    React.createElement(SubScreen, { sub: { kind: 'set' }, passphrase: 'p', onBack: () => {} })
  );
  await tick();

  for (const ch of 'abc') { stdin.write(ch); await tick(); }
  stdin.write('\r');
  await tick();
  let frame = (await lastFrame()) || '';
  assert.ok(frame.includes('Value:'), 'must move to value step. Frame: ' + frame);

  for (const ch of 'xy') { stdin.write(ch); await tick(); }
  await tick();
  frame = (await lastFrame()) || '';
  assert.ok(frame.includes('Value: xy'), 'value field receives typing. Frame: ' + frame);
  assert.ok(frame.includes('Secret name: abc'), 'name field stays locked. Frame: ' + frame);
  assert.ok(!frame.includes('abcx'), 'name field must NOT receive value typing. Frame: ' + frame);
});

test('ui-set: alur lengkap set â†’ submit value tersimpan dan kembali', async () => {
  const dir = (await import('node:fs')).mkdtempSync((await import('node:path')).join((await import('node:os')).tmpdir(), 'keyr-set-'));
  process.env.KEYR_HOME = dir;
  const shared = await import('../src/commands/shared.js');
  shared.init('p');

  let backCalled = false;
  const { lastFrame, stdin } = render(
    React.createElement(SubScreen, { sub: { kind: 'set' }, passphrase: 'p', onBack: () => { backCalled = true; } })
  );
  await tick();
  for (const ch of 'k1') { stdin.write(ch); await tick(); }
  stdin.write('\r'); await tick();
  for (const ch of 'v1') { stdin.write(ch); await tick(); }
  stdin.write('\r'); await tick();
  const frame = (await lastFrame()) || '';
  assert.ok(frame.includes('saved.'), 'success result shows. Frame: ' + frame);
  assert.equal(shared.getSecret('k1', 'p'), 'v1', 'secret benar-benar tersimpan di vault');
});

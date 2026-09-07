import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as store from '../src/lib/store.js';

const PTR = 'store-test-pass';

test('store: vaultPath pakai KEYR_HOME when set, fallback ~/.keyr', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keyr-home-'));
  process.env.KEYR_HOME = dir;
  assert.equal(store.vaultPath(), join(dir, 'vault.json'));
  delete process.env.KEYR_HOME;
  const p = store.vaultPath();
  assert.ok(p.includes('.keyr'), 'path default mengandung .keyr');
  process.env.KEYR_HOME = dir; // restore supaya test lain tak kehilangan sandbox
});

test('store: exists() false saat does not exist, true setelah save', () => {
  process.env.KEYR_HOME = mkdtempSync(join(tmpdir(), 'keyr-home-'));
  assert.equal(store.exists(), false);
  store.save({ secrets: {} }, PTR);
  assert.equal(store.exists(), true);
});

test('store: save lalu load returns identical data', () => {
  process.env.KEYR_HOME = mkdtempSync(join(tmpdir(), 'keyr-home-'));

  const data = { secrets: { gh: 'ghp_xxx' } };
  store.save(data, PTR);
  assert.deepEqual(store.load(PTR), data);
});

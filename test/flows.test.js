import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as store from '../src/lib/store.js';
import { init, setSecret, getSecret, listSecrets, deleteSecret, exportSecrets } from '../src/commands/shared.js';

const PTR = 'flow-pass-1';
let home;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'keyr-cmd-'));
  process.env.KEYR_HOME = home;
});

test('flows: init â†’ set â†’ get â†’ list â†’ delete', () => {
  init(PTR);
  assert.ok(store.exists());

  setSecret('api-key', 'sk-123', PTR);
  assert.equal(getSecret('api-key', PTR), 'sk-123');

  const names = listSecrets(PTR);
  assert.ok(names.includes('api-key'));

  deleteSecret('api-key', PTR);
  assert.deepEqual(listSecrets(PTR), []);
});

test('flows: set menimpa secret yang sudah ada', () => {
  init(PTR);
  setSecret('k', 'v1', PTR);
  setSecret('k', 'v2', PTR);
  assert.equal(getSecret('k', PTR), 'v2');
});

test('flows: get missing secret â†’ error SECRET_NOT_FOUND', () => {
  init(PTR);
  assert.throws(() => getSecret('nope', PTR), /SECRET_NOT_FOUND/);
});

test('flows: commands without init â†’ error VAULT_NOT_FOUND', () => {
  assert.throws(() => getSecret('x', PTR), /VAULT_NOT_FOUND/);
  assert.throws(() => setSecret('x', 'y', PTR), /VAULT_NOT_FOUND/);
  assert.throws(() => listSecrets(PTR), /VAULT_NOT_FOUND/);
  assert.throws(() => deleteSecret('x', PTR), /VAULT_NOT_FOUND/);
  assert.throws(() => exportSecrets('out.json', PTR), /VAULT_NOT_FOUND/);
});

test('flows: export menulis file JSON plaintext berisi secrets', () => {
  init(PTR);
  setSecret('a', '1', PTR);
  setSecret('b', '2', PTR);
  const out = join(home, 'dump.json');
  exportSecrets(out, PTR);
  assert.ok(existsSync(out));
  const parsed = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(parsed, { a: '1', b: '2' });
});

test('flows: wrong passphrase on load â†’ ENCRYPTION_FAILED', () => {
  init(PTR);
  setSecret('k', 'v', PTR);
  assert.throws(() => getSecret('k', 'passphrase-salah'), /ENCRYPTION_FAILED/);
});

test('flows: export <name> <path> ekspor satu secret saja', () => {
  init(PTR);
  setSecret('a', '1', PTR);
  setSecret('b', '2', PTR);
  const out = join(home, 'one.json');
  exportSecrets(out, PTR, 'a');
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), { a: '1' });
  assert.throws(() => exportSecrets(join(home, 'x.json'), PTR, 'nope'), /SECRET_NOT_FOUND/);
});

test('flows: nama secret dipertahankan persis (case-sensitive)', () => {
  init(PTR);
  setSecret('GitHub_Token', 'v', PTR);
  assert.equal(getSecret('GitHub_Token', PTR), 'v');
  assert.throws(() => getSecret('github_token', PTR), /SECRET_NOT_FOUND/);
});

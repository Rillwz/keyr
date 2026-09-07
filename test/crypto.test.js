import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, chmodSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encryptVault, decryptVault } from '../src/lib/crypto.js';
import * as store from '../src/lib/store.js';

const PTR = 'test-passphrase-123';

test('crypto: encrypt/decrypt roundtrip mengembalikan data asli', (t) => {
  const data = { secrets: { 'openai-key': 'sk-abc123' } };
  const enc = encryptVault(data, PTR);
  const dec = decryptVault(enc, PTR);
  assert.deepEqual(dec, data);
});

test('crypto: passphrase salah ditolak (auth tag GCM)', (t) => {
  const enc = encryptVault({ secrets: {}, }, PTR);
  assert.throws(() => decryptVault(enc, 'wrong-pass'), /ENCRYPTION_FAILED/);
});

test('crypto: ciphertext yang dimanipulasi ditolak', (t) => {
  const enc = encryptVault({ secrets: { x: 'y' } }, PTR);
  const buf = Buffer.from(enc.ciphertext, 'base64');
  buf[0] = buf[0] ^ 0xff;
  enc.ciphertext = buf.toString('base64');
  assert.throws(() => decryptVault(enc, PTR), /ENCRYPTION_FAILED/);
});

test('crypto: IV baru setiap enkripsi (tidak pernah reuse)', (t) => {
  const enc1 = encryptVault({ secrets: {} }, PTR);
  const enc2 = encryptVault({ secrets: {} }, PTR);
  assert.notEqual(enc1.iv, enc2.iv);
  assert.notEqual(enc1.ciphertext, enc2.ciphertext);
});

test('crypto: salt berbeda antara vault baru', (t) => {
  const e1 = encryptVault({ secrets: {} }, PTR);
  const e2 = encryptVault({ secrets: {} }, PTR);
  assert.notEqual(e1.salt, e2.salt);
});

test('crypto: format output salt/iv/authTag/ciphertext base64', (t) => {
  const enc = encryptVault({ secrets: {} }, PTR);
  for (const field of ['salt', 'iv', 'authTag', 'ciphertext']) {
    assert.ok(typeof enc[field] === 'string', `field ${field} ada`);
    const buf = Buffer.from(enc[field], 'base64');
    assert.ok(buf.length > 0, `${field} valid base64`);
  }
  assert.equal(Buffer.from(enc.iv, 'base64').length, 12);
  assert.equal(Buffer.from(enc.salt, 'base64').length, 32);
  assert.equal(Buffer.from(enc.authTag, 'base64').length, 16);
});

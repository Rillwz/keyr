import fs from 'node:fs';
import * as store from '../lib/store.js';

export function init(passphrase) {
  if (store.exists()) {
    throw new Error('VAULT_EXISTS: Vault already exists. Use your existing passphrase.');
  }
  store.save({ secrets: {} }, passphrase);
  return true;
}

export function loadVault(passphrase) {
  return store.load(passphrase);
}

export function assertVaultExists() {
  if (!store.exists()) {
      throw new Error('VAULT_NOT_FOUND: No vault found. Run `keyr init` first.');
  }
}

function requireVault(passphrase) {
  assertVaultExists();
  return store.load(passphrase);
}

export function setSecret(name, value, passphrase) {
  const data = requireVault(passphrase);
  data.secrets[name] = value;
  store.save(data, passphrase);
}

export function getSecret(name, passphrase) {
  const data = requireVault(passphrase);
  const value = data.secrets[name];
  if (value === undefined) {
    throw new Error('SECRET_NOT_FOUND: Secret not found: ' + name);
  }
  return value;
}

export function listSecrets(passphrase) {
  const data = requireVault(passphrase);
  return Object.keys(data.secrets);
}

export function deleteSecret(name, passphrase) {
  const data = requireVault(passphrase);
  if (!(name in data.secrets)) {
    throw new Error('SECRET_NOT_FOUND: Secret not found: ' + name);
  }
  delete data.secrets[name];
  store.save(data, passphrase);
}

export function exportSecrets(filePath, passphrase, name) {
  const data = requireVault(passphrase);
  let payload;
  let count;
  if (name) {
    if (!(name in data.secrets)) {
      throw new Error('SECRET_NOT_FOUND: Secret not found: ' + name);
    }
    payload = { [name]: data.secrets[name] };
    count = 1;
  } else {
    payload = data.secrets;
    count = Object.keys(data.secrets).length;
  }
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), { mode: 0o600 });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // best-effort di Windows
  }
  return count;
}

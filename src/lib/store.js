import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { encryptVault, decryptVault } from './crypto.js';

export function vaultPath() {
  const home = process.env.KEYR_HOME || path.join(os.homedir(), '.keyr');
  return path.join(home, 'vault.json');
}

export function exists() {
  return fs.existsSync(vaultPath());
}

export function save(data, passphrase) {
  const enc = encryptVault(data, passphrase);
  const file = vaultPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(enc, null, 2), { mode: 0o600 });
  // chmod best-effort: di Windows mode fd sering diabaikan, jadi chmod eksplisit
  // dan EPERM diabaikan (NTFS ACL sudah membatasi ke user saat ini secara default)
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // best-effort saja
  }
  return enc;
}

export function load(passphrase) {
  const file = vaultPath();
  if (!fs.existsSync(file)) {
    throw new Error('VAULT_NOT_FOUND: No vault found. Run `keyr init` first.');
  }
  const vault = JSON.parse(fs.readFileSync(file, 'utf8'));
  return decryptVault(vault, passphrase);
}

export function remove() {
  const file = vaultPath();
  if (!fs.existsSync(file)) return false;
  fs.rmSync(file, { force: true });
  return true;
}

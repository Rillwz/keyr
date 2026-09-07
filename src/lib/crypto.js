import crypto from 'node:crypto';

const SCRYPT_N = 16384;      // 2^14 (~50ms di laptop modern)
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 32;           // AES-256
const SALT_LEN = 32;
const IV_LEN = 12;           // GCM standar 96-bit

export function encryptVault(data, passphrase) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = crypto.scryptSync(passphrase, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(data);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    kdf: { alg: 'scrypt', N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, keylen: KEYLEN },
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptVault(vault, passphrase) {
  const { salt, iv, authTag, ciphertext, kdf } = vault;
  const key = crypto.scryptSync(
    passphrase, Buffer.from(salt, 'base64'), kdf?.keylen ?? KEYLEN,
    { N: kdf?.N ?? SCRYPT_N, r: kdf?.r ?? SCRYPT_R, p: kdf?.p ?? SCRYPT_P }
  );
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  let plaintext;
  try {
    plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]);
  } catch {
    // JANGAN bocorkan detail teknis (auth tag mismatch, dsb)
    const err = new Error('ENCRYPTION_FAILED: wrong passphrase or corrupted vault');
    throw err;
  }
  return JSON.parse(plaintext.toString('utf8'));
}

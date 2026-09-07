import { password, confirm } from '@inquirer/prompts';

// Scripting mode: KEYR_PASSPHRASE env (like bw CLI's BW_SESSION).
// Never passed as CLI argument so it does not leak into shell history.
function fromEnv() {
  return process.env.KEYR_PASSPHRASE || null;
}

export async function promptPassphrase() {
  return fromEnv() || password({
    message: 'Passphrase:',
    mask: '*',
    validate: (v) => (v.length === 0 ? 'Passphrase must not be empty' : true),
  });
}

export async function promptSecretValue(existing) {
  // Masked per spec: secret values must not sit on screen or scrollback
  return password({
    message: 'Secret value:',
    mask: '*',
  });
}

export async function promptConfirmDelete(name) {
  return confirm({
    message: `Delete secret "${name}"?`,
    default: false,
  });
}

export async function promptInitPassphrase() {
  return fromEnv() || password({
    message: 'Create vault passphrase:',
    mask: '*',
    validate: (v) => (v.length < 8 ? 'Must be at least 8 characters' : true),
  });
}

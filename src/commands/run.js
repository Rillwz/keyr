import { spawn } from 'node:child_process';
import { loadVault } from './shared.js';

// Spawn a command with vault secrets injected as env vars.
// Child inherits stdio so interactive UIs (opencode TUI) work normally.
export function runWithSecrets(commandParts, passphrase) {
  const data = loadVault(passphrase);
  const secrets = data.secrets ?? {};
  const count = Object.keys(secrets).length;
  // Quote parts with spaces ourselves; single string avoids Node's
  // DEP0190 (args array + shell:true) and cmd.exe space-splitting.
  const cmdline = commandParts.map((p) => (/[\s"]/.test(p) ? `"${p.replace(/"/g, '\\"')}"` : p)).join(' ');
  const child = spawn(cmdline, {
    stdio: 'inherit',
    shell: true, // Windows: resolve .cmd shims (opencode, npm tools)
    env: { ...process.env, ...secrets },
  });
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, count }));
  });
}

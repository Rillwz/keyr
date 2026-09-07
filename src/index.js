#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import gradient from 'gradient-string';
import ora from 'ora';
import * as store from './lib/store.js';
import { init, setSecret, getSecret, listSecrets, deleteSecret, exportSecrets, resetVault } from './commands/shared.js';
import { runWithSecrets } from './commands/run.js';
import {
  promptPassphrase,
  promptSecretValue,
  promptConfirmDelete,
  promptInitPassphrase,
} from './commands/prompts.js';
import { runInteractive } from './ui/app.mjs';

const program = new Command();
const DIE = '✗';

function banner() {
  console.log(gradient(['#8a2be2', '#4169e1'])('  KEYR'));
  console.log(gradient(['#8a2be2', '#4169e1'])('  personal secret manager'));
  console.log('');
}

function spinner(text) {
  return ora({ text, spinner: 'dots', stream: process.stderr, isEnabled: true });
}

async function withVaultRead(action) {
  const passphrase = await promptPassphrase();
  const s = spinner('Unlocking vault...');
  s.start();
  try {
    const result = await action(passphrase);
    s.succeed(chalk.green('Done.'));
    return result;
  } catch (err) {
    s.fail(chalk.red('Failed.'));
    throw err;
  }
}

async function cmdInit() {
  banner();
  if (store.exists()) {
    console.log(chalk.yellow('! Vault already exists at ' + store.vaultPath()));
    return;
  }
  const passphrase = await promptInitPassphrase();
  const s = spinner('Creating vault...');
  s.start();
  try {
    await init(passphrase);
    s.succeed(chalk.green('Vault created at ' + store.vaultPath()));
  } catch (err) {
    s.fail(chalk.red('Failed to create vault.'));
    throw err;
  }
}

async function cmdSet(name, value) {
  banner();
  let finalValue = value;
  if (finalValue === undefined) {
    finalValue = await promptSecretValue();
  }
  const passphrase = await promptPassphrase();
  const s = spinner('Saving secret...');
  s.start();
  try {
    setSecret(name, finalValue, passphrase);
    s.succeed(chalk.green(`Secret "${name}" saved.`));
  } catch (err) {
    s.fail(chalk.red('Failed to save.'));
    throw err;
  }
}

async function cmdGet(name) {
  banner();
  const value = await withVaultRead((p) => getSecret(name, p));
  console.log(value); // raw value: safe to pipe
}

async function cmdList() {
  banner();
  const names = await withVaultRead((p) => listSecrets(p));
  if (names.length === 0) {
    console.log(chalk.yellow('Vault is empty.'));
    return;
  }
  for (const n of names) console.log('• ' + n);
}

async function cmdDelete(name, skipConfirm) {
  banner();
  if (!skipConfirm && !(await promptConfirmDelete(name))) {
    console.log(chalk.yellow('Cancelled.'));
    return;
  }
  await withVaultRead(async (p) => {
    deleteSecret(name, p);
  });
  console.log(chalk.green(`Secret "${name}" deleted.`));
}

async function cmdExport(name, filePath) {
  banner();
  const passphrase = await promptPassphrase();
  const s = spinner('Exporting...');
  s.start();
  try {
    await exportSecrets(filePath, passphrase, name);
    s.succeed(chalk.green(`Secret "${name}" exported to ${filePath}`));
    console.log(chalk.yellow('! This is a plaintext file - do not commit; delete after use.'));
  } catch (err) {
    s.fail(chalk.red('Failed to export.'));
    throw err;
  }
}

async function cmdReset() {
  banner();
  if (!store.exists()) {
    console.log(chalk.yellow('No vault found - nothing to reset.'));
    return;
  }
  console.log(chalk.yellow('! This permanently deletes ALL secrets. There is no recovery.'));
  if (!(await promptConfirmDelete('ENTIRE vault'))) {
    console.log(chalk.yellow('Cancelled.'));
    return;
  }
  resetVault();
  console.log(chalk.green('Vault deleted. Run `keyr init` to start fresh.'));
}

async function cmdRun(commandParts) {  banner();
  const passphrase = await promptPassphrase();
  const { code, count } = await runWithSecrets(commandParts, passphrase);
  console.log(chalk.dim(`Injected ${count} secret(s) into the child process environment.`));
  process.exit(code ?? 1);
}

program
  .name('keyr')
  .description('Local encrypted personal secret manager (AES-256-GCM)')
  .version('1.0.0')
  .enablePositionalOptions();

program
  .command('init')
  .description('Create a new vault')
  .action(() => guard(cmdInit));

program
  .command('set <name> [value]')
  .description('Save a secret (no value = masked prompt)')
  .action((name, value) => guard(() => cmdSet(name, value)));

program
  .command('get <name>')
  .description('Read a secret (raw output, safe to pipe)')
  .action((name) => guard(() => cmdGet(name)));

program
  .command('list')
  .description('List secret names')
  .action(() => guard(cmdList));

program
  .command('delete <name>')
  .description('Delete a secret (with confirmation; --yes to skip)')
  .option('--yes', 'Skip confirmation (for scripting)')
  .action((name, opts) => guard(() => cmdDelete(name, opts.yes)));

program
  .command('export <name> <path>')
  .description('Export a secret to a plaintext JSON file')
  .action((name, filePath) => guard(() => cmdExport(name, filePath)));

program
  .command('run <command...>')
  .description('Run a command with vault secrets as environment variables')
  .passThroughOptions()
  .action((commandParts) => guard(() => cmdRun(commandParts)));

program
  .command('reset')
  .description('Permanently delete the entire vault (no recovery)')
  .action(() => guard(cmdReset));

function guard(fn) {
  Promise.resolve()
    .then(fn)
    .catch((err) => {
      const msg = err?.message || String(err);
      if (msg.startsWith('VAULT_NOT_FOUND')) {
        console.error(chalk.red(DIE + ' No vault found. Run `keyr init` first.'));
        process.exit(1);
      }
      if (msg.startsWith('SECRET_NOT_FOUND')) {
        console.error(chalk.red(DIE + ' ' + msg.split(': ').slice(1).join(': ')));
        process.exit(1);
      }
      if (msg.startsWith('ENCRYPTION_FAILED')) {
        console.error(chalk.red(DIE + ' Wrong passphrase or corrupted vault.'));
        process.exit(1);
      }
      console.error(chalk.red(DIE + ' Error: ' + msg));
      process.exit(1);
    });
}

// Interactive mode when no arguments
if (process.argv.length <= 2) {
  if (!process.stdin.isTTY) {
    console.error(chalk.red(DIE + ' Interactive mode requires a terminal (TTY). Use `keyr <command>` for scripting.'));
    process.exit(1);
  }
  runInteractive();
} else {
  program.parseAsync(process.argv);
}

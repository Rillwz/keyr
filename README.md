# Keyr

Personal secret manager CLI — a free, self-hosted alternative to Bitwarden CLI for your private API keys and secrets (AI API keys, GitHub tokens, etc). Encrypted on your own machine: **no server, no account, no cost**.

- **AES-256-GCM** encryption (Node.js built-in `crypto` — no GPG, no system dependencies)
- **scrypt** key derivation, random per-vault salt, fresh IV on every write
- Single vault file: `~/.keyr/vault.json` — easy to back up, easy to delete
- Cross-platform: Windows / macOS / Linux
- Two modes: interactive menu (Ink) and direct commands for scripting (Commander)

## Install

Requires Node.js ≥ 18.

```bash
npm install
npm link          # make `keyr` available globally
```

## Usage

### Interactive mode

```bash
keyr
```

Shows the gradient banner + arrow-key menu: List Secrets, Get Secret, Set Secret, Delete Secret, Export to File, Quit.

### Direct commands (scripting)

```bash
keyr init                     # create a new vault (passphrase min 8 chars, masked)
keyr set <name> [value]       # save a secret; no value = masked prompt
keyr get <name>               # print raw value (safe to pipe)
keyr list                     # list secret names
keyr delete <name>            # delete (y/N confirmation)
keyr delete <name> --yes      # delete without confirmation (scripting)
keyr export <name> <path>     # export one secret to a plaintext JSON file
keyr run <command...>         # run a command with all secrets as env vars
keyr reset                    # permanently delete the entire vault (no recovery)
```

First-run walkthrough:

```bash
keyr init
keyr set test-key "hello"
keyr get test-key        # → hello
keyr list                # → • test-key
keyr delete test-key     # → y
```

Pipe into other tools:

```bash
keyr get github-token | gh auth login --with-token
OPENAI_API_KEY=$(keyr get openai-key)
```

### Run any command with your secrets as env vars

`keyr run` opens the vault once, injects every secret as an environment variable into a child process, and hands the terminal over. Secrets live in process memory only — they never touch the disk in plaintext and disappear when the process exits.

```bash
keyr run opencode                    # run opencode with all secrets in env
keyr run node script.js              # works with anything
```

This pairs with config files that support `{env:VAR}` substitution (OpenCode, and many other tools). Point the config at the variable name instead of the real key:

```jsonc
// opencode.jsonc — a reference, not a secret; safe to keep in sync/backup
{
  "provider": {
    "hive-ai": {
      "options": { "apiKey": "{env:HIVE_API_KEY}" }
    }
  }
}
```

Store the real value once in the vault (`keyr set HIVE_API_KEY`), then launch the tool through `keyr run`. The tool reads the config, substitutes `{env:HIVE_API_KEY}` from its environment, and the key stays out of every file.

- Secrets are inherited only by the launched process (and its own children)
- The child's exit code is propagated, so scripts can rely on it
- Note: any process running as the same user can read a child's environment — this narrows exposure compared to plaintext config files, it is not protection against active malware on your machine

### Scripting without interactive prompts

The passphrase can come from an environment variable (like bw CLI's `BW_SESSION` — never a CLI argument, so it does not leak into shell history):

```powershell
# PowerShell
$env:KEYR_PASSPHRASE = "..."
keyr list --yes
```

```bash
# bash
KEYR_PASSPHRASE="..." keyr list
```

> `KEYR_PASSPHRASE` lives in the shell process memory only; Keyr never writes it to disk.

## Vault format

`~/.keyr/vault.json` (or `%USERPROFILE%\.keyr\vault.json` on Windows):

```json
{
  "version": 1,
  "kdf": { "alg": "scrypt", "N": 16384, "r": 8, "p": 1, "keylen": 32 },
  "salt":      "<base64, random per vault, not a secret>",
  "iv":        "<base64, fresh on every write>",
  "authTag":   "<base64>",
  "ciphertext":"<base64, JSON { secrets: { name: value } }>"
}
```

- The passphrase is **never** written to disk, logs, or CLI arguments.
- Wrong passphrase / corrupted vault → generic error message, no technical details leaked.

## Windows notes (security vs compatibility trade-off)

- `chmod 0o600` on NTFS is **best-effort**: Windows has no POSIX permission bits. The default NTFS ACL already restricts the file to the creating user, so the residual risk is small. On macOS/Linux `0o600` is fully enforced.
- The passphrase is always asked via a masked prompt (not a CLI argument) so it stays out of shell history on every platform.

## Development

```bash
npm test          # unit + flow tests (node --test, no framework)
npm run build     # bundle the Ink UI (src/ui/App.jsx → src/ui/app.mjs via esbuild)
npm run ui        # run interactive mode
```

Structure:

```
src/
  index.js        # Commander entry point + banner + spinners
  lib/
    crypto.js     # encryptVault() / decryptVault() AES-256-GCM + scrypt
    store.js      # vault.json read/write, best-effort chmod
  commands/
    shared.js     # init/set/get/list/delete/export logic
    run.js        # keyr run — spawn a command with secrets as env vars
    prompts.js    # masked prompts (@inquirer/prompts)
  ui/
    App.jsx       # root Ink component (interactive mode)
    MainMenu.jsx / PromptPassphrase.jsx / SubScreen.jsx
test/             # node:test
```

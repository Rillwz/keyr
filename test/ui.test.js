import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from 'ink-testing-library';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { App } from '../src/ui/app.mjs';
import * as store from '../src/lib/store.js';

test('ui: vault sudah ada â†’ shows passphrase screen (not blank)', async () => {
  process.env.KEYR_HOME = mkdtempSync(join(tmpdir(), 'keyr-ui-'));
  store.save({ secrets: {} }, 'debugpass'); // precondition: vault ada
  const { lastFrame } = render(React.createElement(App));
  const frame = (await lastFrame()) || '';
  assert.ok(frame.includes('Passphrase'), 'frame must contain Passphrase prompt');
});

test('ui: vault belum ada â†’ shows welcome screen with Create Vault', async () => {
  process.env.KEYR_HOME = mkdtempSync(join(tmpdir(), 'keyr-ui-'));
  const { lastFrame } = render(React.createElement(App));
  await lastFrame();
  const frame = (await lastFrame()) || '';
  assert.ok(frame.includes('No vault found'), 'frame must contain welcome message');
  assert.ok(frame.includes('Create Vault'), 'frame must contain Create Vault menu');
});

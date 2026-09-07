import React, { useState } from 'react';
import { render, Text, Box } from 'ink';
import TextInput from 'ink-text-input';
import MainMenu from './MainMenu.jsx';
import PromptPassphrase from './PromptPassphrase.jsx';
import SubScreen from './SubScreen.jsx';
export { SubScreen };
import * as store from '../lib/store.js';
import { init, setSecret, getSecret, listSecrets, deleteSecret } from '../commands/shared.js';
import gradient from 'gradient-string';

const GRADIENT = gradient(['#8a2be2', '#4169e1']);

const MENU_ITEMS = [
  { label: 'List Secrets', value: 'list' },
  { label: 'Get Secret', value: 'get' },
  { label: 'Set Secret', value: 'set' },
  { label: 'Delete Secret', value: 'delete' },
  { label: 'Export to File', value: 'export' },
  { label: 'Quit', value: 'quit' },
];

const CREATE_ITEMS = [
  { label: 'Create Vault', value: 'create' },
  { label: 'Quit', value: 'quit' },
];

export function runInteractive() {
  render(<App />);
}

export { App };

function App() {
  const [screen, setScreen] = useState(() => (store.exists() ? 'passphrase' : 'welcome'));
  const [passphrase, setPassphrase] = useState(null);
  const [message, setMessage] = useState(null);
  const [sub, setSub] = useState(null);

  const showMsg = (type, text) => setMessage({ type, text });

  const banner = (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{GRADIENT('  KEYR — personal secret manager')}</Text>
    </Box>
  );

  let notice = null;
  if (message) {
    const color = message.type === 'error' ? 'red' : message.type === 'warn' ? 'yellow' : 'green';
    notice = <Text color={color}>{message.text}</Text>;
  }

  function handleQuit() {
    process.exit(0);
  }

  const tryUnlock = (pass) => {
    if (!pass) return;
    try {
      listSecrets(pass); // dekripsi percobaan: passphrase benar?
      setPassphrase(pass);
      setScreen('menu');
      setMessage(null);
    } catch {
      showMsg('error', 'Wrong passphrase or corrupted vault.');
    }
  };

  if (screen === 'passphrase') {
    return (
      <Box flexDirection="column">
        {banner}
        <Text bold>Enter your passphrase to unlock the vault:</Text>
        <PromptPassphrase label="Passphrase" onSubmit={tryUnlock} />
        {notice}
      </Box>
    );
  }

  if (screen === 'welcome') {
    return (
      <Box flexDirection="column">
        {banner}
        <Text>No vault found. Run `keyr init` first - or create one now:</Text>
        <MainMenu items={CREATE_ITEMS} onSelect={(v) => (v === 'quit' ? handleQuit() : setScreen('init'))} />
        <Text> </Text>
        {notice}
      </Box>
    );
  }

  if (screen === 'init') {
    return (
      <Box flexDirection="column">
        {banner}
        <Text bold>Create vault passphrase (min 8 characters):</Text>
        <PromptPassphrase
          label="Passphrase"
          onSubmit={(pass) => {
            if (pass.length < 8) {
              showMsg('error', 'Must be at least 8 characters.');
              return;
            }
            try {
              init(pass);
              setPassphrase(pass);
              setScreen('menu');
              showMsg('ok', 'Vault created.');
            } catch {
              showMsg('error', 'Failed to create vault.');
            }
          }}
        />
        {notice}
      </Box>
    );
  }

  if (sub) {
    return (
      <Box flexDirection="column">
        {banner}
        <SubScreen sub={sub} passphrase={passphrase} onBack={() => { setSub(null); }} />
        {notice}
      </Box>
    );
  }

  if (screen === 'menu') {
    return (
      <Box flexDirection="column">
        {banner}
        <MainMenu
          items={MENU_ITEMS}
          onSelect={(v) => {
            if (v === 'quit') return handleQuit();
            if (v === 'list') {
              try {
                const names = listSecrets(passphrase);
                showMsg('ok', names.length ? names.join('  ') : 'Vault is empty.');
              } catch {
                showMsg('error', 'Failed to unlock vault.');
              }
              return;
            }
            setSub({ kind: v });
          }}
        />
        <Text> </Text>
        {notice}
      </Box>
    );
  }

  return null;
}


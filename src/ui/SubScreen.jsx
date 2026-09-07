import React, { useState, useRef } from 'react';
import { Text, Box } from 'ink';
import TextInput from 'ink-text-input';
import { getSecret, setSecret, deleteSecret, exportSecrets } from '../commands/shared.js';

// One action per screen (get/set/delete/export), step-by-step wizard:
// 'input' -> (set/export: 'value') -> 'result'.
// IMPORTANT: there must be exactly ONE TextInput for the lifetime of the screen
// (never unmount/remount), because in Ink every useInput receives the same key
// during a transition frame - swapping input components caused double typing
// (bug: value keystrokes leaked into the name field).
export default function SubScreen({ sub, passphrase, onBack }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'value' | 'result'
  const [result, setResult] = useState(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  const label = { get: 'Secret name', set: 'Secret name', delete: 'Secret name', export: 'File path' }[sub.kind];

  function run() {
    const n = name.trim();
    try {
      if (sub.kind === 'get') {
        setResult({ type: 'ok', text: getSecret(n, passphrase) });
      } else if (sub.kind === 'delete') {
        deleteSecret(n, passphrase);
        setResult({ type: 'ok', text: `Secret "${n}" deleted.` });
      } else if (sub.kind === 'set') {
        setSecret(n, value, passphrase);
        setResult({ type: 'ok', text: `Secret "${n}" saved.` });
      } else if (sub.kind === 'export') {
        exportSecrets(value.trim(), passphrase, n);
        setResult({ type: 'ok', text: `Secret "${n}" exported to ${value.trim()}` });
      }
      setStep('result');
    } catch (e) {
      setResult({ type: 'error', text: e?.message || 'Failed.' });
      setStep('result');
    }
  }

  function handleSubmit() {
    if (stepRef.current === 'input') {
      if (!name.trim()) return onBack();
      if (sub.kind === 'set' || sub.kind === 'export') {
        setStep('value');
      } else {
        run();
      }
      return;
    }
    run(); // step 'value'
  }

  if (step === 'result') {
    return <ResultScreen result={result} onBack={onBack} />;
  }

  const askingValue = step === 'value';

  return (
    <Box flexDirection="column">
      <Text bold>{sub.kind}:</Text>
      {askingValue ? <Text>{label}: {name}</Text> : null}
      <Box>
        <Text>{askingValue ? 'Value: ' : label + ': '}</Text>
        <TextInput
          value={askingValue ? value : name}
          onChange={askingValue ? setValue : setName}
          onSubmit={handleSubmit}
        />
      </Box>
      <Text dimColor>Enter = continue, empty + Enter = back</Text>
    </Box>
  );
}

function ResultScreen({ result, onBack }) {
  const [dummy, setDummy] = useState('');
  const color = result.type === 'error' ? 'red' : 'green';
  return (
    <Box flexDirection="column">
      <Text color={color}>{String(result.text)}</Text>
      <Text dimColor>Press Enter to go back</Text>
      <TextInput value={dummy} onChange={setDummy} onSubmit={onBack} />
    </Box>
  );
}

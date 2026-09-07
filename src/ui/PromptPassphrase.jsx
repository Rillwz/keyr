import React, { useState } from 'react';
import { Text, Box } from 'ink';
import TextInput from 'ink-text-input';

export default function PromptPassphrase({ label, mode, onSubmit }) {
  const [value, setValue] = useState('');

  return (
    <Box>
      <Text color="cyan">{label}:{' '}</Text>
      <TextInput
        value={value}
        onChange={setValue}
        mask="*"
        placeholder=""
        onSubmit={() => {
          if (value.length > 0) onSubmit(value);
        }}
      />
    </Box>
  );
}

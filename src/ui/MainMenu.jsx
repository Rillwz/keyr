import React from 'react';
import { Text, Box } from 'ink';
import SelectInput from 'ink-select-input';

export default function MainMenu({ items, onSelect }) {
  return (
    <SelectInput
      items={items}
      onSelect={(item) => onSelect(item.value)}
    />
  );
}

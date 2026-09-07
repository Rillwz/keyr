import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/ui/App.jsx'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'src/ui/app.mjs',
  external: ['ink', 'react', 'gradient-string', '@inquirer/prompts', 'chalk', 'ora', 'commander', 'ink-select-input', 'ink-text-input'],
  jsx: 'automatic',
  logLevel: 'info',
});

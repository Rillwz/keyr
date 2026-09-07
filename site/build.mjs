import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
copyFileSync('src/index.html', 'dist/index.html');
copyFileSync('node_modules/flyonui/flyonui.js', 'dist/flyonui.js');

// favicon: inline SVG key mark, purple accent
const fav = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%238a2be2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.8 12.2 21 2m-4 4 3 3m-6 0 2.5 2.5"/></svg>'
).toString();
const html = readFileSync('dist/index.html', 'utf8');
writeFileSync('dist/index.html', html.replace('FAVICON_HREF', 'data:image/svg+xml,' + fav));

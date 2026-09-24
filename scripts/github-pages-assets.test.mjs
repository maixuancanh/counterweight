import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('public raster assets respect Vite base paths', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

  assert.match(app, /import\.meta\.env\.BASE_URL/);
  assert.match(css, /var\(--workshop-stage\)/);
  assert.doesNotMatch(app, /src="\/assets\/generated\//);
  assert.doesNotMatch(css, /url\('\/assets\/generated\/workshop-stage\.png'\)/);
});

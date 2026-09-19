import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Counterweight imports the official Chain Casino guest bridge and declares its required manifest capabilities', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const manifest = JSON.parse(await readFile(new URL('../public/game.manifest.json', import.meta.url), 'utf8'));
  assert.match(app, /from '@chain\/casino-sdk\/guest'/);
  assert.match(app, /computeMaxWager\(snapshot, \{ maxMultiplierX: 13\.36 \}\)/);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.apiVersion, 1);
  assert.equal(manifest.capabilities.openSession, true);
  assert.equal(manifest.capabilities.resize, true);
  assert.equal(manifest.presentation.mode, 'full-iframe');
});

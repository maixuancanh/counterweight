import assert from 'node:assert/strict';
import { PRESETS, expectedRtpWad, resolveFromEntropy } from '../src/engine/counterweight.ts';

const WAD = 1_000_000_000_000_000_000n;
const TARGET = 960_000_000_000_000_000n;

console.log('COUNTERWEIGHT — exact payout-table verification');
for (const preset of Object.keys(PRESETS)) {
  let total = 0n;
  for (let entropy = 0; entropy < 256; entropy += 1) {
    total += resolveFromEntropy(preset, entropy, 0).payoutMultiplierWad;
  }
  const actual = total / 256n;
  assert.equal(actual, TARGET, `${preset} must have exactly 96% RTP`);
  assert.equal(expectedRtpWad(preset), TARGET, `${preset} analytic RTP must match enumeration`);
  console.log(`${preset.padEnd(7)} ${Number(actual * 10_000n / WAD) / 100}% RTP over 256 entropy states`);
}
console.log('PASS — all three presets are exactly 96.00% before wager-level integer rounding.');

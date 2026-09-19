import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, calculateMoment, resolveFromEntropy } from '../src/engine/counterweight.ts';

const LIMITS = {
  steady: [64, 128, 3.34, 0.5],
  offset: [32, 96, 5.68, 1],
  wild: [16, 48, 13.36, 1],
};

function contractMultiplier(preset, entropy) {
  const [safe, recovery, safeMult, recoveryMult] = LIMITS[preset];
  if (entropy < safe) return safeMult;
  if (entropy < recovery) return recoveryMult;
  return 0;
}

test('the Solidity paytable agrees with all 768 engine outcomes', () => {
  for (const preset of Object.keys(PRESETS)) {
    for (let entropy = 0; entropy < 256; entropy += 1) {
      for (const direction of [0, 1]) {
        const result = resolveFromEntropy(preset, entropy, direction);
        assert.equal(result.payoutMultiplier, contractMultiplier(preset, entropy), `${preset}/${entropy}/${direction}`);
        assert.equal(result.finalMoment, calculateMoment(PRESETS[preset], result.crates.map(crate => crate.weight)));
      }
    }
  }
});

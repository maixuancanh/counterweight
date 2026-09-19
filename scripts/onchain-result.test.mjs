import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAbiParameters } from 'viem';
import { decodeCounterweightState } from '../src/engine/onChainResult.ts';

test('decodes the Counterweight contract state', () => {
  const state = encodeAbiParameters(
    [
      { type: 'uint8' }, { type: 'uint8' }, { type: 'uint8' }, { type: 'uint8[6]' },
      { type: 'int16' }, { type: 'uint256' }, { type: 'uint256' },
    ],
    [2, 4, 1, [55, 80, 120, 55, 80, 120], 0, 13_360_000_000_000_000_000n, 133_600_000_000_000_000_000n],
  );
  const result = decodeCounterweightState(state, 18);
  assert.equal(result?.preset, 'wild');
  assert.equal(result?.payoutMultiplier, 13.36);
  assert.equal(result?.crates[2].weight, 120);
});

test('rejects malformed or impossible game state', () => {
  assert.equal(decodeCounterweightState('0x1234', 18), null);
});

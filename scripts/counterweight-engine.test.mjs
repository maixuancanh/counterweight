import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESETS,
  calculateMoment,
  createAnimationGuard,
  expectedRtpWad,
  getPresetProfile,
  resolveFromEntropy,
  resolveRound,
  payoutForMoment,
} from '../src/engine/counterweight.ts';

test('an animation guard becomes active after React Strict Mode re-runs its effect', () => {
  const guard = createAnimationGuard();
  guard.start();
  guard.cancel();
  guard.start();
  assert.equal(guard.cancelled(), false);
});

test('the steady layout starts with no visible tilt', () => {
  assert.equal(calculateMoment(PRESETS.steady, [80, 80, 80, 80, 80, 80]), 0);
});

test('the layout changes the moment for the same crate weights', () => {
  const weights = [120, 35, 70, 30, 55, 105];
  assert.notEqual(
    calculateMoment(PRESETS.steady, weights),
    calculateMoment(PRESETS.wild, weights),
  );
});

test('a final moment in the safe zone earns the top payout tier', () => {
  assert.equal(payoutForMoment(0), 2.4);
  assert.equal(payoutForMoment(46), 1.4);
  assert.equal(payoutForMoment(101), 0);
});

test('one random word produces six deterministic crate reveals and a round result', () => {
  const first = resolveRound('steady', 123456789);
  const second = resolveRound('steady', 123456789);
  assert.deepEqual(first, second);
  assert.equal(first.crates.length, 6);
  assert.equal(first.crates.filter(crate => crate.revealed).length, 6);
  assert.ok(first.payoutMultiplier === 0 || first.payoutMultiplier >= 1.4);
});

test('each layout has a fixed payout class from the same entropy byte', () => {
  assert.equal(resolveFromEntropy('steady', 0, 0).payoutMultiplier, 3.34);
  assert.equal(resolveFromEntropy('steady', 64, 0).payoutMultiplier, 0.5);
  assert.equal(resolveFromEntropy('steady', 128, 0).payoutMultiplier, 0);
  assert.equal(resolveFromEntropy('offset', 0, 1).payoutMultiplier, 5.68);
  assert.equal(resolveFromEntropy('wild', 16, 1).payoutMultiplier, 1);
  assert.equal(resolveFromEntropy('wild', 48, 1).payoutMultiplier, 0);
});

test('all layouts have an exact 96 percent RTP in WAD units', () => {
  for (const preset of Object.keys(PRESETS)) {
    assert.equal(expectedRtpWad(preset), 960000000000000000n);
  }
});

test('displayed payout profiles retain their exact per-layout odds', () => {
  assert.deepEqual(getPresetProfile('steady'), { safeOdds: 64, recoveryOdds: 64, fallOdds: 128, safeMultiplier: 3.34, recoveryMultiplier: 0.5 });
  assert.deepEqual(getPresetProfile('offset'), { safeOdds: 32, recoveryOdds: 64, fallOdds: 160, safeMultiplier: 5.68, recoveryMultiplier: 1 });
  assert.deepEqual(getPresetProfile('wild'), { safeOdds: 16, recoveryOdds: 32, fallOdds: 208, safeMultiplier: 13.36, recoveryMultiplier: 1 });
});

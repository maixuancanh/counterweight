export type PresetId = 'steady' | 'offset' | 'wild';

export type CrateKind = 'gold' | 'iron' | 'gems' | 'relic';

export type CrateReveal = {
  id: number;
  kind: CrateKind;
  weight: number;
  revealed: boolean;
};

export type RoundResult = {
  crates: CrateReveal[];
  finalMoment: number;
  payoutMultiplier: number;
  payoutMultiplierWad: bigint;
  tilt: number;
};

export function createAnimationGuard() {
  let isCancelled = false;
  return {
    start() { isCancelled = false; },
    cancel() { isCancelled = true; },
    cancelled() { return isCancelled; },
  };
}

export const PRESETS: Record<PresetId, readonly number[]> = {
  steady: [-1, -2, -3, 1, 2, 3],
  offset: [-3, -1, -2, 1, 3, 2],
  wild: [-3, -2, -1, 3, 2, 1],
};

const CRATE_KINDS: readonly CrateKind[] = ['gold', 'iron', 'gems', 'relic'];
const WEIGHTS = [35, 55, 80, 120] as const;
const SAFE_MOMENT = 22;
const RECOVERY_MOMENT = 50;
const MAX_SAFE_MOMENT = 100;
const WAD = 1_000_000_000_000_000_000n;

type PayoutClass = 'safe' | 'recovery' | 'lost';

const PAYTABLE: Record<PresetId, { safeLimit: number; recoveryLimit: number; safeWad: bigint; recoveryWad: bigint }> = {
  steady: { safeLimit: 64, recoveryLimit: 128, safeWad: 3_340_000_000_000_000_000n, recoveryWad: 500_000_000_000_000_000n },
  offset: { safeLimit: 32, recoveryLimit: 96, safeWad: 5_680_000_000_000_000_000n, recoveryWad: 1_000_000_000_000_000_000n },
  wild: { safeLimit: 16, recoveryLimit: 48, safeWad: 13_360_000_000_000_000_000n, recoveryWad: 1_000_000_000_000_000_000n },
};

export function getPresetProfile(preset: PresetId) {
  const table = PAYTABLE[preset];
  return {
    safeOdds: table.safeLimit,
    recoveryOdds: table.recoveryLimit - table.safeLimit,
    fallOdds: 256 - table.recoveryLimit,
    safeMultiplier: Number(table.safeWad) / 1e18,
    recoveryMultiplier: Number(table.recoveryWad) / 1e18,
  };
}

function payoutClass(preset: PresetId, entropy: number): PayoutClass {
  const table = PAYTABLE[preset];
  if (entropy < table.safeLimit) return 'safe';
  if (entropy < table.recoveryLimit) return 'recovery';
  return 'lost';
}

function weightsFor(preset: PresetId, kind: PayoutClass, direction: number): number[] {
  if (preset === 'steady') {
    if (kind === 'safe') return [55, 80, 120, 55, 80, 120];
    if (kind === 'recovery') return direction ? [120, 80, 80, 80, 80, 80] : [80, 80, 80, 120, 80, 80];
  }
  if (preset === 'offset') {
    if (kind === 'safe') return [80, 55, 120, 80, 55, 120];
    if (kind === 'recovery') return direction ? [80, 120, 120, 80, 55, 120] : [80, 55, 120, 120, 55, 120];
  }
  if (preset === 'wild') {
    if (kind === 'safe') return [55, 80, 120, 55, 80, 120];
    if (kind === 'recovery') return direction ? [80, 80, 120, 55, 80, 120] : [55, 80, 120, 80, 80, 120];
  }
  return direction ? [120, 120, 120, 35, 35, 35] : [35, 35, 35, 120, 120, 120];
}

export function calculateMoment(positions: readonly number[], weights: readonly number[]): number {
  return positions.reduce((total, position, index) => total + position * (weights[index] ?? 0), 0);
}

export function payoutForMoment(moment: number): number {
  const magnitude = Math.abs(moment);
  if (magnitude <= SAFE_MOMENT) return 2.4;
  if (magnitude <= RECOVERY_MOMENT) return 1.4;
  if (magnitude <= MAX_SAFE_MOMENT) return 0.5;
  return 0;
}

export function momentToTilt(moment: number): number {
  return Math.max(-9, Math.min(9, moment / 24));
}

function next(seed: number): number {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function resolveRound(preset: PresetId, randomWord: number): RoundResult {
  return resolveFromEntropy(preset, randomWord & 255, (randomWord >>> 8) & 1);
}

export function resolveFromEntropy(preset: PresetId, entropy: number, direction: number): RoundResult {
  const normalizedEntropy = entropy & 255;
  const normalizedDirection = direction & 1;
  const kind = payoutClass(preset, normalizedEntropy);
  const weights = weightsFor(preset, kind, normalizedDirection);
  const table = PAYTABLE[preset];
  const payoutMultiplierWad = kind === 'safe'
    ? table.safeWad
    : kind === 'recovery'
      ? table.recoveryWad
      : 0n;
  const crates = weights.map((weight, index) => ({
    id: index + 1,
    kind: CRATE_KINDS[(normalizedEntropy + index + normalizedDirection) % CRATE_KINDS.length],
    weight,
    revealed: true,
  }));
  const finalMoment = calculateMoment(PRESETS[preset], crates.map(crate => crate.weight));
  return {
    crates,
    finalMoment,
    payoutMultiplier: Number(payoutMultiplierWad) / 1e18,
    payoutMultiplierWad,
    tilt: momentToTilt(finalMoment),
  };
}

export function expectedRtpWad(preset: string): bigint {
  if (!(preset in PAYTABLE)) throw new Error('Unknown Counterweight preset');
  const table = PAYTABLE[preset as PresetId];
  const safeCount = BigInt(table.safeLimit);
  const recoveryCount = BigInt(table.recoveryLimit - table.safeLimit);
  return (safeCount * table.safeWad + recoveryCount * table.recoveryWad) / 256n;
}

export function summarizeMoment(moment: number): 'balanced' | 'recoverable' | 'strained' | 'lost' {
  const magnitude = Math.abs(moment);
  if (magnitude <= SAFE_MOMENT) return 'balanced';
  if (magnitude <= RECOVERY_MOMENT) return 'recoverable';
  if (magnitude <= MAX_SAFE_MOMENT) return 'strained';
  return 'lost';
}

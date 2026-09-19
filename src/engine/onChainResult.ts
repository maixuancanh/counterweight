import { decodeAbiParameters, formatUnits } from 'viem';
import { PRESETS, type CrateReveal, type PresetId, type RoundResult } from './counterweight.ts';

const presetIds: PresetId[] = ['steady', 'offset', 'wild'];
const kinds: CrateReveal['kind'][] = ['gold', 'iron', 'gems', 'relic'];

export type OnChainRound = RoundResult & { preset: PresetId; payout: number; entropy: number; direction: number };

export function decodeCounterweightState(state: `0x${string}`, tokenDecimals = 18): OnChainRound | null {
  try {
    const [presetIndex, entropy, direction, weights, moment, multiplierWad, payout] = decodeAbiParameters(
      [
        { type: 'uint8' }, { type: 'uint8' }, { type: 'uint8' }, { type: 'uint8[6]' },
        { type: 'int16' }, { type: 'uint256' }, { type: 'uint256' },
      ],
      state,
    );
    const preset = presetIds[Number(presetIndex)];
    const parsedWeights = weights.map(Number);
    const parsedMoment = Number(moment);
    const multiplier = Number(multiplierWad) / 1e18;
    if (!preset || Number(direction) > 1 || parsedWeights.length !== 6 || parsedWeights.some(weight => ![35, 55, 80, 120].includes(weight))) return null;
    const recomputed = PRESETS[preset].reduce((total, position, index) => total + position * parsedWeights[index], 0);
    if (recomputed !== parsedMoment || !Number.isFinite(multiplier) || multiplier < 0 || multiplier > 13.36) return null;
    return {
      preset,
      entropy: Number(entropy),
      direction: Number(direction),
      crates: parsedWeights.map((weight, index) => ({ id: index + 1, kind: kinds[(Number(entropy) + index + Number(direction)) % kinds.length], weight, revealed: true })),
      finalMoment: parsedMoment,
      payoutMultiplier: multiplier,
      payoutMultiplierWad: multiplierWad,
      tilt: Math.max(-9, Math.min(9, parsedMoment / 24)),
      payout: Number(formatUnits(payout, tokenDecimals)),
    };
  } catch {
    return null;
  }
}

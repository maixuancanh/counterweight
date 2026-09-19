import type { HostSnapshotV1 } from './types';

export function computeMaxWager(snapshot: HostSnapshotV1, maxMultiplierX: number): bigint | null {
  const cap = snapshot.casino?.maxBetAmount;
  if (cap) return BigInt(cap);
  const liquidity = snapshot.casino?.availableLiquidity;
  const riskBps = snapshot.casino?.maxBetRiskBps;
  if (!liquidity || riskBps === undefined || maxMultiplierX <= 1) return null;
  const permittedProfit = BigInt(liquidity) * BigInt(riskBps) / 10_000n;
  return permittedProfit * 1_000_000n / BigInt(Math.ceil((maxMultiplierX - 1) * 1_000_000));
}

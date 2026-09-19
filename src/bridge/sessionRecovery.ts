import type { HostSnapshotV1 } from './types';

export function findRecoverableSession(items: HostSnapshotV1['sessions']['items'], gameAddress: `0x${string}`) {
  return items.filter(session => !session.isSettled && session.gameAddress.toLowerCase() === gameAddress.toLowerCase())
    .sort((a, b) => b.lastEventTimestamp - a.lastEventTimestamp)[0] ?? null;
}

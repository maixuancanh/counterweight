export type HexString = `0x${string}`;

export type HostSnapshotV1 = {
  integration: { gameAddress: HexString };
  wallet: { address?: HexString; status: 'ready' | 'disconnected' | 'setup-required' | 'session-key-mismatch' };
  token: { symbol?: string; decimals?: number };
  balances: { smartVaultBalance?: string };
  casino?: { availableLiquidity?: string; maxBetRiskBps?: number; maxAllowedReservedProfit?: string; maxBetAmount?: string };
  sessions: { items: Array<{ sessionId: string; sessionKey: string; gameAddress: HexString; isSettled: boolean; raw: { gameState?: HexString }; lastEventTimestamp: number }> };
};

export type HostApiV1 = {
  reportContentSize?(input: { minHeight: number }): Promise<void>;
  openSession(input: { wager: string; gameData: HexString }): Promise<{ sessionKey: string; transactionHash: HexString }>;
  revealOutcome(input: { sessionId: string }): Promise<void>;
};

export type GuestApiV1 = { setState(snapshot: HostSnapshotV1 | null): Promise<void> };

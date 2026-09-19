# Counterweight — official Chain Casino SDK evidence

Recorded locally on 2026-09-18 against the downloaded `@chain/casino-sdk` v0.2.0 package.

## Commands

From `.chain-casino-sdk/casino-sdk`:

```text
npm install
npm --prefix simulator run local-node
npm --prefix simulator run dev
```

From the Counterweight project:

```text
npm install
npm test
npm run build
```

The game is served separately at `http://127.0.0.1:4312/`. The official harness was opened at:

```text
http://localhost:3300/?game=http%3A%2F%2F127.0.0.1%3A4312&gameAddress=0xa513e6e4b8f2a923d98304ec87f64353c4d5c853
```

## Verified local deployment

The simulator ran on Hardhat chain `31337` with the bundled local Verify Network VRF node.

```text
Counterweight: 0xa513e6e4b8f2a923d98304ec87f64353c4d5c853
Casino host:   0xe7f1725e7734ce288f8367e1bb143e90bb3f0512
Vault:         0xCafac3dD18aC6c6e92c921884f9E4176737C052c
Token:         0x5fbdb2315678afecb367f032d93f642f64180aa3
VRF router:    0x057ef64e23666f000b34ae31332854acbd1c8544
RPC:           http://127.0.0.1:8545
```

## E2E result

The official simulator detected `Counterweight` in its game picker and loaded the standalone game inside an iframe. The game reported `CHAIN SDK CONNECTED`, received the host snapshot and chUSD balance, and used the official `openSession` / `revealOutcome` bridge path.

Observed flow:

1. `REVEAL NEXT` debited a 10 chUSD wager and showed `Recovering session pending:<uuid>; waiting for VRF settlement…`.
2. The local Verify Network VRF fulfilled the request.
3. The settled state was delivered to the iframe.
4. The frontend replayed all six contract weights and showed the final balance state.
5. In the captured round, balance changed from `1,000,000` to `999,990`, all six crates opened, and the game displayed `FALLEN` for a 510 moment.

This is local simulator evidence only. It is not a public-chain deployment or a mainnet/testnet receipt.

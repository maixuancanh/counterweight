# Counterweight

Treasure-balancing casino game for the Chain Casino SDK. A player picks one of three six-crate layouts, stakes once, and watches the VRF-selected load reveal one crate at a time. The animation is a replay of the encoded contract state, not a source of randomness.

## Run locally

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 4312
```

## Game rules and RTP

| Layout | Jackpot state | Jackpot payout | Recovery state | Recovery payout | RTP |
| --- | ---: | ---: | ---: | ---: | ---: |
| Steady | 64 / 256 | 3.34x | 64 / 256 | 0.50x | 96.00% |
| Offset | 32 / 256 | 5.68x | 64 / 256 | 1.00x | 96.00% |
| Wild | 16 / 256 | 13.36x | 32 / 256 | 1.00x | 96.00% |

The remaining entropy states pay 0x. A second entropy byte selects the direction of the revealed load; it changes animation and moment but not payout class.

## What is implemented

- Three load layouts: Steady, Offset, and Wild.
- `ICasinoGameV2` Solidity contract with one VRF round, capacity quotes, no player actions, encoded result state, and maximum 13.36x payout.
- A deterministic six-crate outcome from two VRF bytes: payout class and balance direction.
- Chain host/guest bridge with session recovery, fail-closed risk limits, ABI game data, and on-chain result decoding.
- Sequential crate opening, treasure reveals, smooth beam and gauge movement, and synthesized workshop sounds.
- Play-money balance, bet controls, result state, and responsive layout.
- Exact RTP enumeration over every entropy state, contract-to-engine parity over all 768 preset/entropy/direction combinations, decoder tests, and animation lifecycle tests.

## Verification

```powershell
npm test
npm run compile:contract
npm run build
```

`npm test` verifies engine behavior, exact RTP, Solidity/table parity, and ABI decode safety. `npm run compile:contract` compiles `contracts/Counterweight.sol` with Solidity 0.8.30.

## Chain Jam integration

The official Chain Casino simulator has been run locally with the real local VRF node and host harness. The recorded deployment and E2E result are in [docs/LOCAL_SIMULATOR_E2E.md](docs/LOCAL_SIMULATOR_E2E.md).

The hosted game page includes the required Chain Jam widget:

```html
<script async src="https://jam.chain.wtf/widget.js"></script>
```

The simulator is a development harness, not part of the shipped game. It runs the local chain, real local VRF node, casino host and iframe bridge so the contract/session/manifest integration can be verified before hosting.

The remaining submission gate is hosting the production build on a public URL and submitting that URL through the Jam form. A public-chain deployment is not required by the published eligibility checklist.

# Counterweight Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the standalone Counterweight prototype into a Chain Casino SDK-compatible game with a verified 96% theoretical RTP, then polish the final game UI.

**Architecture:** A pure TypeScript game engine and the Solidity contract share three preset-specific outcome tables. One VRF entropy byte selects a payout class; a second chooses the balance direction. The resulting six crate weights, moment and payout are ABI-encoded for the React client to replay without any client-side randomness.

**Tech Stack:** Solidity 0.8.20, Chain `ICasinoGameV2`, React 18, TypeScript, Vite, Penpal, Viem, Node test runner.

---

### Task 1: Lock exact game math

**Files:**
- Modify: `src/engine/counterweight.ts`
- Modify: `scripts/counterweight-engine.test.mjs`
- Create: `scripts/verify-rtp.mjs`

- [ ] Add failing tests for one fixed entropy value per preset, six deterministic weights, and 0.96 WAD aggregate RTP.
- [ ] Implement preset threshold tables: Steady `64/64/128`, Offset `32/64/160`, Wild `16/32/208` and multipliers `3.34/0.5`, `5.68/1`, `13.36/1`.
- [ ] Enumerate all 256 entropy-byte states and fail the RTP script if any preset is not exactly 96.00% before integer wager rounding.

### Task 2: Implement the on-chain source of truth

**Files:**
- Create: `contracts/ICasinoGameV2.sol`
- Create: `contracts/Counterweight.sol`
- Create: `scripts/test-contract-logic.mjs`

- [ ] Add a failing parity test comparing all 3 × 256 preset/entropy outcomes against the TypeScript engine.
- [ ] Implement `quoteCaps`, `quoteRiskParams`, `onSessionStart`, `onRandomness`, reject all player actions, and ABI-encode preset, weights, moment, multiplier, and payout.
- [ ] Compile the contract with a local Solidity compiler and run the parity test.

### Task 3: Integrate the Chain host/guest lifecycle

**Files:**
- Create: `src/bridge/types.ts`, `src/bridge/guest.ts`, `src/bridge/bet-limits.ts`, `src/bridge/sessionRecovery.ts`
- Modify: `src/App.tsx`
- Modify: `package.json`

- [ ] Add a failing decoder test for valid and malformed on-chain game state.
- [ ] Connect in an iframe through Penpal; fail closed while bridge risk limits are unavailable.
- [ ] Open a host session with selected preset as ABI-encoded game data, wait for settlement, decode the result, then replay exactly that result.

### Task 4: Add submission assets and verify runtime

**Files:**
- Create: `public/game.manifest.json`, `public/logo.svg`, `public/favicon.svg`
- Modify: `README.md`, `src/index.css`

- [ ] Declare the SDK capabilities and game metadata.
- [ ] Polish only after functional and math verification: motion-reduced fallback, keyboard focus, responsive control panel, and loading/error states.
- [ ] Run unit tests, RTP enumeration, production build, local standalone E2E, then official simulator E2E if simulator source/runtime is available.

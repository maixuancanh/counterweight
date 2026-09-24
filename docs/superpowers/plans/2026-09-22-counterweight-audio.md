# Counterweight Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add player-triggered workshop ambience, contextual procedural effects, and a persistent mute control without affecting gameplay or SDK behavior.

**Architecture:** `WorkshopAudio` owns one lazily created AudioContext, ambient nodes, mute state, and short one-shot effects. `App` starts audio only from player interaction and maps existing game events to controller methods. No audio state is read by contract, bridge, RTP, or reveal logic.

**Tech Stack:** React, TypeScript, Web Audio API, Node test runner, Vite.

---

### Task 1: Audio-controller safety tests

**Files:**
- Create: `scripts/workshop-audio.test.mjs`
- Modify: `src/audio/WorkshopAudio.ts`

- [ ] **Step 1: Write failing idempotency tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkshopAudio } from '../src/audio/WorkshopAudio.ts';

test('ambient starts once and mute suppresses effects', () => {
  const audio = new WorkshopAudio();
  assert.equal(audio.isMuted(), false);
  audio.startAmbience();
  audio.startAmbience();
  assert.equal(audio.ambientStartsForTest(), 1);
  audio.setMuted(true);
  audio.select();
  assert.equal(audio.isMuted(), true);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --experimental-strip-types --test scripts/workshop-audio.test.mjs`

Expected: FAIL because ambient and mute methods do not exist.

- [ ] **Step 3: Implement one shared, lazy Web Audio controller**

Add `startAmbience`, `setMuted`, `isMuted`, selection and wager effects to `WorkshopAudio`. Build ambience with two low-gain oscillators and a filtered noise-like oscillator; retain node references so repeat starts are no-ops and mute fades gains to zero.

- [ ] **Step 4: Run the audio test**

Run: `node --experimental-strip-types --test scripts/workshop-audio.test.mjs`

Expected: PASS.

### Task 2: Connect audio to game interactions

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add a sound toggle button to the header**

Render a keyboard-accessible button with `aria-pressed`, use `workshopAudio.setMuted`, and initialize ambience from button/preset/bet/reveal interactions only.

- [ ] **Step 2: Bind game events to effects**

Call selection sound on layout changes, wager sound on plus/minus, latch/reveal/creak during the reveal loop, and settlement audio at final state. Keep all existing state changes intact.

- [ ] **Step 3: Style the compact brass sound button**

Add `.sound-toggle` beside header metadata using existing dark brass panel tokens and visible keyboard focus.

### Task 3: Verify behavior

**Files:**
- Test: `scripts/workshop-audio.test.mjs`
- Test: existing project test scripts

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all engine, RTP, contract, on-chain, SDK, and audio tests pass.

- [ ] **Step 2: Build production output**

Run: `npm run build`

Expected: Vite build completes with no TypeScript errors.

- [ ] **Step 3: Browser smoke test**

Open `http://127.0.0.1:4312/`, click a preset, wager control, sound toggle, and reveal. Confirm no console errors and that mute control changes state.

# Counterweight audio design

## Goal

Make the treasure workshop feel alive without interfering with gameplay, the Chain SDK iframe bridge, or browser autoplay rules.

## Audio model

- Background: one procedural Web Audio ambient bed with low workshop drone, sparse bell shimmer, and slow detuned brass tones. It starts only after the player’s first interaction and fades rather than restarting between rounds.
- Effects: short procedural effects for layout selection, bet adjustment, latch release, each crate reveal, scale creak, payout, and loss.
- Controls: a single header button toggles all sound. The initial state is muted until the first player interaction, then audio is enabled unless that control has been muted.
- Accessibility: `prefers-reduced-motion` does not disable sound; mute remains explicit and keyboard accessible.

## Lifecycle

1. The first click on an interactive game control creates/resumes one shared `AudioContext`, starts the ambient bed, and plays the requested effect.
2. Further interactions reuse that context. No duplicate music loops are created.
3. A mute toggle stops/fades the ambient nodes and suppresses effects; unmute resumes the existing ambient bed.
4. The existing reveal sequence owns its timed latch, creak, and settlement effects.

## Validation

- Unit-test the audio controller’s start/mute idempotency with mocked Web Audio primitives.
- Build and browser-test that one first interaction yields one active ambient layer, controls respond, and no console errors occur.
- Preserve the existing RTP, contract, bridge, and game-engine test suite unchanged.

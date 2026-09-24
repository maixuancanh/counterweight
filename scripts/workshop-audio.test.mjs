import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkshopAudio } from '../src/audio/WorkshopAudio.ts';

class FakeParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
}

class FakeNode {
  connect() { return this; }
  disconnect() {}
}

class FakeOscillator extends FakeNode {
  constructor() {
    super();
    this.frequency = new FakeParam();
    this.type = 'sine';
  }
  start() {}
  stop() {}
}

class FakeGain extends FakeNode {
  constructor() {
    super();
    this.gain = new FakeParam();
  }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = new FakeNode();
  }
  resume() { return Promise.resolve(); }
  createOscillator() { return new FakeOscillator(); }
  createGain() { return new FakeGain(); }
}

test('ambient starts once and mute stops it without destroying the controller', () => {
  const originalWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext, setTimeout };

  try {
    const audio = new WorkshopAudio();
    assert.deepEqual(audio.status(), { muted: false, ambienceActive: false });

    audio.startAmbience();
    audio.startAmbience();
    assert.deepEqual(audio.status(), { muted: false, ambienceActive: true });

    audio.setMuted(true);
    assert.deepEqual(audio.status(), { muted: true, ambienceActive: false });

    audio.setMuted(false);
    assert.deepEqual(audio.status(), { muted: false, ambienceActive: true });
  } finally {
    globalThis.window = originalWindow;
  }
});

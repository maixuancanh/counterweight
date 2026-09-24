export class WorkshopAudio {
  private context: AudioContext | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceActive = false;
  private ambienceLevel = 0.0001;
  private muted = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    this.context ??= new window.AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  status() {
    return { muted: this.muted, ambienceActive: this.ambienceActive };
  }

  setMuted(muted: boolean) {
    if (this.muted === muted) return;
    this.muted = muted;
    const context = this.getContext();
    if (!context) return;
    if (muted) {
      this.fadeAmbience(0, 0.12);
      this.ambienceActive = false;
      return;
    }
    this.startAmbience();
  }

  startAmbience() {
    if (this.muted || this.ambienceActive) return;
    const context = this.getContext();
    if (!context) return;
    if (!this.ambienceGain) {
      this.ambienceGain = context.createGain();
      this.ambienceGain.gain.setValueAtTime(0.0001, context.currentTime);
      this.ambienceGain.connect(context.destination);
      this.createAmbientVoice(55, 'sine', 0.011);
      this.createAmbientVoice(82.41, 'triangle', 0.006);
      this.createAmbientVoice(164.81, 'sine', 0.0025);
    }
    this.fadeAmbience(0.022, 1.2);
    this.ambienceActive = true;
  }

  private createAmbientVoice(frequency: number, type: OscillatorType, level: number) {
    const context = this.context;
    const destination = this.ambienceGain;
    if (!context || !destination) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(level, context.currentTime);
    oscillator.connect(gain).connect(destination);
    oscillator.start();
  }

  private fadeAmbience(level: number, duration: number) {
    const context = this.context;
    const gain = this.ambienceGain;
    if (!context || !gain) return;
    const target = Math.max(0.0001, level);
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(this.ambienceLevel, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(target, context.currentTime + duration);
    this.ambienceLevel = target;
  }

  tone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.035) {
    if (this.muted) return;
    const context = this.getContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.03);
  }

  select() {
    this.startAmbience();
    this.tone(276, 0.06, 'triangle', 0.018);
    window.setTimeout(() => this.tone(414, 0.11, 'sine', 0.015), 45);
  }

  wager(direction: 1 | -1) {
    this.startAmbience();
    this.tone(direction > 0 ? 308 : 226, 0.08, 'square', 0.012);
  }

  creak(direction: number) {
    this.tone(direction >= 0 ? 88 : 74, 0.22, 'triangle', 0.028);
  }

  unlock() {
    this.tone(410, 0.08, 'square', 0.018);
    window.setTimeout(() => this.tone(620, 0.16, 'triangle', 0.025), 55);
  }

  settle(won: boolean) {
    this.tone(won ? 392 : 92, 0.22, won ? 'triangle' : 'sawtooth', 0.04);
    window.setTimeout(() => this.tone(won ? 587 : 68, 0.3, won ? 'sine' : 'triangle', 0.035), 110);
  }
}

export const workshopAudio = new WorkshopAudio();

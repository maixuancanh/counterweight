export class WorkshopAudio {
  private context: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  tone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.035) {
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

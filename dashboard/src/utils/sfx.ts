// Zero-asset Web Audio API synthesizer for subtle cyber-SCADA micro-feedback

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private getCtx(): AudioContext | null {
    if (!this.enabled || typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public playTick(freq = 660, duration = 0.045, gainVal = 0.03) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore autoplay lock before user gesture
    }
  }

  public playSceneTransition(sceneIndex: number) {
    const baseFreqs = [220, 196, 261.63, 329.63, 440, 523.25];
    const f = baseFreqs[sceneIndex % baseFreqs.length] ?? 320;
    this.playTick(f, 0.16, 0.035);
    setTimeout(() => this.playTick(f * 1.5, 0.18, 0.02), 65);
  }

  public playRevealChord() {
    const ctx = this.getCtx();
    if (!ctx) return;
    [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
      setTimeout(() => this.playTick(freq, 0.45, 0.025), i * 85);
    });
  }

  public playOptimize() {
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      setTimeout(() => this.playTick(freq, 0.12, 0.028), i * 55);
    });
  }
}

export const sfx = new SoundEngine();


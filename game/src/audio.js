// Efek suara WebAudio murni (tanpa file audio / tanpa network).
// Semua suara dibuat dari oscillator — aman di headless (guard try/catch).
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      // Dengung mesin: dua oscillator (sawtooth rendah + sine) lewat lowpass.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 70;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  resume() {
    if (this.ensure() && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEngine(on, speedNorm) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on && !this.muted ? 0.045 + speedNorm * 0.03 : 0, t, 0.1);
    if (this.engineOsc) {
      this.engineOsc.frequency.setTargetAtTime(60 + speedNorm * 90, t, 0.1);
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx && this.engineGain) {
      this.engineGain.gain.setTargetAtTime(muted ? 0 : 0.05, this.ctx.currentTime, 0.05);
    }
  }

  blip(freq, dur, type = 'sine', vol = 0.16, slideTo = null) {
    if (!this.ensure() || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch { /* abaikan */ }
  }

  ring() { this.blip(880, 0.18, 'sine', 0.2, 1320); setTimeout(() => this.blip(1320, 0.3, 'sine', 0.16), 90); }
  coin() { this.blip(1180, 0.1, 'triangle', 0.16, 1760); }
  crash() { this.blip(160, 0.4, 'sawtooth', 0.22, 50); }
  click() { this.blip(660, 0.07, 'square', 0.08); }
  warn() { this.blip(440, 0.15, 'square', 0.1, 330); }
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.35, 'triangle', 0.18), i * 130));
  }
  lose() {
    [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.15), i * 150));
  }
}

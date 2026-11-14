export class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;
  private stepTime = 0;

  constructor() {
    this.muted = localStorage.getItem("selene.muted") === "1";
  }

  unlock(): void {
    if (!this.ctx) {
      const Context = window.AudioContext;
      this.ctx = new Context();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  toggle(): boolean {
    this.muted = !this.muted;
    localStorage.setItem("selene.muted", this.muted ? "1" : "0");
    return this.muted;
  }

  blip(): void {
    this.tone(660, 0.06, "sine", 0.035);
  }

  radio(): void {
    this.tone(740, 0.07, "triangle", 0.03);
    window.setTimeout(() => this.tone(980, 0.08, "sine", 0.028), 90);
  }

  equip(): void {
    this.tone(320, 0.12, "triangle", 0.03);
    window.setTimeout(() => this.tone(480, 0.14, "sine", 0.03), 120);
  }

  /** Generated tones for the Earth-to-Moon sequence. */
  voyage(sound: "beep" | "liftoff" | "separation" | "burn" | "radio" | "pulse" | "touchdown"): void {
    switch (sound) {
      case "beep":
        this.tone(880, 0.12, "sine", 0.04);
        return;
      case "liftoff":
        this.tone(1320, 0.18, "sine", 0.04);
        this.rumble(3.2, 0.09);
        return;
      case "separation":
        this.tone(220, 0.08, "square", 0.02);
        window.setTimeout(() => this.tone(160, 0.1, "triangle", 0.025), 70);
        return;
      case "burn":
        this.rumble(1.6, 0.035);
        return;
      case "radio":
        this.radio();
        return;
      case "pulse":
        this.tone(110, 0.16, "triangle", 0.03);
        return;
      case "touchdown":
        this.tone(90, 0.3, "triangle", 0.05);
        window.setTimeout(() => this.tone(523, 0.4, "sine", 0.03), 350);
        window.setTimeout(() => this.tone(784, 0.6, "sine", 0.03), 560);
        return;
    }
  }

  private rumble(duration: number, gain: number): void {
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + duration);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.25);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);
    source.start(now);
    source.stop(now + duration + 0.05);
  }

  footstep(dt: number, walking: boolean): void {
    if (!walking) {
      this.stepTime = 0;
      return;
    }
    this.stepTime -= dt;
    if (this.stepTime > 0) return;
    this.stepTime = 0.38;
    this.tone(140, 0.04, "triangle", 0.02);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number): void {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(amp);
    amp.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }
}

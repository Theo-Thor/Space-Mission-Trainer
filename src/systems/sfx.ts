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

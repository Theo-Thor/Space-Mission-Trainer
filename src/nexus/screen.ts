// The NEXUS screen: Moon card, need meters, suggested moves, and the 2048 ending around the 3D cube.
import { FACE_ORDER, NEEDS, NexusCube, TOTAL_TURNS, type Move, type NexusRun } from "./cube";
import { NexusView } from "./view";
import { EARTH_ELEV, SKY_STEP_HOURS, SUN_ELEV, skySentence } from "../content/sky";


function must<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing ${selector}`);
  return el;
}

/** Sum of all six meters after a move, to mark the option that helps most right now. */
function scoreAfter(run: NexusRun, move: Move): number {
  const copy = new NexusCube();
  copy.stickers = run.cube.stickers.map((s) => ({ pos: [...s.pos], normal: [...s.normal], type: s.type }));
  copy.apply(move);
  return FACE_ORDER.reduce((n, f) => n + copy.counts()[f], 0);
}

export class NexusScreen {
  onClose: () => void = () => undefined;
  private keys = 0;
  private readonly keysLine: HTMLElement;
  private readonly orbi: HTMLElement;
  isOpen = false;

  private view: NexusView | null = null;
  private readonly stage: HTMLElement;
  private readonly turn: HTMLElement;
  private readonly title: HTMLElement;
  private readonly text: HTMLElement;
  private readonly meters: HTMLElement;
  private readonly choices: HTMLElement;
  private readonly tip: HTMLElement;
  private readonly ending: HTMLElement;
  private readonly sky: HTMLElement;
  private readonly chart: HTMLCanvasElement;

  constructor(private readonly section: HTMLElement, private run: NexusRun) {
    this.stage = must(section, "#nexus-stage");
    this.turn = must(section, "#nexus-turn");
    this.title = must(section, "#nexus-title");
    this.text = must(section, "#nexus-text");
    this.meters = must(section, "#nexus-meters");
    this.choices = must(section, "#nexus-choices");
    this.tip = must(section, "#nexus-tip");
    this.ending = must(section, "#nexus-end");
    this.sky = must(section, "#nexus-sky");
    this.keysLine = must(section, "#nexus-keys");
    this.orbi = must(section, "#nexus-orbi-say");
    must<HTMLButtonElement>(section, "#nexus-info").addEventListener("click", (e) => {
      const compact = section.classList.toggle("compact");
      (e.currentTarget as HTMLButtonElement).textContent = compact ? "Show info" : "Hide info";
    });
    this.chart = must<HTMLCanvasElement>(section, "#nexus-chart");
    this.meters.innerHTML = FACE_ORDER.map(
      (f) =>
        `<div class="nexus-meter"><span class="nexus-swatch" style="--c:${NEEDS[f].color}"></span><span class="nexus-name">${NEEDS[f].name}</span><span class="nexus-pips" data-face="${f}">${'<i></i>'.repeat(9)}</span></div>`,
    ).join("");
    must<HTMLButtonElement>(section, "#nexus-leave").addEventListener("click", () => this.close());
    must<HTMLButtonElement>(section, "#nexus-end-leave").addEventListener("click", () => this.close());
    window.addEventListener(
      "keydown",
      (event) => {
        if (!this.isOpen || event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        this.close();
      },
      true,
    );
  }

  open(run: NexusRun, keys = 0): void {
    this.run = run;
    this.keys = keys;
    this.section.hidden = false;
    this.isOpen = true;
    if (!this.view) {
      this.view = new NexusView(this.stage, run);
      this.view.onChange = () => {
        this.render();
        if (this.run.done) this.say("2048! Every need is full. You did it!");
        else if (this.ready() > 0) this.say(`Great turn! You still have ${this.ready()} turn${this.ready() === 1 ? "" : "s"} ready.`);
        else this.say(`Great turn! That used your key. Find another NEXUS key outside (${this.keys}/11 found).`);
      };
      this.view.canTurn = () => this.ready() > 0;
      this.view.onBlocked = () => this.say(`No key, no turn! Find NEXUS keys on the Moon surface. You have ${this.keys} of 11.`);
      this.view.onTap = () => this.say("Don't just click! Grab the glowing layer and drag it the way its arrows flow.");
      this.view.onWrong = () => {
        this.tip.textContent = "Almost! Follow the glowing arrows.";
        this.tip.classList.add("nexus-tip-flash");
        window.setTimeout(() => this.tip.classList.remove("nexus-tip-flash"), 900);
      };
    } else {
      this.view.setRun(run);
    }
    this.view.start();
    this.render();
    this.say(
      run.done ? "2048! Every need is full."
      : this.ready() > 0 ? `Hi, I'm ORBI! You have ${this.ready()} turn${this.ready() === 1 ? "" : "s"} ready. Tap a button to see what a turn does, then drag the glowing layer.`
      : `Hi, I'm ORBI! NEXUS runs our base. Each turn needs a NEXUS key, and there are 11 on the Moon surface. You have ${this.keys}.`,
    );
  }

  private ready(): number {
    return Math.max(0, this.keys - this.run.turns);
  }

  private say(text: string): void {
    this.orbi.textContent = text;
    this.orbi.parentElement?.classList.remove("talk");
    void this.orbi.offsetWidth;
    this.orbi.parentElement?.classList.add("talk");
  }

  /** ORBI explains what a turn would do, using the real cube maths. */
  private explain(move: Move): string {
    const before = this.run.cube.counts();
    const copy = new NexusCube();
    copy.stickers = this.run.cube.stickers.map((s) => ({ pos: [...s.pos], normal: [...s.normal], type: s.type }));
    copy.apply(move);
    const after = copy.counts();
    const up: string[] = [];
    const down: string[] = [];
    for (const f of FACE_ORDER) {
      if (after[f] > before[f]) up.push(`${NEEDS[f].name} ${before[f]}→${after[f]}`);
      if (after[f] < before[f]) down.push(`${NEEDS[f].name} ${before[f]}→${after[f]}`);
    }
    const name = NEEDS[move.face].name;
    const gain = up.length ? `Stronger: ${up.join(", ")}.` : "Nothing gets stronger right away.";
    const loss = down.length ? ` Weaker: ${down.join(", ")}.` : " Nothing gets weaker.";
    return `Turning ${name}: ${gain}${loss} To do it, drag the ${name} layer the way its arrows flow.`;
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.view?.stop();
    this.section.hidden = true;
    this.onClose();
  }

  /** Test and demo helper: play the first suggested move. */
  playSuggested(index = 0): boolean {
    const move = this.run.legal()[index];
    return !!move && this.view?.request(move) === "turned";
  }

  /** 30 days of real elevation data with a marker on today's turn. */
  private drawChart(day: number): void {
    const c = this.chart.getContext("2d");
    if (!c) return;
    const w = this.chart.width;
    const h = this.chart.height;
    const pad = 10;
    const y = (deg: number): number => h / 2 - (deg / 8) * (h / 2 - pad);
    const x = (i: number): number => pad + (i / (EARTH_ELEV.length - 1)) * (w - pad * 2);
    c.clearRect(0, 0, w, h);
    c.fillStyle = "rgba(10, 22, 44, 0.9)";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255,255,255,0.04)";
    c.fillRect(0, y(0), w, h - y(0));
    c.strokeStyle = "rgba(201, 211, 222, 0.5)";
    c.setLineDash([6, 6]);
    c.beginPath(); c.moveTo(0, y(0)); c.lineTo(w, y(0)); c.stroke();
    c.setLineDash([]);
    const plot = (data: number[], color: string): void => {
      c.strokeStyle = color; c.lineWidth = 3; c.beginPath();
      data.forEach((v, i) => (i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v))));
      c.stroke();
    };
    plot(EARTH_ELEV, "#3FA0FF");
    plot(SUN_ELEV, "#FFB547");
    const mx = x((day * 24) / SKY_STEP_HOURS);
    c.strokeStyle = "#55D5E9"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(mx, pad); c.lineTo(mx, h - pad); c.stroke();
    c.fillStyle = "#E8EFF5"; c.font = "700 20px Segoe UI, sans-serif"; c.textAlign = "left";
    c.fillText("horizon", 14, y(0) - 6);
    c.fillStyle = "#3FA0FF"; c.fillText("Earth", 14, 28);
    c.fillStyle = "#FFB547"; c.fillText("Sun ≤ 1°", w - 110, y(0) - 6);
  }

  private render(): void {
    const run = this.run;
    const counts = run.cube.counts();
    for (const el of this.meters.querySelectorAll<HTMLElement>(".nexus-pips")) {
      const face = el.dataset.face as keyof typeof counts;
      el.querySelectorAll("i").forEach((pip, i) => {
        pip.style.background = i < counts[face] ? NEEDS[face].color : "";
      });
    }
    this.ending.hidden = !run.done;
    this.keysLine.textContent = `NEXUS keys: ${this.keys} / 11 found · ${this.ready()} turn${this.ready() === 1 ? "" : "s"} ready`;
    this.keysLine.classList.toggle("empty", this.ready() === 0 && !run.done);
    if (run.done) {
      this.turn.textContent = `${TOTAL_TURNS} of ${TOTAL_TURNS}`;
      this.choices.innerHTML = "";
      return;
    }
    const step = run.step!;
    this.sky.textContent = skySentence(step.day);
    this.drawChart(step.day);
    this.turn.textContent = `Turn ${run.turns + 1} of ${TOTAL_TURNS}`;
    this.title.textContent = run.secondOfPair ? "Now the other side" : step.title;
    this.text.textContent = run.secondOfPair ? "Both orders end in the same place. Turn the other glowing layer." : step.text;
    const legal = run.legal();
    const scores = legal.map((m) => scoreAfter(run, m));
    const best = legal.length > 1 && scores[0] !== scores[1] ? scores.indexOf(Math.max(...scores)) : -1;
    this.choices.innerHTML = "";
    legal.forEach((move, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nexus-choice";
      b.style.setProperty("--c", NEEDS[move.face].color);
      b.innerHTML = `<span class="nexus-swatch" style="--c:${NEEDS[move.face].color}"></span>${NEEDS[move.face].name}: what happens?${i === best ? '<em>Helps most right now</em>' : ""}`;
      b.addEventListener("click", () => {
        this.say(this.explain(move));
        this.view?.pulse();
      });
      this.choices.appendChild(b);
    });
    this.tip.textContent =
      legal.length === 1 ? "Only one move this time. Turn it by hand: drag the glowing layer the way the arrows flow." : "Pick one and turn it by hand: drag a glowing layer the way its arrows flow.";
  }
}

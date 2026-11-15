// The NEXUS screen: Moon card, need meters, suggested moves, and the 2048 ending around the 3D cube.
import { FACE_ORDER, NEEDS, NexusCube, TOTAL_TURNS, type Move, type NexusRun } from "./cube";
import { NexusView } from "./view";

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

  constructor(private readonly section: HTMLElement, private run: NexusRun) {
    this.stage = must(section, "#nexus-stage");
    this.turn = must(section, "#nexus-turn");
    this.title = must(section, "#nexus-title");
    this.text = must(section, "#nexus-text");
    this.meters = must(section, "#nexus-meters");
    this.choices = must(section, "#nexus-choices");
    this.tip = must(section, "#nexus-tip");
    this.ending = must(section, "#nexus-end");
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

  open(run: NexusRun): void {
    this.run = run;
    this.section.hidden = false;
    this.isOpen = true;
    if (!this.view) {
      this.view = new NexusView(this.stage, run);
      this.view.onChange = () => this.render();
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
    if (run.done) {
      this.turn.textContent = `${TOTAL_TURNS} of ${TOTAL_TURNS}`;
      this.choices.innerHTML = "";
      return;
    }
    const step = run.step!;
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
      b.innerHTML = `<span class="nexus-swatch" style="--c:${NEEDS[move.face].color}"></span>Turn ${NEEDS[move.face].name}${i === best ? '<em>Helps most right now</em>' : ""}`;
      b.addEventListener("click", () => this.view?.request(move));
      this.choices.appendChild(b);
    });
    this.tip.textContent =
      legal.length === 1 ? "Only one move this time. Drag the glowing layer the way the arrows flow." : "Pick one. Drag a glowing layer the way its arrows flow, or tap a button.";
  }
}

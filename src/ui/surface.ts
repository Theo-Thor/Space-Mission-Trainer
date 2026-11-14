function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function must<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

export class Surface {
  private readonly hud = must<HTMLElement>("hud");
  private readonly objective = must<HTMLElement>("objective-text");
  private readonly objectivePanel = must<HTMLElement>("objective");
  private readonly location = must<HTMLElement>("location");
  private readonly radioStatus = must<HTMLElement>("radio-status");
  private readonly prompt = must<HTMLElement>("prompt");
  private readonly hint = must<HTMLElement>("hint");
  private readonly banner = must<HTMLElement>("banner");
  private readonly bannerTitle = must<HTMLElement>("banner-title");
  private readonly bannerSub = must<HTMLElement>("banner-sub");
  private readonly toast = must<HTMLElement>("toast");
  private readonly toastTitle = must<HTMLElement>("toast-title");
  private readonly toastBody = must<HTMLElement>("toast-body");
  private readonly toastDetail = must<HTMLElement>("toast-detail");
  private readonly dialogue = must<HTMLElement>("dialogue");
  private readonly speaker = must<HTMLElement>("speaker");
  private readonly line = must<HTMLElement>("line");
  private readonly arrow = must<HTMLButtonElement>("advance");
  private readonly radio = must<HTMLElement>("radio");
  private readonly radioSender = must<HTMLElement>("radio-sender");
  private readonly radioText = must<HTMLElement>("radio-text");
  private readonly inspect = must<HTMLElement>("inspect");
  private readonly inspectTitle = must<HTMLElement>("inspect-title");
  private readonly inspectBody = must<HTMLElement>("inspect-body");
  private readonly inspectDetail = must<HTMLElement>("inspect-detail");
  private readonly suit = must<HTMLElement>("suit");
  private readonly suitReady = must<HTMLElement>("suit-ready");
  private readonly flight = must<HTMLElement>("flight");
  private readonly flightReady = must<HTMLElement>("flight-ready");
  private readonly fade = must<HTMLElement>("fade");
  private readonly complete = must<HTMLElement>("complete");
  private readonly mute = must<HTMLButtonElement>("mute");
  private toastTimer = 0;
  private toastQueue: { title: string; body: string; detail?: string }[] = [];
  private currentToast = false;

  constructor(private readonly onAdvance: () => void, onInspectClose: () => void) {
    this.dialogue.addEventListener("click", (event) => {
      event.preventDefault();
      this.onAdvance();
    });
    must<HTMLButtonElement>("inspect-close").addEventListener("click", onInspectClose);
  }

  setHudVisible(on: boolean): void {
    this.hud.hidden = !on;
  }

  setObjective(text: string): void {
    this.objective.textContent = text;
    this.objectivePanel.classList.remove("pop");
    void this.objectivePanel.offsetWidth;
    this.objectivePanel.classList.add("pop");
  }

  setLocation(text: string): void {
    this.location.textContent = text;
  }

  setRadioStatus(text: string | null): void {
    this.radioStatus.hidden = !text;
    this.radioStatus.textContent = text ?? "";
  }

  setPrompt(text: string | null, x = 0, y = 0, viewW = 0, viewH = 0): void {
    if (!text) {
      this.prompt.hidden = true;
      return;
    }
    this.prompt.hidden = false;
    this.prompt.textContent = text;
    const width = this.prompt.offsetWidth;
    const height = this.prompt.offsetHeight;
    const margin = 12;
    let left = x - width / 2;
    let top = y - height;
    left = clamp(left, margin, Math.max(margin, viewW - width - margin));
    const topLimit = 132;
    const bottomLimit = Math.max(topLimit, viewH - 168 - height);
    if (top < topLimit) top = y + 18;
    top = clamp(top, topLimit, bottomLimit);
    this.prompt.style.left = `${left}px`;
    this.prompt.style.top = `${top}px`;
  }

  setHintVisible(on: boolean): void {
    this.hint.classList.toggle("hide", !on);
  }

  setBannerVisible(on: boolean): void {
    this.banner.hidden = !on;
  }

  setBannerLines(title: string, subtitle: string): void {
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = subtitle;
    this.banner.hidden = false;
  }

  pushToast(title: string, body: string, detail?: string): void {
    this.toastQueue.push({ title, body, detail });
    this.pumpToast(0);
  }

  update(dt: number): void {
    if (!this.currentToast) return;
    this.toastTimer -= dt;
    if (this.toastTimer <= 0) {
      this.currentToast = false;
      this.toast.hidden = true;
      this.pumpToast(0);
    }
  }

  openDialogue(speaker: string): void {
    this.speaker.textContent = speaker;
    this.line.textContent = "";
    this.arrow.hidden = true;
    this.dialogue.hidden = false;
    this.prompt.hidden = true;
  }

  setDialogue(speaker: string, text: string, showArrow: boolean): void {
    this.speaker.textContent = speaker;
    this.line.textContent = text;
    this.arrow.hidden = !showArrow;
  }

  closeDialogue(): void {
    this.dialogue.hidden = true;
    this.arrow.hidden = true;
  }

  showRadio(sender: string, text: string): void {
    this.radioSender.textContent = sender;
    this.radioText.textContent = text;
    this.radio.hidden = false;
  }

  hideRadio(): void {
    this.radio.hidden = true;
  }

  showInspect(title: string, body: string, detail: string): void {
    this.inspectTitle.textContent = title;
    this.inspectBody.textContent = body;
    this.inspectDetail.textContent = detail;
    this.inspect.hidden = false;
  }

  hideInspect(): void {
    this.inspect.hidden = true;
  }

  showSuit(step: number): void {
    this.suit.hidden = false;
    for (let index = 1; index <= 3; index += 1) {
      must<HTMLElement>(`suit-step-${index}`).classList.toggle("on", step >= index);
    }
    this.suitReady.hidden = step < 4;
  }

  hideSuit(): void {
    this.suit.hidden = true;
  }

  showFlight(step: number): void {
    this.flight.hidden = false;
    for (let index = 1; index <= 3; index += 1) {
      must<HTMLElement>(`flight-step-${index}`).classList.toggle("on", step >= index);
    }
    this.flightReady.hidden = step < 4;
  }

  hideFlight(): void {
    this.flight.hidden = true;
  }

  setFade(amount: number): void {
    this.fade.style.opacity = String(Math.min(1, Math.max(0, amount)));
  }

  showComplete(): void {
    this.complete.hidden = false;
    this.fade.style.opacity = "1";
  }

  setMuted(muted: boolean): void {
    this.mute.textContent = muted ? "Sound off" : "Sound on";
    this.mute.setAttribute("aria-pressed", muted ? "true" : "false");
  }

  private pumpToast(dt: number): void {
    void dt;
    if (this.currentToast || this.toastQueue.length === 0) return;
    const next = this.toastQueue.shift();
    if (!next) return;
    this.toastTitle.textContent = next.title;
    this.toastBody.textContent = next.body;
    this.toastDetail.textContent = next.detail ?? "";
    this.toastDetail.hidden = !next.detail;
    this.toast.hidden = false;
    this.currentToast = true;
    this.toastTimer = next.detail ? 2.6 : 1.8;
  }
}

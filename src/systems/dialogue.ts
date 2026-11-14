import { fillName } from "../content/story";
import type { DialogueScript } from "../types";

const CHAR_SECONDS = 0.032;

export class Dialogue {
  isOpen = false;
  speaker = "";
  shown = "";
  private full = "";
  private lines: DialogueScript["lines"] = [];
  private index = 0;
  private elapsed = 0;
  private playerName = "";
  private onComplete: (() => void) | null = null;
  private scriptId = "";

  get arrowVisible(): boolean {
    return this.isOpen && this.shown.length >= this.full.length && this.full.length > 0;
  }

  get id(): string {
    return this.scriptId;
  }

  play(script: DialogueScript, playerName: string, onComplete: () => void): void {
    this.scriptId = script.id;
    this.lines = script.lines;
    this.playerName = playerName;
    this.index = 0;
    this.onComplete = onComplete;
    this.isOpen = true;
    this.beginLine();
  }

  advance(): void {
    if (!this.isOpen) return;
    if (this.shown.length < this.full.length) {
      this.shown = this.full;
      this.elapsed = this.full.length * CHAR_SECONDS;
      return;
    }
    if (this.index < this.lines.length - 1) {
      this.index += 1;
      this.beginLine();
      return;
    }
    this.close();
  }

  update(dt: number): boolean {
    if (!this.isOpen || this.shown.length >= this.full.length) return false;
    this.elapsed += dt;
    const count = Math.min(this.full.length, Math.floor(this.elapsed / CHAR_SECONDS));
    if (count === this.shown.length) return false;
    this.shown = this.full.slice(0, count);
    return true;
  }

  private beginLine(): void {
    const current = this.lines[this.index];
    this.speaker = fillName(current.speaker, this.playerName);
    this.full = fillName(current.text, this.playerName);
    this.shown = "";
    this.elapsed = 0;
  }

  private close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.shown = "";
    this.full = "";
    const done = this.onComplete;
    this.onComplete = null;
    done?.();
  }
}

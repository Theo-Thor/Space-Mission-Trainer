export interface RadioMessage {
  id: string;
  sender: string;
  text: string;
}

export class RadioQueue {
  private queue: RadioMessage[] = [];
  private current: RadioMessage | null = null;
  private elapsed = 0;
  private duration = 0;
  private visible = false;
  private resumeHold = false;

  get isVisible(): boolean {
    return this.visible;
  }

  enqueue(message: RadioMessage): void {
    if (this.queue.some((item) => item.id === message.id) || this.current?.id === message.id) return;
    this.queue.push(message);
  }

  tick(dt: number, dialogueOpen: boolean): { visible: boolean; message: RadioMessage | null; changed: boolean; completedId: string | null } {
    const previousVisible = this.visible;
    const previousId = this.current?.id ?? "";
    let completedId: string | null = null;

    if (dialogueOpen) {
      this.resumeHold = this.current !== null;
      this.visible = false;
    } else if (!this.current) {
      this.pullNext();
    } else {
      this.visible = true;
      if (this.resumeHold) this.resumeHold = false;
      else this.elapsed += dt;
      if (this.elapsed >= this.duration) {
        completedId = this.current.id;
        this.current = null;
        this.visible = false;
        this.pullNext();
      }
    }

    const changed = previousVisible !== this.visible || previousId !== (this.current?.id ?? "");
    return { visible: this.visible, message: this.visible ? this.current : null, changed, completedId };
  }

  private pullNext(): void {
    const next = this.queue.shift();
    if (!next) {
      this.visible = false;
      this.current = null;
      return;
    }
    this.current = next;
    this.elapsed = 0;
    this.duration = Math.min(8.5, Math.max(3.6, next.text.length * 0.05));
    this.visible = true;
  }
}

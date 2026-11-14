import { actorDefs, BOARD_TARGET, INTRO_FOCUS, obstacles, PLAYER_SPAWN, propAnchor, props, RILEY_PATH, roomAt, walkable, WORLD } from "./content/world";
import { drawStars, drawWorld, type PaintActor } from "./render/draw";
import { Dialogue } from "./systems/dialogue";
import { Mission } from "./systems/mission";
import { RadioQueue } from "./systems/radio";
import { Sfx } from "./systems/sfx";
import { Surface } from "./ui/surface";
import type { Rect } from "./types";

interface Actor extends PaintActor {
  prompt: string;
  interactive: boolean;
  radius: number;
}

interface Target {
  id: string;
  x: number;
  y: number;
  promptX: number;
  promptY: number;
  radius: number;
  prompt: string;
  dist: number;
}

class Keys {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      if (typing) return;
      if (event.key === " " || event.key.startsWith("Arrow")) event.preventDefault();
      const key = event.key.toLowerCase();
      if (!this.down.has(key)) this.pressed.add(key);
      this.down.add(key);
    });
    window.addEventListener("keyup", (event) => {
      this.down.delete(event.key.toLowerCase());
    });
    window.addEventListener("blur", () => {
      this.down.clear();
      this.pressed.clear();
    });
  }

  held(key: string): boolean {
    return this.down.has(key);
  }

  consume(key: string): boolean {
    if (!this.pressed.has(key)) return false;
    this.pressed.delete(key);
    return true;
  }

  endFrame(): void {
    this.pressed.clear();
  }
}

export class Game {
  started = false;
  readonly mission: Mission;
  private readonly dialogue = new Dialogue();
  private readonly radio = new RadioQueue();
  private readonly keys = new Keys();
  private readonly areas = walkable();
  private readonly blocks = obstacles();
  private readonly actors: Actor[];
  private readonly player: Actor;
  private readonly radioTimers: { t: number; ids: string[] }[] = [];
  private time = 0;
  private cameraX = 0;
  private cameraY = 0;
  private zoom = 1;
  private viewW = 1280;
  private viewH = 720;
  private intro = 2.5;
  private banner = 3.4;
  private hint = 8;
  private announced = false;
  private interactLock = 0;
  private advancedThisFrame = false;
  private dialogueWasOpen = false;
  private suitActive = false;
  private suitT = 0;
  private suitBlend = 0;
  private boardActive = false;
  private boardT = 0;
  private hatchOpen = false;
  private rileyWalking = false;
  private rileyIndex = 0;
  private inspectTime = 0;
  private lastRadio = "";
  private ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ui: Surface,
    private readonly sfx: Sfx,
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    this.ctx = context;
    this.actors = actorDefs.map((def, index) => ({
      id: def.id,
      x: def.x,
      y: def.y,
      facing: def.facing,
      look: def.look,
      label: def.label,
      walking: false,
      walkPhase: 0,
      bob: index * 0.7,
      suitBlend: def.look === "riley" ? 1 : 0,
      radioLight: false,
      prompt: def.prompt,
      interactive: def.interactive,
      radius: def.radius,
    }));
    this.player = {
      id: "player",
      x: PLAYER_SPAWN.x,
      y: PLAYER_SPAWN.y,
      facing: "up",
      look: "player",
      label: "",
      walking: false,
      walkPhase: 0,
      bob: 0,
      suitBlend: 0,
      radioLight: false,
      prompt: "",
      interactive: false,
      radius: 0,
    };
    this.mission = new Mission({
      onObjective: (text) => this.ui.setObjective(text),
      onToast: (title, body, detail) => this.ui.pushToast(title, body, detail),
      onRadios: (ids, delay) => this.radioTimers.push({ t: delay, ids }),
      onRileyWalk: () => {
        this.rileyWalking = true;
        this.rileyIndex = 0;
      },
      onBoard: () => this.beginBoarding(),
    });
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = window.innerWidth;
    this.viewH = window.innerHeight;
    this.canvas.width = Math.floor(this.viewW * dpr);
    this.canvas.height = Math.floor(this.viewH * dpr);
    this.canvas.style.width = `${this.viewW}px`;
    this.canvas.style.height = `${this.viewH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(name: string): void {
    this.mission.setName(name);
    this.started = true;
    this.ui.setHudVisible(true);
    this.ui.setObjective(this.mission.objective);
    this.ui.setBannerVisible(true);
    this.ui.setHintVisible(true);
    this.ui.setLocation(roomAt(this.player.x, this.player.y).label);
    this.placeCamera(0);
  }

  requestAdvance(): void {
    if (!this.dialogue.isOpen || this.advancedThisFrame) return;
    this.advancedThisFrame = true;
    this.dialogue.advance();
    if (!this.dialogue.isOpen) this.interactLock = 0.4;
    this.syncDialogue();
  }

  closeInspect(): void {
    this.inspectTime = 0;
    this.ui.hideInspect();
  }

  teleport(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  debugInteract(id: string): void {
    this.handleInteract(id);
  }

  snapshot(): Record<string, unknown> {
    const riley = this.actor("riley");
    return {
      phase: this.mission.phase,
      objective: this.mission.objective,
      playerName: this.mission.playerName,
      briefingCompleted: this.mission.briefingCompleted,
      radioAcquired: this.mission.radioAcquired,
      radioActive: this.mission.radioActive,
      suitEquipped: this.mission.suitEquipped,
      companionMet: this.mission.companionMet,
      companionAtHatch: this.mission.companionAtHatch,
      chapterCompleted: this.mission.chapterCompleted,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      dialogue: this.dialogue.isOpen ? this.dialogue.id : "",
      line: this.dialogue.shown,
      rileyX: Math.round(riley.x),
      rileyY: Math.round(riley.y),
      suitBlend: this.suitBlend,
    };
  }

  update(dt: number): void {
    if (!this.started) return;
    this.time += dt;
    this.interactLock = Math.max(0, this.interactLock - dt);
    this.ui.update(dt);

    if (this.dialogue.isOpen && (this.keys.consume("enter") || this.keys.consume(" "))) this.requestAdvance();
    const locked = this.dialogue.isOpen || this.suitActive || this.boardActive;
    if (!locked && this.interactLock <= 0 && this.keys.consume("e")) {
      const target = this.nearest();
      if (target) this.handleInteract(target.id);
    }

    const movingLocked = this.dialogue.isOpen || this.suitActive || this.boardActive;
    if (!movingLocked) this.movePlayer(dt);
    else this.player.walking = false;
    this.updateRiley(dt);
    this.updateSuit(dt);
    this.updateBoarding(dt);
    this.dialogue.update(dt);
    this.syncDialogue();
    this.updateRadios(dt);
    this.updateIntro(dt);
    this.player.suitBlend = this.mission.suitEquipped ? 1 : this.suitBlend;
    this.player.radioLight = this.mission.radioAcquired;
    this.player.label = "";
    for (const actor of this.actors) {
      if (!actor.walking) actor.walkPhase = 0;
    }
    this.placeCamera(dt);
    this.ui.setLocation(roomAt(this.player.x, this.player.y).label);
    this.ui.setRadioStatus(this.radioLabel());
    this.placePrompt(locked);
    if (this.inspectTime > 0) {
      this.inspectTime -= dt;
      if (this.inspectTime <= 0) this.ui.hideInspect();
    }
    this.sfx.footstep(dt, this.player.walking);
    this.keys.endFrame();
    this.advancedThisFrame = false;
  }

  draw(): void {
    if (!this.started) {
      drawStars(this.ctx, this.viewW, this.viewH, this.time);
      return;
    }
    const paintActors = this.actors.map((actor) => ({ ...actor }));
    drawWorld(this.ctx, {
      time: this.time,
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      zoom: this.zoom,
      actors: paintActors,
      player: { ...this.player },
      highlight: this.highlight(),
      focusRoom: focusFor(this.mission.objective),
      radioTaken: this.mission.radioAcquired,
      suitReady: this.mission.suitEquipped,
      hatchOpen: this.hatchOpen,
      viewW: this.viewW,
      viewH: this.viewH,
    });
  }

  private handleInteract(id: string): void {
    if (this.dialogue.isOpen || this.suitActive || this.boardActive) return;
    const result = this.mission.resolve(id);
    const actor = this.actors.find((item) => item.id === id);
    if (actor) faceToward(actor, this.player);
    if (result.kind === "dialogue") {
      const script = this.mission.script(result.id);
      this.dialogue.play(script, this.mission.playerName, () => this.mission.completeDialogue(script.id));
      this.syncDialogue();
      this.ui.hideInspect();
      this.sfx.blip();
      return;
    }
    if (result.kind === "toast") {
      this.ui.pushToast(result.title, result.body);
      this.sfx.blip();
      return;
    }
    if (result.kind === "inspect") {
      this.ui.showInspect(result.title, result.body, result.detail);
      this.inspectTime = 9;
      this.sfx.blip();
      return;
    }
    if (result.kind === "pickup") {
      this.mission.collectRadio();
      this.sfx.blip();
      return;
    }
    if (result.kind === "equip") {
      this.suitActive = true;
      this.suitT = 0;
      this.sfx.equip();
    }
  }

  private movePlayer(dt: number): void {
    let dx = 0;
    let dy = 0;
    if (this.keys.held("w") || this.keys.held("arrowup")) dy -= 1;
    if (this.keys.held("s") || this.keys.held("arrowdown")) dy += 1;
    if (this.keys.held("a") || this.keys.held("arrowleft")) dx -= 1;
    if (this.keys.held("d") || this.keys.held("arrowright")) dx += 1;
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      this.player.walking = false;
      return;
    }
    dx /= length;
    dy /= length;
    this.player.facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    const speed = 230;
    const nextX = this.player.x + dx * speed * dt;
    const nextY = this.player.y + dy * speed * dt;
    if (!this.blocked(nextX, nextY)) {
      this.player.x = nextX;
      this.player.y = nextY;
    } else if (!this.blocked(nextX, this.player.y)) this.player.x = nextX;
    else if (!this.blocked(this.player.x, nextY)) this.player.y = nextY;
    this.player.walking = true;
    this.player.walkPhase += dt * 11;
  }

  private blocked(x: number, y: number): boolean {
    const box: Rect = { x: x - 14, y: y - 12, w: 28, h: 18 };
    const points = [
      [box.x + 1, box.y + 1],
      [box.x + box.w - 1, box.y + 1],
      [box.x + 1, box.y + box.h - 1],
      [box.x + box.w - 1, box.y + box.h - 1],
    ];
    const inside = points.every(([px, py]) =>
      this.areas.some((area) => px >= area.x && py >= area.y && px <= area.x + area.w && py <= area.y + area.h),
    );
    if (!inside) return true;
    return this.blocks.some(
      (block) => box.x < block.x + block.w && box.x + box.w > block.x && box.y < block.y + block.h && box.y + box.h > block.y,
    );
  }

  private updateRiley(dt: number): void {
    const riley = this.actor("riley");
    if (this.boardActive) {
      stepToward(riley, BOARD_TARGET.riley.x, BOARD_TARGET.riley.y, 150, dt);
      return;
    }
    if (!this.rileyWalking) {
      riley.walking = false;
      return;
    }
    const target = RILEY_PATH[this.rileyIndex];
    const arrived = stepToward(riley, target.x, target.y, 120, dt);
    if (!arrived) return;
    this.rileyIndex += 1;
    if (this.rileyIndex >= RILEY_PATH.length) {
      this.rileyWalking = false;
      riley.walking = false;
      this.mission.markRileyArrived();
    }
  }

  private updateSuit(dt: number): void {
    if (!this.suitActive) return;
    this.suitT += dt;
    this.suitBlend = clamp((this.suitT - 0.35) / 1.15, 0, 1);
    const step = this.suitT < 0.45 ? 1 : this.suitT < 1.25 ? 2 : this.suitT < 2.05 ? 3 : 4;
    this.ui.showSuit(step);
    if (this.suitT < 3.5) return;
    this.suitActive = false;
    this.suitBlend = 1;
    this.ui.hideSuit();
    this.mission.finishSuit();
  }

  private beginBoarding(): void {
    if (this.boardActive || this.mission.chapterCompleted) return;
    this.boardActive = true;
    this.boardT = 0;
    this.hatchOpen = true;
  }

  private updateBoarding(dt: number): void {
    if (!this.boardActive || this.mission.chapterCompleted) return;
    this.boardT += dt;
    this.player.walking = true;
    this.player.walkPhase += dt * 11;
    stepToward(this.player, BOARD_TARGET.player.x, BOARD_TARGET.player.y, 150, dt);
    const fade = clamp((this.boardT - 1.15) / 0.75, 0, 1);
    this.ui.setFade(fade);
    if (this.boardT > 2.35) {
      this.mission.completeChapter();
      this.ui.showComplete();
      this.ui.setHudVisible(false);
    }
  }

  private updateRadios(dt: number): void {
    for (const timer of this.radioTimers) timer.t -= dt;
    const ready = this.radioTimers.filter((timer) => timer.t <= 0);
    for (let index = this.radioTimers.length - 1; index >= 0; index -= 1) {
      if (this.radioTimers[index].t <= 0) this.radioTimers.splice(index, 1);
    }
    for (const timer of ready) {
      for (const id of timer.ids) this.radio.enqueue(this.mission.radioText(id));
    }
    const state = this.radio.tick(dt, this.dialogue.isOpen);
    if (!state.changed) return;
    if (state.visible && state.message) {
      this.ui.showRadio(state.message.sender, state.message.text);
      if (state.message.id !== this.lastRadio) {
        this.lastRadio = state.message.id;
        this.sfx.radio();
      }
      return;
    }
    this.ui.hideRadio();
  }

  private updateIntro(dt: number): void {
    this.intro = Math.max(0, this.intro - dt);
    this.banner = Math.max(0, this.banner - dt);
    this.hint = Math.max(0, this.hint - dt);
    this.ui.setBannerVisible(this.banner > 0);
    this.ui.setHintVisible(this.hint > 0.3);
    if (!this.announced && this.banner <= 0) {
      this.announced = true;
      this.ui.pushToast("OBJECTIVE UPDATED", this.mission.objective);
    }
  }

  private syncDialogue(): void {
    if (this.dialogue.isOpen) {
      if (!this.dialogueWasOpen) this.ui.openDialogue(this.dialogue.speaker);
      this.dialogueWasOpen = true;
      this.ui.setDialogue(this.dialogue.speaker, this.dialogue.shown, this.dialogue.arrowVisible);
      return;
    }
    if (this.dialogueWasOpen) this.ui.closeDialogue();
    this.dialogueWasOpen = false;
  }

  private placePrompt(locked: boolean): void {
    const target = locked ? null : this.nearest();
    if (!target) {
      this.ui.setPrompt(null);
      return;
    }
    const aboveActor = this.actors.some((actor) => actor.id === target.id);
    const lift = (aboveActor ? 132 : 20) * this.zoom;
    const side = 0;
    const x = (target.promptX - this.cameraX) * this.zoom + side;
    const y = (target.promptY - this.cameraY) * this.zoom - lift;
    this.ui.setPrompt(target.prompt, x, y, this.viewW, this.viewH);
  }

  private nearest(): Target | null {
    let best: Target | null = null;
    for (const actor of this.actors) {
      if (!actor.interactive) continue;
      const dist = Math.hypot(actor.x - this.player.x, actor.y - this.player.y);
      if (dist > actor.radius) continue;
      if (!best || dist < best.dist) {
        best = { id: actor.id, x: actor.x, y: actor.y, promptX: actor.x, promptY: actor.y, radius: actor.radius, prompt: actor.prompt, dist };
      }
    }
    for (const prop of props) {
      if (!prop.prompt || !prop.radius) continue;
      if (prop.id === "radio" && this.mission.radioAcquired) continue;
      if (prop.id === "suit" && this.mission.suitEquipped) continue;
      const anchor = propAnchor(prop);
      const dist = Math.hypot(anchor.x - this.player.x, anchor.y - this.player.y);
      if (dist > prop.radius) continue;
      if (!best || dist < best.dist) {
        best = {
          id: prop.id,
          x: anchor.x,
          y: anchor.y,
          promptX: prop.x + prop.w / 2,
          promptY: prop.y,
          radius: prop.radius,
          prompt: prop.prompt,
          dist,
        };
      }
    }
    return best;
  }

  private highlight(): { x: number; y: number } | null {
    if (this.dialogue.isOpen || this.suitActive || this.boardActive) return null;
    const target = this.nearest();
    return target ? { x: target.x, y: target.y } : null;
  }

  private radioLabel(): string | null {
    if (!this.mission.radioAcquired) return null;
    return this.mission.suitEquipped ? "SUIT COMM LINK" : "RADIO LINKED";
  }

  warm(dt: number): void {
    this.time += dt;
  }

  private placeCamera(dt: number): void {
    this.zoom = clamp(this.viewW / 1100, 0.75, 1.25);
    const viewW = this.viewW / this.zoom;
    const viewH = this.viewH / this.zoom;
    const followX = this.player.x - viewW / 2;
    const followY = this.player.y - viewH / 2;
    const introMix = clamp(this.intro / 2.5, 0, 1);
    let targetX = followX * (1 - introMix) + (INTRO_FOCUS.x - viewW / 2) * introMix;
    let targetY = followY * (1 - introMix) + (INTRO_FOCUS.y - viewH / 2) * introMix;
    if (viewW >= WORLD.width) targetX = (WORLD.width - viewW) / 2;
    else targetX = clamp(targetX, 0, WORLD.width - viewW);
    if (viewH >= WORLD.height) targetY = (WORLD.height - viewH) / 2;
    else targetY = clamp(targetY, 0, WORLD.height - viewH);
    if (dt <= 0) {
      this.cameraX = targetX;
      this.cameraY = targetY;
      return;
    }
    const rate = 1 - Math.exp(-6 * dt);
    this.cameraX += (targetX - this.cameraX) * rate;
    this.cameraY += (targetY - this.cameraY) * rate;
  }

  private actor(id: string): Actor {
    const found = this.actors.find((item) => item.id === id);
    if (!found) throw new Error(`Missing actor ${id}`);
    return found;
  }
}

function stepToward(actor: Actor, x: number, y: number, speed: number, dt: number): boolean {
  const dx = x - actor.x;
  const dy = y - actor.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 5) {
    actor.x = x;
    actor.y = y;
    actor.walking = false;
    return true;
  }
  actor.x += (dx / dist) * speed * dt;
  actor.y += (dy / dist) * speed * dt;
  actor.walking = true;
  actor.walkPhase += dt * 11;
  actor.facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  return false;
}

function faceToward(actor: Actor, player: Actor): void {
  const dx = player.x - actor.x;
  const dy = player.y - actor.y;
  actor.facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

function focusFor(objective: string): string {
  if (objective.includes("Briefing")) return "briefing";
  if (objective.includes("Communications") || objective.includes("Radio")) return "comms";
  if (objective.includes("Suit")) return "suit";
  return "boarding";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

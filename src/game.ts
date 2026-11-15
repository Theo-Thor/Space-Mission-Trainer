import { CharacterAnimator } from "./systems/animation";
import { AutomaticDoor, actorFootprint } from "./systems/doors";
import { actorDefs, doors, BOARD_TARGET, INTRO_FOCUS, obstacles, PLAYER_SPAWN, propAnchor, props, RILEY_PATH, roomAt, walkable, WORLD, type PropDef } from "./content/world";
import { PILOT_SEAT, RILEY_ENTER, RILEY_SEAT_PATH, SHIP_LOOK, shipProps, shipRoomAt } from "./content/ship";
import { LUNAR_RILEY, LUNAR_SPAWN, LUNAR_WORLD, NEXUS_KEYS, lunarCrew, lunarObstacles, lunarProps, lunarRoomAt, lunarWalkable, NPC_GREETING, onSurface, type LunarProp } from "./content/lunar";
import { drawStars, drawWorld, type PaintActor } from "./render/draw";
import { drawVoyage } from "./render/voyage-art";
import { nexusPaint } from "./render/lunar-art";
import { NEEDS, NexusRun, TOTAL_TURNS } from "./nexus/cube";
import { EvaMission, type EvaInput } from "./eva/eva";
import { drawEva } from "./eva/eva-art";
import { EARTH_UP_SHARE, SKY_SOURCE, SUN_MAX, formatDay, skyAt } from "./content/sky";
import { CUES, VOYAGE_DURATION } from "./content/voyage";
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
  private readonly animator = new CharacterAnimator();
  private readonly automaticDoors = doors.filter(d => d.id === "to-reception").map(d => new AutomaticDoor(d));
  private areas: Rect[] = walkable();
  private blocks: Rect[] = obstacles();
  private bounds = WORLD;
  private readonly actors: Actor[];
  private readonly player: Actor;
  private readonly lunarActors: Actor[];
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
  private rileyShip: "facility" | "hold" | "enter" | "wait" | "seat" | "seated" = "facility";
  private scene: "facility" | "ship" | "voyage" | "lunar" | "eva" = "facility";
  /** Rover Rescue, the side-view EVA level. */
  eva: EvaMission | null = null;
  private evaSnapshot: HTMLCanvasElement | null = null;
  private evaRadio = 0;
  roverRescued = false;
  private finaleShown = false;
  /** NEXUS keys picked up on the surface; each one allows one turn of the cube. */
  readonly keysTaken = new Set<number>();
  private inHall = false;
  private hallVisits = 0;
  private riseTime = 3.2;
  private bestJump = 0;
  /** Footprints on the lunar surface (top-down). */
  private readonly prints: { x: number; y: number; a: number }[] = [];
  private lastPrint = { x: 0, y: 0 };
  /** The colony's NEXUS cube. It keeps its state between visits. */
  readonly nexus = new NexusRun();
  nexusOpen = false;
  onNexus: () => void = () => undefined;
  private voyageT = 0;
  private voyageCue = 0;
  private voyageDone = false;
  private completeTimer = -1;
  private shipFade = 0;
  private flightActive = false;
  private flightT = 0;
  private commsBeat: "idle" | "ask" | "reply" | "copy" | "done" = "idle";
  private seatActive = false;
  private seated = false;
  private stationsLive = false;
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
    this.lunarActors = lunarCrew.map((def, index) => ({
      id: def.id,
      x: def.x,
      y: def.y,
      facing: def.facing,
      look: def.look,
      label: def.name,
      walking: false,
      walkPhase: 0,
      bob: index * 0.9 + 0.3,
      suitBlend: 0,
      radioLight: false,
      prompt: `E — Talk to ${def.name}`,
      interactive: true,
      radius: 78,
    }));
    for (const actor of [...this.actors, ...this.lunarActors, this.player]) this.animator.track(actor);
    this.mission = new Mission({
      onObjective: (text) => this.ui.setObjective(text),
      onToast: (title, body, detail) => this.ui.pushToast(title, body, detail),
      onRadios: (ids, delay) => this.radioTimers.push({ t: delay, ids }),
      onRileyWalk: () => {
        this.rileyWalking = true;
        this.rileyIndex = 0;
      },
      onBoard: () => this.beginBoarding(),
      onRileySeat: () => {
        this.rileyShip = "seat";
        this.rileyIndex = 0;
      },
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
    // The radio is already on the player's wrist: Mission Control checks in after the intro.
    this.radioTimers.push({ t: 4.5, ids: ["R001", "R002"] });
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
    this.animator.track(this.player);
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
      doors: this.automaticDoors.map(d => ({ id: d.definition.id, openness: d.openness })),
      walking: this.player.walking,
      facing: this.player.facing,
      suitBlend: this.suitBlend,
      scene: this.scene,
      seated: this.seated,
      voyageT: Math.round(this.voyageT * 100) / 100,
      voyageDone: this.voyageDone,
    };
  }

  update(dt: number): void {
    if (!this.started) return;
    this.time += dt;
    if (this.scene === "voyage") {
      this.updateVoyage(dt);
      this.keys.endFrame();
      return;
    }
    if (this.scene === "eva") {
      this.updateEva(dt);
      this.keys.endFrame();
      return;
    }
    if (this.completeTimer > 0) {
      this.completeTimer -= dt;
      if (this.completeTimer <= 0) this.startVoyage();
    }
    this.interactLock = Math.max(0, this.interactLock - dt);
    this.ui.update(dt);

    if (this.dialogue.isOpen && (this.keys.consume("enter") || this.keys.consume(" "))) this.requestAdvance();
    const locked = this.isLocked();
    if (!locked && this.interactLock <= 0 && this.keys.consume("e")) {
      const target = this.nearest();
      if (target) this.handleInteract(target.id);
    }

    if (this.scene === "facility") {
      for (const door of this.automaticDoors) door.update(dt, [this.player, ...this.actors].map(actorFootprint));
    }
    if (!locked) this.movePlayer(dt);
    else this.player.walking = false;
    if (this.seated) this.player.facing = "up";
    this.updateRiley(dt);
    this.updateSuit(dt);
    this.updateFlight(dt);
    this.updateSeat(dt);
    this.updateBoarding(dt);
    this.dialogue.update(dt);
    this.updateRadios(dt);
    this.syncDialogue();
    this.updateIntro(dt);
    if (this.scene === "lunar") {
      this.updateLunarSuit(dt);
      this.leavePrints();
      this.collectKeys();
      this.updateHall(dt);
    }
    else this.player.suitBlend = this.mission.suitEquipped ? 1 : this.suitBlend;
    this.player.radioLight = this.mission.radioAcquired;
    this.player.label = "";
    for (const actor of [...this.people(), this.player]) this.animator.update(actor, dt);
    this.placeCamera(dt);
    const here = this.scene === "ship" ? shipRoomAt(this.player.x, this.player.y) : this.scene === "lunar" ? lunarRoomAt(this.player.x, this.player.y) : roomAt(this.player.x, this.player.y);
    this.ui.setLocation(here.label);
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
    if (this.scene === "voyage") {
      drawVoyage(this.ctx, this.viewW, this.viewH, this.voyageT);
      return;
    }
    if (this.scene === "eva") {
      if (this.eva) drawEva(this.ctx, this.viewW, this.viewH, this.eva, this.evaSnapshot);
      return;
    }
    const paintActors = this.people().map((actor) => ({ ...actor }));
    drawWorld(this.ctx, {
      time: this.time,
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      zoom: this.zoom,
      actors: paintActors,
      player: { ...this.player },
      highlight: this.highlight(),
      focusRoom: this.scene === "ship" ? "cockpit" : this.scene === "lunar" ? "" : focusFor(this.mission.objective),
      radioTaken: this.mission.radioAcquired,
      suitReady: this.mission.suitEquipped,
      hatchOpen: this.hatchOpen,
      doorOpenness: Object.fromEntries(this.automaticDoors.map(d => [d.definition.id, d.openness])),
      viewW: this.viewW,
      viewH: this.viewH,
      scene: this.scene,
      stationsLive: this.stationsLive,
      footprints: this.scene === "lunar" ? this.prints : undefined,
      roomNeeds: this.scene === "lunar" ? this.roomNeeds() : undefined,
      nexusKeys: this.scene === "lunar" ? NEXUS_KEYS.map((k, i) => ({ ...k, taken: this.keysTaken.has(i) })) : undefined,
    });
  }

  private handleInteract(id: string): void {
    if (this.isLocked()) return;
    if (this.scene === "lunar") {
      this.handleLunarInteract(id);
      return;
    }
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
      return;
    }
    if (result.kind === "flight") {
      this.flightActive = true;
      this.flightT = 0;
      this.sfx.blip();
      return;
    }
    if (result.kind === "comms") {
      this.commsBeat = "ask";
      this.radio.enqueue(this.mission.radioText("R005"));
      this.sfx.blip();
      return;
    }
    if (result.kind === "seat") {
      this.seatActive = true;
      this.sfx.blip();
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
    if (this.scene === "facility" && this.automaticDoors.some(door => door.blocks(box))) return true;
    return this.blocks.some(
      (block) => box.x < block.x + block.w && box.x + box.w > block.x && box.y < block.y + block.h && box.y + box.h > block.y,
    );
  }

  private updateRiley(dt: number): void {
    const riley = this.actor("riley");
    if (this.scene === "ship") {
      this.updateShipRiley(riley, dt);
      return;
    }
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

  private updateShipRiley(riley: Actor, dt: number): void {
    if (this.rileyShip === "enter") {
      const target = RILEY_ENTER[this.rileyIndex];
      if (!target || stepToward(riley, target.x, target.y, 110, dt)) {
        this.rileyIndex += 1;
        if (this.rileyIndex >= RILEY_ENTER.length) {
          this.rileyShip = "wait";
          riley.walking = false;
          riley.facing = "up";
        }
      }
      return;
    }
    if (this.rileyShip === "seat") {
      const target = RILEY_SEAT_PATH[this.rileyIndex];
      if (!target || stepToward(riley, target.x, target.y, 120, dt)) {
        this.rileyIndex += 1;
        if (this.rileyIndex >= RILEY_SEAT_PATH.length) {
          this.rileyShip = "seated";
          riley.x = RILEY_SEAT_PATH[RILEY_SEAT_PATH.length - 1].x;
          riley.y = RILEY_SEAT_PATH[RILEY_SEAT_PATH.length - 1].y;
          riley.walking = false;
          riley.facing = "up";
          riley.seated = true;
        }
      }
      return;
    }
    if (this.rileyShip === "seated") {
      riley.facing = "up";
      riley.seated = true;
      riley.walking = false;
      return;
    }
    riley.walking = false;
  }

  private updateFlight(dt: number): void {
    if (!this.flightActive) return;
    this.flightT += dt;
    const step = this.flightT < 0.45 ? 1 : this.flightT < 0.95 ? 2 : this.flightT < 1.45 ? 3 : 4;
    this.ui.showFlight(step);
    if (this.flightT < 2.3) return;
    this.flightActive = false;
    this.ui.hideFlight();
    this.mission.finishFlight();
  }

  private updateSeat(dt: number): void {
    if (!this.seatActive) return;
    const arrived = stepToward(this.player, PILOT_SEAT.x, PILOT_SEAT.y, 140, dt);
    this.player.facing = "up";
    if (!arrived) return;
    this.seatActive = false;
    this.seated = true;
    this.player.seated = true;
    this.player.walking = false;
    this.player.facing = "up";
    this.stationsLive = true;
    this.mission.markSeated();
    this.ui.pushToast("ALL SYSTEMS READY", "The crew is at station.");
    this.ui.pushToast("AWAITING LAUNCH AUTHORIZATION", "Remain seated. Launch is not authorized.");
    this.radio.enqueue(this.mission.radioText("R007"));
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
    if (this.boardActive || this.scene === "ship") return;
    this.boardActive = true;
    this.boardT = 0;
    this.hatchOpen = true;
  }

  private updateBoarding(dt: number): void {
    if (this.shipFade > 0) {
      this.shipFade = Math.max(0, this.shipFade - dt);
      this.ui.setFade(this.shipFade / 0.9);
      if (this.shipFade === 0 && this.rileyShip === "hold") {
        this.rileyShip = "enter";
        this.rileyIndex = 0;
      }
    }
    if (!this.boardActive || this.scene === "ship") return;
    this.boardT += dt;
    this.player.walking = true;
    stepToward(this.player, BOARD_TARGET.player.x, BOARD_TARGET.player.y, 150, dt);
    const fade = clamp((this.boardT - 1.15) / 0.75, 0, 1);
    this.ui.setFade(fade);
    // No spaceship interior: boarding goes straight to the Earth-to-Moon flight.
    if (this.boardT > 2.35) {
      this.boardActive = false;
      this.player.suitBlend = 1;
      this.suitBlend = 1;
      this.startVoyage();
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
    if (state.completedId === "R005" && this.commsBeat === "ask") {
      this.commsBeat = "reply";
      const script = this.mission.script("COMMS_CONFIRM");
      this.dialogue.play(script, this.mission.playerName, () => {
        this.commsBeat = "copy";
        this.radio.enqueue(this.mission.radioText("R006"));
      });
    }
    if (state.completedId === "R006" && this.commsBeat === "copy") {
      this.commsBeat = "done";
      this.mission.finishComms();
    }
    if (state.completedId === "R007") this.finishChapter();
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

  /** Seated, launch authorized: show the Chapter 1 card, then roll the Earth-to-Moon sequence. */
  private finishChapter(): void {
    if (this.mission.chapterCompleted) return;
    this.mission.completeChapter();
    this.ui.hideRadio();
    this.ui.setPrompt(null);
    this.ui.setHudVisible(false);
    this.ui.showComplete();
    this.completeTimer = 6;
  }

  startVoyage(): void {
    if (this.scene === "voyage") return;
    if (!this.mission.chapterCompleted) this.mission.completeChapter();
    this.completeTimer = -1;
    this.scene = "voyage";
    this.voyageT = 0;
    this.voyageCue = 0;
    this.voyageDone = false;
    this.ui.hideComplete();
    this.ui.hideRadio();
    this.ui.setPrompt(null);
    this.ui.setHudVisible(false);
    this.ui.setFade(0);
    this.ui.setVoyageSkip(true);
    this.sfx.unlock();
  }

  skipVoyage(): void {
    if (this.scene !== "voyage" || this.voyageDone) return;
    this.voyageT = VOYAGE_DURATION;
    this.voyageCue = CUES.length;
    this.endVoyage();
  }

  private updateVoyage(dt: number): void {
    if (this.voyageDone) return;
    if (this.keys.consume("escape")) {
      this.skipVoyage();
      return;
    }
    this.voyageT = Math.min(VOYAGE_DURATION, this.voyageT + dt);
    while (this.voyageCue < CUES.length && CUES[this.voyageCue].at <= this.voyageT) {
      this.sfx.voyage(CUES[this.voyageCue].sound);
      this.voyageCue += 1;
    }
    if (this.voyageT >= VOYAGE_DURATION) this.endVoyage();
  }

  /** Touchdown: no card, the game simply continues at Selene Base. */
  private endVoyage(): void {
    this.voyageDone = true;
    this.ui.setVoyageSkip(false);
    this.enterLunar();
    this.ui.showInspect(
      "WELCOME TO THE MOON",
      `${this.mission.playerName} and Riley have landed at Selene Base, lunar south pole.`,
      "The craft, base, crew and year 2048 are fictional. The distance, travel time, gravity and south-pole facts come from NASA.",
    );
    this.ui.showInspect(
      "REAL SKY DATA",
      `In November 2048, seen from 89.5° S, the Sun never climbs higher than ${SUN_MAX.toFixed(2)}° and Earth is above the horizon only ${Math.round(EARTH_UP_SHARE * 100)}% of the time. NEXUS and the EVA use this data.`,
      SKY_SOURCE,
    );
  }

  /** After the touchdown card: the player stands on the landing pad in the suit, Riley beside them. */
  enterLunar(): void {
    if (this.scene !== "voyage" || !this.voyageDone) return;
    this.scene = "lunar";
    this.areas = lunarWalkable();
    this.blocks = lunarObstacles();
    this.bounds = LUNAR_WORLD;
    this.seated = false;
    this.seatActive = false;
    this.stationsLive = false;
    this.rileyShip = "facility";
    this.player.seated = false;
    this.player.x = LUNAR_SPAWN.x;
    this.player.y = LUNAR_SPAWN.y;
    this.player.facing = "up";
    this.player.walking = false;
    this.suitBlend = 1;
    this.player.suitBlend = 1;
    this.animator.track(this.player);
    const riley = this.actor("riley");
    riley.x = LUNAR_RILEY.x;
    riley.y = LUNAR_RILEY.y;
    riley.facing = "left";
    riley.seated = false;
    riley.walking = false;
    riley.interactive = true;
    riley.prompt = "E — Talk to Riley Morgan";
    riley.radius = 78;
    this.animator.track(riley);
    this.ui.hideArrival();
    this.ui.setVoyageSkip(false);
    this.ui.setHudVisible(true);
    this.ui.setBannerLines("SELENE BASE", "LUNAR SOUTH POLE · 2048");
    this.banner = 3.4;
    this.hint = 8;
    this.intro = 0;
    this.ui.setObjective("Visit NEXUS in the Grand Hall");
    this.ui.pushToast("OBJECTIVE UPDATED", "Visit NEXUS in the Grand Hall, then find the 11 NEXUS keys outside");
    this.shipFade = 0.9;
    this.ui.setFade(1);
    this.placeCamera(0);
  }

  private handleLunarInteract(id: string): void {
    if (id === "lu-eva") {
      this.startEva();
      return;
    }
    if (id === "lu-orbi") {
      this.dialogue.play({ id: "ORBI", lines: this.orbiLines() }, this.mission.playerName, () => undefined);
      this.syncDialogue();
      this.sfx.blip();
      return;
    }
    if (id === "lu-nexus") {
      if (nexusPaint.rise < 1) return;
      this.nexusOpen = true;
      this.ui.hideInspect();
      this.sfx.blip();
      this.onNexus();
      return;
    }
    const actor = this.people().find((item) => item.id === id);
    if (actor) {
      faceToward(actor, this.player);
      const speaker = actor.id === "riley" ? "Riley Morgan" : actor.label;
      this.dialogue.play({ id: `LUNAR_HELLO_${actor.id}`, lines: [{ speaker, text: this.lunarLine() }] }, this.mission.playerName, () => undefined);
      this.syncDialogue();
      this.ui.hideInspect();
      this.sfx.blip();
      return;
    }
    const prop = lunarProps.find((item) => item.id === id);
    if (prop?.examine) {
      this.ui.showInspect(prop.examine.title, prop.examine.body, prop.examine.detail);
      this.inspectTime = 9;
      this.sfx.blip();
    }
  }

  /** Suit outside, uniform inside: the change blends while crossing an EVA hatch. */
  private updateLunarSuit(dt: number): void {
    const target = onSurface(this.player.y) ? 1 : 0;
    const step = dt / 0.6;
    this.suitBlend = target > this.suitBlend ? Math.min(target, this.suitBlend + step) : Math.max(target, this.suitBlend - step);
    this.player.suitBlend = this.suitBlend;
  }

  private updateIntro(dt: number): void {
    this.intro = Math.max(0, this.intro - dt);
    this.banner = Math.max(0, this.banner - dt);
    this.hint = Math.max(0, this.hint - dt);
    this.ui.setBannerVisible(this.scene === "ship" || this.banner > 0);
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
    const aboveActor = this.people().some((actor) => actor.id === target.id);
    const lift = (aboveActor ? 132 : 20) * this.zoom;
    const side = 0;
    const x = (target.promptX - this.cameraX) * this.zoom + side;
    const y = (target.promptY - this.cameraY) * this.zoom - lift;
    this.ui.setPrompt(target.prompt, x, y, this.viewW, this.viewH);
  }

  private nearest(): Target | null {
    let best: Target | null = null;
    for (const actor of this.people()) {
      if (!actor.interactive) continue;
      const dist = Math.hypot(actor.x - this.player.x, actor.y - this.player.y);
      if (dist > actor.radius) continue;
      if (!best || dist < best.dist) {
        best = { id: actor.id, x: actor.x, y: actor.y, promptX: actor.x, promptY: actor.y, radius: actor.radius, prompt: actor.prompt, dist };
      }
    }
    for (const prop of this.activeProps()) {
      if (!prop.prompt || !prop.radius) continue;
      if (prop.id === "radio" && this.mission.radioAcquired) continue;
      if (prop.id === "suit" && this.mission.suitEquipped) continue;
      // NEXUS can only be examined once it has risen; its bubble floats above the cube, not over the crystals.
      if (prop.id === "lu-nexus" && nexusPaint.rise < 1) continue;
      const anchor = propAnchor(prop as PropDef);
      const dist = Math.hypot(anchor.x - this.player.x, anchor.y - this.player.y);
      if (dist > prop.radius) continue;
      if (!best || dist < best.dist) {
        best = {
          id: prop.id,
          x: anchor.x,
          y: anchor.y,
          // NEXUS: bubble to the left of the platform so it never covers the cube or its crystals.
          promptX: prop.id === "lu-nexus" ? prop.x - 30 : prop.x + prop.w / 2,
          promptY: prop.id === "lu-nexus" ? prop.y + 236 : prop.y,
          radius: prop.radius,
          prompt: prop.prompt,
          dist,
        };
      }
    }
    return best;
  }

  private highlight(): { x: number; y: number } | null {
    if (this.isLocked()) return null;
    const target = this.nearest();
    return target ? { x: target.x, y: target.y } : null;
  }

  private radioLabel(): string | null {
    if (!this.mission.radioAcquired) return null;
    if (this.scene === "lunar") return onSurface(this.player.y) ? "SUIT COMM LINK" : "RADIO LINKED";
    return this.mission.suitEquipped ? "SUIT COMM LINK" : "RADIO LINKED";
  }

  warm(dt: number): void {
    this.time += dt;
  }

  private placeCamera(dt: number): void {
    const seatedZoom = this.seated && this.scene === "ship";
    this.zoom = seatedZoom ? clamp(this.viewW / 900, 1, 1.3) : clamp(this.viewW / 1100, 0.75, 1.25);
    const viewW = this.viewW / this.zoom;
    const viewH = this.viewH / this.zoom;
    const lookX = seatedZoom ? SHIP_LOOK.x : this.player.x;
    const lookY = seatedZoom ? SHIP_LOOK.y : this.player.y;
    const followX = lookX - viewW / 2;
    const followY = lookY - viewH / 2;
    const introMix = this.scene === "facility" ? clamp(this.intro / 2.5, 0, 1) : 0;
    let targetX = followX * (1 - introMix) + (INTRO_FOCUS.x - viewW / 2) * introMix;
    let targetY = followY * (1 - introMix) + (INTRO_FOCUS.y - viewH / 2) * introMix;
    if (viewW >= this.bounds.width) targetX = (this.bounds.width - viewW) / 2;
    else targetX = clamp(targetX, 0, this.bounds.width - viewW);
    if (viewH >= this.bounds.height) targetY = (this.bounds.height - viewH) / 2;
    else targetY = clamp(targetY, 0, this.bounds.height - viewH);
    if (dt <= 0) {
      this.cameraX = targetX;
      this.cameraY = targetY;
      return;
    }
    const rate = 1 - Math.exp(-6 * dt);
    this.cameraX += (targetX - this.cameraX) * rate;
    this.cameraY += (targetY - this.cameraY) * rate;
  }

  private activeProps(): (PropDef | LunarProp)[] {
    if (this.scene === "lunar") return lunarProps;
    return this.scene === "ship" ? shipProps : props;
  }

  /** The people present in the current map (Riley travels with the player). */
  private people(): Actor[] {
    if (this.scene === "ship") return this.actors.filter((actor) => actor.id === "riley");
    if (this.scene === "lunar") return [...this.lunarActors, this.actor("riley")];
    return this.actors;
  }

  /** Called when the player leaves the NEXUS screen: the base reflects the cube. */
  closeNexus(): void {
    this.nexusOpen = false;
    const run = this.nexus;
    nexusPaint.solved = run.done;
    nexusPaint.color = run.done ? "#FFFFFF" : NEEDS[run.lowest()].color;
    nexusPaint.label = run.done ? "NEXUS · 2048" : `NEXUS · ${run.turns} / ${TOTAL_TURNS}`;
    if (run.done) {
      window.setTimeout(() => this.checkFinale(), 1200);
      this.ui.setObjective(this.roverRescued ? "Selene Base is ready" : "Go outside: rescue the scout rover");
      this.ui.pushToast("NEXUS COMPLETE", "2048 · Every need is full.");
    } else if (run.turns > 0) {
      const low = NEEDS[run.lowest()].name;
      this.ui.pushToast("COLONY UPDATE", `${low} is the lowest need right now.`);
    }
    if (!run.done) this.refreshObjective();
  }

  get keyCount(): number {
    return this.keysTaken.size;
  }

  debugGiveKeys(n: number): void {
    for (let i = 0; i < Math.min(n, NEXUS_KEYS.length); i += 1) this.keysTaken.add(i);
  }

  private collectKeys(): void {
    if (!onSurface(this.player.y)) return;
    NEXUS_KEYS.forEach((k, i) => {
      if (this.keysTaken.has(i) || Math.hypot(this.player.x - k.x, this.player.y - k.y) > 46) return;
      this.keysTaken.add(i);
      this.sfx.blip();
      const n = this.keysTaken.size;
      this.ui.pushToast("NEXUS KEY FOUND", `${n} / ${NEXUS_KEYS.length} · one more turn of the cube`);
      if (n === NEXUS_KEYS.length) this.ui.pushToast("ALL KEYS FOUND", "Go back to NEXUS in the Grand Hall");
      this.refreshObjective();
    });
  }

  /** The cube rises out of the floor when you walk into the Grand Hall. */
  private updateHall(dt: number): void {
    const here = lunarRoomAt(this.player.x, this.player.y).id === "lu-hall";
    if (here && !this.inHall) {
      this.hallVisits += 1;
      this.riseTime = this.hallVisits === 1 ? 4.2 : 1.4;
      nexusPaint.rise = 0;
      if (this.hallVisits === 1) {
        this.radio.enqueue({ id: "ORBI-HELLO", sender: "ORBI", text: "Beep! Hi, I'm ORBI. Welcome to the NEXUS chamber. Watch: the cube is waking up!" });
        this.sfx.voyage("liftoff");
      } else {
        this.sfx.blip();
      }
    }
    if (!here && this.inHall) nexusPaint.rise = 0;
    this.inHall = here;
    if (here) nexusPaint.rise = Math.min(1, nexusPaint.rise + dt / this.riseTime);
  }

  private refreshObjective(): void {
    if (this.scene !== "lunar") return;
    const keys = `${this.keysTaken.size}/${NEXUS_KEYS.length}`;
    if (this.nexus.done) this.ui.setObjective(this.roverRescued ? "Selene Base is ready" : "Go outside: rescue the scout rover");
    else if (this.keysTaken.size > this.nexus.turns) this.ui.setObjective(`Turn NEXUS in the Grand Hall · keys ${keys}`);
    else this.ui.setObjective(`Find NEXUS keys on the surface · ${keys}`);
  }

  /** ORBI explains the cube in short, kid-sized lines. */
  private orbiLines(): { speaker: string; text: string }[] {
    const keys = this.keysTaken.size;
    const ready = keys - this.nexus.turns;
    const say = (text: string) => ({ speaker: "ORBI", text });
    if (this.nexus.done) return [say("2048! Every need is full. You and NEXUS saved Selene Base, {playerName}!")];
    return [
      say("Hi {playerName}! I'm ORBI. This big cube is NEXUS. It runs the whole base."),
      say("Each side has a crystal for one need: Energy, Signal, Water, Air, Shield and Food."),
      say("When you turn a layer, pieces move to new sides. One need gets stronger, and its neighbours get a little weaker."),
      say(`Every turn needs a NEXUS key. There are ${NEXUS_KEYS.length} glowing keys out on the Moon surface. You have ${keys}.`),
      say(ready > 0 ? `You have ${ready} turn${ready === 1 ? "" : "s"} ready! Examine NEXUS and drag the glowing layer the way its arrows flow.` : "Go outside through an EVA hatch and look for the glowing shards. Then come back and turn the cube!"),
    ];
  }

  /** Which base room shows which NEXUS need. */
  private roomNeeds(): Record<string, { name: string; color: string; level: number }> {
    const counts = this.nexus.cube.counts();
    const ROOMS = { "lu-pow": "px", "lu-com": "nx", "lu-ind": "py", "lu-hab": "ny", "lu-green": "nz", "lu-med": "pz" } as const;
    return Object.fromEntries(Object.entries(ROOMS).map(([room, face]) => [room, { ...NEEDS[face], level: counts[face] }]));
  }

  private leavePrints(): void {
    const p = this.player;
    if (!onSurface(p.y) || !p.walking) return;
    const d = Math.hypot(p.x - this.lastPrint.x, p.y - this.lastPrint.y);
    if (d < 26) return;
    const a = Math.atan2(p.y - this.lastPrint.y, p.x - this.lastPrint.x) + Math.PI / 2;
    const side = this.prints.length % 2 ? 5 : -5;
    this.prints.push({ x: p.x + Math.cos(a) * side, y: p.y + Math.sin(a) * side, a });
    if (this.prints.length > 600) this.prints.shift();
    this.lastPrint = { x: p.x, y: p.y };
  }

  /** Leave through the Rover Exit: the view tilts from top-down to the side-view Moon level. */
  startEva(): void {
    if (this.scene !== "lunar") return;
    const snap = document.createElement("canvas");
    snap.width = this.canvas.width;
    snap.height = this.canvas.height;
    snap.getContext("2d")?.drawImage(this.canvas, 0, 0);
    this.evaSnapshot = snap;
    const counts = this.nexus.cube.counts();
    this.eva = new EvaMission({ energy: counts.px, air: counts.ny, shield: counts.pz }, {
      radio: (text) => this.radio.enqueue({ id: `EVA${this.evaRadio++}`, sender: "RILEY MORGAN", text }),
      toast: (title, body) => this.ui.pushToast(title, body),
      fact: (title, body, source) => {
        this.ui.showInspect(title, body, source);
        this.inspectTime = 7;
      },
      sound: (kind) => {
        if (kind === "pickup" || kind === "repair") this.sfx.blip();
        else if (kind === "alarm") this.sfx.voyage("beep");
        else if (kind === "land") this.sfx.voyage("pulse");
        else if (kind === "done") this.sfx.voyage("touchdown");
      },
      done: () => this.exitEva(),
    });
    // Today's real sky (NASA JPL Horizons) for the date of the current NEXUS turn.
    const day = this.nexus.step?.day ?? 30;
    const sky = skyAt(day);
    this.eva.sunDeg = sky.sun;
    this.eva.earthDeg = sky.earth;
    this.eva.skyLines = [
      sky.sun > 0 ? `Today, ${formatDay(sky.date)}: the Sun is only ${sky.sun.toFixed(2)}° above the horizon.` : `Today, ${formatDay(sky.date)}: the Sun has slipped just below the horizon.`,
      sky.earth > 0 ? `Earth is ${sky.earth.toFixed(1)}° up: we can still call home.` : `Earth is ${Math.abs(sky.earth).toFixed(1)}° below the horizon: the rover is our only relay.`,
    ];
    this.scene = "eva";
    this.player.walking = false;
    this.ui.hideInspect();
    this.ui.setObjective("Rover Rescue: find 3 parts");
    this.ui.setLocation("LUNAR SURFACE · EVA");
    this.ui.setPrompt(null);
    this.shipFade = 0;
    this.ui.setFade(0);
    this.sfx.voyage("beep");
  }

  private updateEva(dt: number): void {
    const eva = this.eva;
    if (!eva) return;
    this.ui.update(dt);
    const k = this.keys;
    const input: EvaInput = {
      left: k.held("arrowleft") || k.held("a"),
      right: k.held("arrowright") || k.held("d"),
      jump: k.consume(" ") || k.consume("w") || k.consume("arrowup"),
      use: k.consume("e") || k.consume("enter"),
      useHeld: k.held("e") || k.held("enter"),
    };
    eva.setView(this.viewW, this.viewH);
    eva.update(dt, input);
    if (this.eva !== eva) return;
    const objective =
      eva.phase === "drive" ? "Drive the rover home" :
      eva.phase === "repair" ? "Repair the scout rover" :
      eva.parts.size === 3 ? "Bring the parts to the rover" : `Rover Rescue: find parts (${eva.parts.size}/3)`;
    this.ui.setObjective(objective);
    this.updateRadios(dt);
    if (this.inspectTime > 0) {
      this.inspectTime -= dt;
      if (this.inspectTime <= 0) this.ui.hideInspect();
    }
  }

  /** Both missions done (NEXUS at 2048 and the rover home): the finale. */
  private checkFinale(): void {
    if (this.finaleShown || !this.nexus.done || !this.roverRescued) return;
    this.finaleShown = true;
    this.ui.setObjective("Junior Astronaut certified");
    this.ui.showFinale(this.mission.playerName, [
      "NEXUS solved in 11 turns · 2048",
      "Scout rover rescued · signal relay online",
      `${this.ui.factCount} NASA facts in your Mission data`,
      this.bestJump > 0 ? `Best Moon jump: ${this.bestJump.toFixed(1)} m (about 6× an Earth jump)` : "Moon gravity: 1.62 m/s²",
    ]);
    this.sfx.voyage("touchdown");
  }

  closeFinale(): void {
    this.ui.hideFinale();
  }

  /** Back through the airlock into the garage. */
  private exitEva(): void {
    if (this.eva) this.bestJump = Math.max(this.bestJump, this.eva.summary().heightM);
    this.eva = null;
    this.evaSnapshot = null;
    this.scene = "lunar";
    this.roverRescued = true;
    this.player.x = 770;
    this.player.y = 1740;
    this.player.facing = "up";
    this.player.walking = false;
    this.animator.track(this.player);
    this.ui.hideInspect();
    this.ui.setObjective(this.nexus.done ? "Selene Base is ready" : "Examine NEXUS in the Grand Hall");
    this.ui.pushToast("ROVER RESCUED", "Signal relay online · the scout rover is home");
    window.setTimeout(() => this.checkFinale(), 1800);
    this.shipFade = 0;
    this.ui.setFade(0);
    this.placeCamera(0);
  }

  /** What the Moon crew say depends on the cube. */
  private lunarLine(): string {
    const run = this.nexus;
    if (run.done && this.roverRescued) return "Every need is full and the rover is home. You did it, {playerName}!";
    if (run.done) return "Every need is full. You did it, {playerName}!";
    if (this.roverRescued && run.turns === 0) return "Thanks for rescuing the rover! Now check NEXUS in the Grand Hall.";
    if (run.turns === 0) return `${NPC_GREETING} Have you seen NEXUS in the Grand Hall?`;
    const low = NEEDS[run.lowest()].name.toLowerCase();
    return `Our ${low} is running low. NEXUS can help — ${TOTAL_TURNS - run.turns} turns to go.`;
  }

  private isLocked(): boolean {
    return this.nexusOpen || this.dialogue.isOpen || this.suitActive || this.boardActive || this.flightActive || this.seatActive || this.seated || this.shipFade > 0 || this.commsBeat === "ask" || this.commsBeat === "reply" || this.commsBeat === "copy";
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

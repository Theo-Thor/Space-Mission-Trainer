import { Game } from "./game";
import { NexusScreen } from "./nexus/screen";
import { Sfx } from "./systems/sfx";
import { Surface } from "./ui/surface";

const canvas = document.querySelector<HTMLCanvasElement>("#view");
const nameInput = document.querySelector<HTMLInputElement>("#name-input");
const nameError = document.querySelector<HTMLElement>("#name-error");
const verified = document.querySelector<HTMLElement>("#verified");
const welcome = document.querySelector<HTMLElement>("#welcome");
const registration = document.querySelector<HTMLElement>("#registration");
const form = document.querySelector<HTMLFormElement>("#reg-form");
const cinematic = document.querySelector<HTMLElement>("#cinematic");
const video = document.querySelector<HTMLVideoElement>("#cine");
const fade = document.querySelector<HTMLElement>("#fade");
const mute = document.querySelector<HTMLButtonElement>("#mute");
const restart = document.querySelector<HTMLButtonElement>("#restart");
const replay = document.querySelector<HTMLButtonElement>("#replay");
const skip = document.querySelector<HTMLButtonElement>("#skip-cine");
const launch = document.querySelector<HTMLButtonElement>("#launch");
const skipVoyage = document.querySelector<HTMLButtonElement>("#skip-voyage");
const arrivalReplay = document.querySelector<HTMLButtonElement>("#arrival-replay");
const arrivalContinue = document.querySelector<HTMLButtonElement>("#arrival-continue");

if (!canvas || !nameInput || !nameError || !verified || !welcome || !registration || !form || !cinematic || !video || !fade || !mute || !restart || !replay || !skip || !launch || !skipVoyage || !arrivalReplay || !arrivalContinue) {
  throw new Error("The page is missing a required element");
}

const screen = { cinematic, video, registration, nameInput, nameError, verified, welcome, fade };

const sfx = new Sfx();
const surface = new Surface(
  () => game.requestAdvance(),
  () => game.closeInspect(),
);
const game = new Game(canvas, surface, sfx);
surface.setMuted(sfx.muted);

const savedName = localStorage.getItem("selene.playerName") ?? "";
nameInput.value = savedName;

mute.addEventListener("click", () => {
  surface.setMuted(sfx.toggle());
  sfx.unlock();
});
restart.addEventListener("click", () => window.location.reload());
replay.addEventListener("click", () => window.location.reload());
arrivalReplay.addEventListener("click", () => window.location.reload());
arrivalContinue.addEventListener("click", () => {
  arrivalContinue.blur();
  game.enterLunar();
});
launch.addEventListener("click", () => game.startVoyage());
skipVoyage.addEventListener("click", () => game.skipVoyage());

function normalizeName(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "").trim().replace(/\s+/g, " ").slice(0, 24);
}

function skipCinematic(): void {
  screen.video.pause();
  screen.cinematic.hidden = true;
}

skip.addEventListener("click", skipCinematic);
screen.video.addEventListener("ended", skipCinematic);
screen.video.addEventListener("error", () => {
  screen.cinematic.hidden = true;
});

screen.video.src = "/cinematics/before-the-launch.mp4";
screen.video.addEventListener("loadeddata", () => {
  screen.cinematic.hidden = false;
  void screen.video.play().catch(() => {
    screen.cinematic.hidden = true;
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!screen.cinematic.hidden) {
    skipCinematic();
    return;
  }
  const name = normalizeName(screen.nameInput.value);
  if (!name) {
    screen.nameError.hidden = false;
    screen.nameInput.focus();
    return;
  }
  screen.nameError.hidden = true;
  screen.nameInput.disabled = true;
  localStorage.setItem("selene.playerName", name);
  screen.verified.hidden = false;
  screen.welcome.textContent = `Welcome aboard, ${name}.`;
  screen.welcome.hidden = false;
  sfx.unlock();
  sfx.blip();
  window.setTimeout(() => {
    screen.fade.style.opacity = "1";
  }, 900);
  window.setTimeout(() => {
    screen.registration.hidden = true;
    screen.fade.style.opacity = "0";
    screen.nameInput.blur();
    game.start(name);
  }, 1600);
});

window.addEventListener("resize", () => game.resize());
window.addEventListener(
  "keydown",
  (event) => {
    if (screen.cinematic.hidden) return;
    if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
      event.preventDefault();
      skipCinematic();
    }
  },
  true,
);

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.started) game.warm(dt);
  else game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}

declare global {
  interface Window {
    __SELENE__?: {
      teleport: (x: number, y: number) => void;
      interact: (id: string) => void;
      advance: () => void;
      snapshot: () => Record<string, unknown>;
      start: (name: string) => void;
      voyage: () => void;
      skipVoyage: () => void;
      lunar: () => void;
      nexus: () => void;
      nexusPlay: (index?: number) => boolean;
    };
  }
}

const nexusSection = document.querySelector<HTMLElement>("#nexus");
if (!nexusSection) throw new Error("Missing #nexus");
const nexusScreen = new NexusScreen(nexusSection, game.nexus);
game.onNexus = () => nexusScreen.open(game.nexus);
nexusScreen.onClose = () => game.closeNexus();
window.__SELENE__ = {
  teleport: (x, y) => game.teleport(x, y),
  interact: (id) => game.debugInteract(id),
  advance: () => game.requestAdvance(),
  snapshot: () => game.snapshot(),
  start: (name) => {
    screen.registration.hidden = true;
    screen.cinematic.hidden = true;
    screen.video.pause();
    game.start(name);
  },
  voyage: () => game.startVoyage(),
  skipVoyage: () => game.skipVoyage(),
  lunar: () => {
    game.startVoyage();
    game.skipVoyage();
    game.enterLunar();
  },
  nexus: () => {
    if (game.snapshot().scene !== "lunar") window.__SELENE__?.lunar();
    game.teleport(1700, 470);
    // Input is ignored during the landing fade, so keep trying for a few seconds.
    let tries = 0;
    const tryOpen = (): void => {
      if (nexusScreen.isOpen || tries++ > 40) return;
      game.debugInteract("lu-nexus");
      window.setTimeout(tryOpen, 150);
    };
    tryOpen();
  },
  nexusPlay: (index = 0) => nexusScreen.playSuggested(index),
};

requestAnimationFrame(frame);

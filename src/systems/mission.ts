import { DIALOGUES, OBJECTIVES, RADIO_LINES, fillName } from "../content/story";
import type { DialogueScript, Phase } from "../types";

export type ResolveResult =
  | { kind: "dialogue"; id: string }
  | { kind: "toast"; title: string; body: string }
  | { kind: "inspect"; title: string; body: string; detail: string }
  | { kind: "pickup" }
  | { kind: "equip" }
  | { kind: "flight" }
  | { kind: "comms" }
  | { kind: "seat" };

export interface MissionSignals {
  onObjective(text: string): void;
  onToast(title: string, body: string, detail?: string): void;
  onRadios(ids: string[], delay: number): void;
  onRileyWalk(): void;
  onBoard(): void;
  onRileySeat(): void;
}

export class Mission {
  // Free-roam Chapter 1: the suit and boarding are open from the start; talks are optional.
  phase: Phase = "NEED_SUIT_EQUIPPING";
  playerName = "";
  briefingCompleted = false;
  radioAcquired = true; // the player starts with the personal radio
  radioActive = true;
  suitEquipped = false;
  companionMet = false;
  companionAtHatch = false;
  chapterCompleted = false;
  aboard = false;
  flightVerified = false;
  commsVerified = false;
  seated = false;
  valTalked = false;
  patelTalked = false;
  leoTalked = false;
  niaTalked = false;
  objective: string = OBJECTIVES.suitEquip;
  private boardingStarted = false;

  constructor(private readonly signals: MissionSignals) {}

  setName(name: string): void {
    this.playerName = name;
  }

  script(id: string): DialogueScript {
    const found = DIALOGUES[id];
    if (!found) throw new Error(`Missing dialogue ${id}`);
    return found;
  }

  resolve(id: string): ResolveResult {
    switch (id) {
      case "val":
        if (this.suitEquipped) return { kind: "dialogue", id: "RECEPTION_SUITED" };
        if (!this.valTalked) {
          this.valTalked = true;
          return { kind: "dialogue", id: "RECEPTION_FIRST" };
        }
        return { kind: "dialogue", id: "RECEPTION_REPEAT" };
      case "chen":
        if (!this.briefingCompleted) return { kind: "dialogue", id: "MISSION_BRIEFING" };
        if (this.suitEquipped) return { kind: "dialogue", id: "CHEN_AFTER_SUIT" };
        return { kind: "dialogue", id: "CHEN_BEFORE_RADIO" };
      case "patel":
        if (!this.patelTalked) {
          this.patelTalked = true;
          return { kind: "dialogue", id: "SCIENCE_SPECIALIST" };
        }
        return { kind: "dialogue", id: "SCIENCE_REPEAT" };
      case "leo":
        if (!this.leoTalked) {
          this.leoTalked = true;
          return { kind: "dialogue", id: "COMMUNICATIONS_BRIEFING" };
        }
        return { kind: "dialogue", id: "LEO_AFTER" };
      case "radio":
        if (this.radioAcquired) {
          return { kind: "toast", title: "COMMUNICATIONS UNIT ALREADY ACQUIRED", body: "The personal channel is already active." };
        }
        if (this.phase !== "NEED_RADIO_PICKUP") {
          return { kind: "toast", title: "COMMUNICATIONS", body: "Speak with Engineer Voss before collecting your radio." };
        }
        return { kind: "pickup" };
      case "nia":
        if (this.suitEquipped) return { kind: "dialogue", id: "NIA_REPEAT" };
        if (!this.niaTalked) {
          this.niaTalked = true;
          return { kind: "dialogue", id: "SUIT_PREPARATION_BRIEFING" };
        }
        return { kind: "dialogue", id: "NIA_WAITING" };
      case "suit":
        if (this.suitEquipped) {
          return { kind: "toast", title: "SPACESUIT ALREADY EQUIPPED", body: "Your equipment checks are already complete." };
        }
        return { kind: "equip" };
      case "riley":
        if (this.aboard && this.seated) return { kind: "dialogue", id: "RILEY_STANDBY" };
        if (this.aboard) return { kind: "dialogue", id: "RILEY_ABOARD" };
        if (!this.companionMet) return { kind: "dialogue", id: this.suitEquipped ? "CREWMATE_MEETING" : "CREWMATE_MEETING_EARLY" };
        if (!this.companionAtHatch) return { kind: "dialogue", id: "RILEY_WALKING" };
        return { kind: "dialogue", id: "RILEY_AT_HATCH" };
      case "hatch":
        if (this.chapterCompleted || this.aboard) return { kind: "toast", title: "BOARDING", body: "You are already aboard." };
        // Boarding is open at any time; Riley joins at the hatch.
        this.companionMet = true;
        this.companionAtHatch = true;
        this.phase = "NEED_BOARDING";
        return { kind: "dialogue", id: "FINAL_BOARDING" };
      case "moon":
        return {
          kind: "inspect",
          title: "MISSION DESTINATION",
          body: "LUNAR SOUTH POLAR REGION",
          detail: "Scientific objective: investigate lunar environmental conditions and potential evidence of water ice.",
        };
      case "console-a":
        if (!this.radioAcquired) {
          return { kind: "toast", title: "COMMUNICATIONS", body: "Communications access pending. Speak with Engineer Voss." };
        }
        return { kind: "toast", title: "PERSONAL CHANNEL — ACTIVE", body: "Your communications unit is linked to Mission Control." };
      case "storage":
        return { kind: "toast", title: "EQUIPMENT", body: "Equipment prepared for the upcoming expedition." };
      case "flight-console":
        if (this.flightVerified) return { kind: "toast", title: "FLIGHT SYSTEMS VERIFIED", body: "The flight checks are already complete." };
        if (this.phase !== "NEED_FLIGHT_SYSTEMS") {
          return { kind: "toast", title: "FLIGHT SYSTEMS", body: "The flight console is not ready for this check." };
        }
        return { kind: "flight" };
      case "comms-console":
        if (this.commsVerified) return { kind: "toast", title: "COMMUNICATIONS VERIFIED", body: "Mission Control already confirmed the channel." };
        if (!this.flightVerified) return { kind: "toast", title: "COMMUNICATIONS", body: "Check the flight systems before opening the channel." };
        if (this.phase !== "NEED_COMMS_VERIFY") {
          return { kind: "toast", title: "COMMUNICATIONS", body: "The communications console is not ready for this check." };
        }
        return { kind: "comms" };
      case "pilot-seat":
        if (this.seated) return { kind: "toast", title: "STATION", body: "You are already at your station." };
        if (!this.commsVerified) return { kind: "toast", title: "STATION", body: "Verify communications before taking your seat." };
        return { kind: "seat" };
      default:
        return { kind: "toast", title: "SELENE", body: "Nothing here responds." };
    }
  }

  completeDialogue(id: string): void {
    // Talks are optional and no longer gate anything.
    if (id === "MISSION_BRIEFING") this.briefingCompleted = true;
    if ((id === "CREWMATE_MEETING" || id === "CREWMATE_MEETING_EARLY") && !this.companionMet) {
      this.companionMet = true;
      this.signals.onRileyWalk();
      this.signals.onRadios(["R004"], 0.45);
    }
    if (id === "FINAL_BOARDING" && !this.boardingStarted && this.phase === "NEED_BOARDING") {
      this.boardingStarted = true;
      this.objective = OBJECTIVES.board;
      this.signals.onObjective(this.objective);
      this.signals.onBoard();
    }
  }

  collectRadio(): void {
    if (this.radioAcquired || this.phase !== "NEED_RADIO_PICKUP") return;
    this.radioAcquired = true;
    this.radioActive = true;
    this.phase = "NEED_SUIT_TECHNICIAN";
    this.signals.onToast("ITEM ACQUIRED", "PERSONAL COMMUNICATIONS UNIT", "Radio communications enabled.");
    this.advance(OBJECTIVES.suitReport);
    this.signals.onRadios(["R001", "R002"], 2.2);
  }

  finishSuit(): void {
    if (this.suitEquipped) return;
    this.suitEquipped = true;
    this.phase = "NEED_BOARDING";
    this.signals.onToast("SPACESUIT EQUIPPED", "COMMUNICATIONS CONNECTED");
    this.advance(OBJECTIVES.hatch);
    this.signals.onRadios(["R003"], 0.45);
  }

  markRileyArrived(): void {
    this.companionAtHatch = true;
  }

  completeChapter(): void {
    if (this.chapterCompleted) return;
    this.chapterCompleted = true;
    this.phase = "CHAPTER_COMPLETE";
  }

  arriveShip(): void {
    if (this.aboard) return;
    this.aboard = true;
    this.suitEquipped = true; // boarding without visiting the suit station still flies suited
    this.phase = "NEED_FLIGHT_SYSTEMS";
    this.objective = OBJECTIVES.flight;
    this.signals.onObjective(this.objective);
    this.signals.onToast("ABOARD", "SELENE SPACECRAFT", "Pre-launch operations.");
    this.signals.onToast("NEW OBJECTIVE", this.objective);
  }

  finishFlight(): void {
    if (this.flightVerified || this.phase !== "NEED_FLIGHT_SYSTEMS") return;
    this.flightVerified = true;
    this.phase = "NEED_COMMS_VERIFY";
    this.signals.onToast("FLIGHT SYSTEMS VERIFIED", "Flight computer, navigation, and power distribution.");
    this.objective = OBJECTIVES.commsVerify;
    this.signals.onObjective(this.objective);
  }

  finishComms(): void {
    if (this.commsVerified || this.phase !== "NEED_COMMS_VERIFY") return;
    this.commsVerified = true;
    this.phase = "NEED_SEAT";
    this.signals.onToast("COMMUNICATIONS VERIFIED", "Mission Control has cleared the crew to stations.");
    this.objective = OBJECTIVES.seat;
    this.signals.onObjective(this.objective);
    this.signals.onRileySeat();
  }

  markSeated(): void {
    if (this.seated) return;
    this.seated = true;
    this.phase = "AWAITING_LAUNCH";
    this.objective = OBJECTIVES.standby;
    this.signals.onObjective(this.objective);
  }

  radioText(id: string): { id: string; sender: string; text: string } {
    const source = RADIO_LINES[id];
    return {
      id,
      sender: source?.sender ?? "MISSION CONTROL",
      text: fillName(source?.text ?? "", this.playerName),
    };
  }

  private advance(next: string): void {
    const previous = this.objective;
    this.signals.onToast("OBJECTIVE COMPLETED", previous);
    this.objective = next;
    this.signals.onObjective(next);
    this.signals.onToast("NEW OBJECTIVE", next);
  }
}

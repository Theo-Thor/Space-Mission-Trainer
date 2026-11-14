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
  phase: Phase = "NEED_BRIEFING";
  playerName = "";
  briefingCompleted = false;
  radioAcquired = false;
  radioActive = false;
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
  objective: string = OBJECTIVES.briefing;
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
        if (this.phase === "NEED_BRIEFING") return { kind: "dialogue", id: "MISSION_BRIEFING" };
        if (this.suitEquipped) return { kind: "dialogue", id: "CHEN_AFTER_SUIT" };
        return { kind: "dialogue", id: "CHEN_BEFORE_RADIO" };
      case "patel":
        if (!this.patelTalked) {
          this.patelTalked = true;
          return { kind: "dialogue", id: "SCIENCE_SPECIALIST" };
        }
        return { kind: "dialogue", id: "SCIENCE_REPEAT" };
      case "leo":
        if (this.phase === "NEED_COMMUNICATIONS_BRIEFING") return { kind: "dialogue", id: "COMMUNICATIONS_BRIEFING" };
        if (!this.briefingCompleted) {
          return { kind: "toast", title: "MISSION BRIEFING", body: "Dr. Chen is expecting you in the briefing room first." };
        }
        if (!this.radioAcquired) return { kind: "dialogue", id: "LEO_BEFORE_PICKUP" };
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
        if (this.phase === "NEED_SUIT_TECHNICIAN") return { kind: "dialogue", id: "SUIT_PREPARATION_BRIEFING" };
        if (this.phase === "NEED_SUIT_EQUIPPING") return { kind: "dialogue", id: "NIA_WAITING" };
        if (this.suitEquipped) return { kind: "dialogue", id: "NIA_REPEAT" };
        return { kind: "toast", title: "SUIT PREPARATION", body: "Complete your communications steps before reporting here." };
      case "suit":
        if (this.suitEquipped) {
          return { kind: "toast", title: "SPACESUIT ALREADY EQUIPPED", body: "Your equipment checks are already complete." };
        }
        if (this.phase !== "NEED_SUIT_EQUIPPING") {
          return { kind: "toast", title: "SUIT PREPARATION", body: "Technician Brooks has to clear you before the station will start." };
        }
        return { kind: "equip" };
      case "riley":
        if (this.aboard && this.seated) return { kind: "dialogue", id: "RILEY_STANDBY" };
        if (this.aboard) return { kind: "dialogue", id: "RILEY_ABOARD" };
        if (this.phase === "NEED_CREWMATE_MEETING") return { kind: "dialogue", id: "CREWMATE_MEETING" };
        if (this.companionMet && !this.companionAtHatch) return { kind: "dialogue", id: "RILEY_WALKING" };
        if (this.companionMet && this.companionAtHatch && this.phase === "NEED_BOARDING") {
          return { kind: "dialogue", id: "RILEY_AT_HATCH" };
        }
        return { kind: "toast", title: "CREWMATE", body: "Finish your preparation before meeting Riley." };
      case "hatch":
        if (this.chapterCompleted) return { kind: "toast", title: "BOARDING", body: "You are already aboard." };
        if (!this.briefingCompleted || !this.radioAcquired || !this.suitEquipped || !this.companionMet) {
          return {
            kind: "toast",
            title: "BOARDING",
            body: "Boarding authorization pending. Complete your preparation objectives.",
          };
        }
        if (!this.companionAtHatch) {
          return { kind: "toast", title: "BOARDING", body: "Your crewmate is approaching the boarding hatch." };
        }
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
    if (id === "MISSION_BRIEFING" && !this.briefingCompleted) {
      this.briefingCompleted = true;
      this.phase = "NEED_COMMUNICATIONS_BRIEFING";
      this.advance(OBJECTIVES.comms);
    }
    if (id === "COMMUNICATIONS_BRIEFING" && this.phase === "NEED_COMMUNICATIONS_BRIEFING") {
      this.phase = "NEED_RADIO_PICKUP";
      this.advance(OBJECTIVES.radio);
    }
    if (id === "SUIT_PREPARATION_BRIEFING" && this.phase === "NEED_SUIT_TECHNICIAN") {
      this.phase = "NEED_SUIT_EQUIPPING";
      this.advance(OBJECTIVES.suitEquip);
    }
    if (id === "CREWMATE_MEETING" && this.phase === "NEED_CREWMATE_MEETING") {
      this.companionMet = true;
      this.phase = "NEED_BOARDING";
      this.advance(OBJECTIVES.hatch);
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
    this.phase = "NEED_CREWMATE_MEETING";
    this.signals.onToast("SPACESUIT EQUIPPED", "COMMUNICATIONS CONNECTED");
    this.advance(OBJECTIVES.crew);
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

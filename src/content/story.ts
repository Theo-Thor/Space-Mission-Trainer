import type { DialogueScript } from "../types";

export const OBJECTIVES = {
  briefing: "Report to Mission Briefing",
  comms: "Visit the Communications Lab",
  radio: "Collect Your Radio",
  suitReport: "Report to Suit Preparation",
  suitEquip: "Equip Your Spacesuit",
  crew: "Meet Your Crewmate",
  hatch: "Proceed to the Boarding Hatch",
  board: "Board the Spacecraft",
  flight: "Check Flight Systems",
  commsVerify: "Verify Communications",
  seat: "Take Your Seat",
  standby: "Awaiting Launch Authorization",
} as const;

export const RADIO_LINES: Record<string, { sender: string; text: string }> = {
  R001: {
    sender: "MISSION CONTROL",
    text: "Mission Control to {playerName}. Personal communications channel is active. Welcome aboard.",
  },
  R002: {
    sender: "MISSION CONTROL",
    text: "Your next stop is Suit Preparation. Technician Brooks is expecting you.",
  },
  R003: {
    sender: "MISSION CONTROL",
    text: "Mission Control here. Suit communications are online. Your crewmate is waiting near the boarding corridor.",
  },
  R004: {
    sender: "MISSION CONTROL",
    text: "Crew boarding is authorized. Proceed to the spacecraft access hatch.",
  },
  R005: {
    sender: "MISSION CONTROL",
    text: "Selene crew, this is Mission Control. Confirm communications status.",
  },
  R006: {
    sender: "MISSION CONTROL",
    text: "Copy, Selene. Communications verified. Proceed to your stations.",
  },
  R007: {
    sender: "MISSION CONTROL",
    text: "Selene crew, final checks complete. Remain on standby for launch authorization.",
  },
};

const line = (speaker: string, text: string) => ({ speaker, text });

export const DIALOGUES: Record<string, DialogueScript> = {
  RECEPTION_FIRST: {
    id: "RECEPTION_FIRST",
    lines: [
      line("VAL ORTIZ", "Good morning! You must be {playerName}."),
      line("VAL ORTIZ", "Welcome to the Selene Mission Preparation Facility."),
      line("VAL ORTIZ", "Dr. Chen is expecting you in the briefing room."),
      line(
        "VAL ORTIZ",
        "Just follow the blue floor markers. And don't worry — everyone looks a little nervous on launch day.",
      ),
    ],
  },
  RECEPTION_REPEAT: {
    id: "RECEPTION_REPEAT",
    lines: [line("VAL ORTIZ", "The briefing room is just ahead. Good luck, {playerName}.")],
  },
  RECEPTION_SUITED: {
    id: "RECEPTION_SUITED",
    lines: [line("VAL ORTIZ", "Looking ready for the mission! Safe travels, {playerName}.")],
  },
  MISSION_BRIEFING: {
    id: "MISSION_BRIEFING",
    lines: [
      line("DR. MAYA CHEN", "{playerName}. Glad you're here."),
      line("DR. MAYA CHEN", "Today marks the beginning of the Selene expedition."),
      line(
        "DR. MAYA CHEN",
        "Our destination is the Moon's south polar region — one of the most fascinating environments in lunar exploration.",
      ),
      line(
        "DR. MAYA CHEN",
        "Some areas near the lunar poles remain in permanent shadow. These regions may preserve water ice.",
      ),
      line("DR. MAYA CHEN", "But remember: our job is to investigate the evidence, not assume what we'll find."),
      line(
        "DR. MAYA CHEN",
        "Every decision matters. Equipment, energy, communication, and preparation can determine what a mission is able to accomplish.",
      ),
      line("DR. MAYA CHEN", "Your communications unit is already linked. Engineer Voss paired it before you arrived."),
      line("DR. MAYA CHEN", "When you're ready, report to Suit Preparation. Technician Brooks will complete your final equipment checks."),
      line("{playerName}", "Understood, Doctor. I'll head to Suit Preparation."),
      line("DR. MAYA CHEN", "Excellent. We'll be counting on you."),
    ],
  },
  CHEN_BEFORE_RADIO: {
    id: "CHEN_BEFORE_RADIO",
    lines: [line("DR. MAYA CHEN", "Technician Brooks is ready for you in Suit Preparation whenever you are.")],
  },
  CHEN_AFTER_SUIT: {
    id: "CHEN_AFTER_SUIT",
    lines: [line("DR. MAYA CHEN", "Your preparations are nearly complete. Trust your training, {playerName}.")],
  },
  SCIENCE_SPECIALIST: {
    id: "SCIENCE_SPECIALIST",
    lines: [
      line("DR. SAMIR PATEL", "Have you had a good look at the lunar south pole yet?"),
      line(
        "DR. SAMIR PATEL",
        "It's a remarkable place. The lighting conditions are unlike those in many regions closer to the lunar equator.",
      ),
      line(
        "DR. SAMIR PATEL",
        "Some crater interiors remain in shadow, while nearby terrain can experience very different illumination conditions.",
      ),
      line("DR. SAMIR PATEL", "That matters for everything from solar power to route planning."),
      line(
        "DR. SAMIR PATEL",
        "Exploring those environments could help scientists learn more about lunar resources and history.",
      ),
      line("DR. SAMIR PATEL", "The important thing is to keep asking questions — and let the evidence guide the answers."),
    ],
  },
  SCIENCE_REPEAT: {
    id: "SCIENCE_REPEAT",
    lines: [line("DR. SAMIR PATEL", "The Moon is full of unanswered questions. That's what makes exploration worthwhile.")],
  },
  COMMUNICATIONS_BRIEFING: {
    id: "COMMUNICATIONS_BRIEFING",
    lines: [
      line("LEO VOSS", "There you are, {playerName}. I was starting to think you'd taken a wrong turn."),
      line("LEO VOSS", "I'm Leo, communications engineering."),
      line("LEO VOSS", "That unit on your wrist? I paired it before you arrived."),
      line(
        "LEO VOSS",
        "It's a compact wrist module. You'll be able to use it here, and it'll pair with your suit's communication system later.",
      ),
      line("LEO VOSS", "You can receive instructions, status updates, and messages from the rest of the crew."),
      line(
        "LEO VOSS",
        "Of course, communications are never something we take for granted. Terrain and equipment limitations can make things complicated.",
      ),
      line("LEO VOSS", "Signal looks good from here. You're connected to Mission Control."),
      line("{playerName}", "Thanks, Leo."),
    ],
  },
  LEO_BEFORE_PICKUP: {
    id: "LEO_BEFORE_PICKUP",
    lines: [line("LEO VOSS", "Your communications unit is right there on the illuminated tray.")],
  },
  LEO_AFTER: {
    id: "LEO_AFTER",
    lines: [line("LEO VOSS", "Signal looks good. Your unit will synchronize with your spacesuit during preparation.")],
  },
  SUIT_PREPARATION_BRIEFING: {
    id: "SUIT_PREPARATION_BRIEFING",
    lines: [
      line("NIA BROOKS", "Welcome to Suit Preparation, {playerName}."),
      line("NIA BROOKS", "I'm Nia. I'll be handling your final equipment checks."),
      line("NIA BROOKS", "Your spacesuit has been configured for the mission, but we still need to complete the readiness sequence."),
      line("NIA BROOKS", "Your communications unit will pair with the suit once it's equipped."),
      line("NIA BROOKS", "Step into the preparation station and activate the equipment interface."),
      line("NIA BROOKS", "Don't worry. We'll keep this part straightforward."),
      line("{playerName}", "Sounds good. Let's get started."),
    ],
  },
  NIA_WAITING: {
    id: "NIA_WAITING",
    lines: [line("NIA BROOKS", "The preparation station is ready whenever you are.")],
  },
  NIA_REPEAT: {
    id: "NIA_REPEAT",
    lines: [
      line("NIA BROOKS", "All checks are complete. You're ready for the next stage, {playerName}."),
      line("NIA BROOKS", "Your crewmate should be waiting near the departure corridor."),
    ],
  },
  CREWMATE_MEETING: {
    id: "CREWMATE_MEETING",
    lines: [
      line("RILEY MORGAN", "Hey! {playerName}, right?"),
      line("RILEY MORGAN", "I'm Riley. Looks like we'll be sharing a spacecraft."),
      line("{playerName}", "Good to finally meet you."),
      line("RILEY MORGAN", "Likewise. How's the suit?"),
      line("{playerName}", "Still getting used to it."),
      line("RILEY MORGAN", "Same here. I think the engineers designed these things to make walking through doorways interesting."),
      line("RILEY MORGAN", "Anyway, Mission Control says we're almost ready for boarding."),
      line("RILEY MORGAN", "I'll head toward the hatch. Follow me when you're ready."),
      line("{playerName}", "Lead the way."),
      line("RILEY MORGAN", "That's the spirit. Let's go."),
    ],
  },
  CREWMATE_MEETING_EARLY: {
    id: "CREWMATE_MEETING_EARLY",
    lines: [
      line("RILEY MORGAN", "Hey! {playerName}, right?"),
      line("RILEY MORGAN", "I'm Riley. Looks like we'll be sharing a spacecraft."),
      line("{playerName}", "Good to finally meet you."),
      line("RILEY MORGAN", "Likewise. Don't forget your suit. Technician Brooks has it ready."),
      line("RILEY MORGAN", "I'll head toward the hatch. Meet me there when you're ready."),
      line("{playerName}", "See you there."),
    ],
  },
  RILEY_WALKING: {
    id: "RILEY_WALKING",
    lines: [line("RILEY MORGAN", "I'll meet you at the hatch. Follow the corridor.")],
  },
  RILEY_AT_HATCH: {
    id: "RILEY_AT_HATCH",
    lines: [
      line("RILEY MORGAN", "There it is. The spacecraft is ready for us."),
      line("RILEY MORGAN", "Whenever you're ready, head to the boarding hatch."),
    ],
  },
  COMMS_CONFIRM: {
    id: "COMMS_CONFIRM",
    lines: [line("{playerName}", "Mission Control, communications are clear. Standing by for final instructions.")],
  },
  RILEY_ABOARD: {
    id: "RILEY_ABOARD",
    lines: [line("RILEY MORGAN", "We're aboard. I'll take the right seat after communications are verified.")],
  },
  RILEY_STANDBY: {
    id: "RILEY_STANDBY",
    lines: [line("RILEY MORGAN", "Standing by. We wait for launch authorization.")],
  },
  FINAL_BOARDING: {
    id: "FINAL_BOARDING",
    lines: [
      line("RILEY MORGAN", "Well, this is it."),
      line("RILEY MORGAN", "We've spent years preparing for this moment."),
      line("{playerName}", "And now?"),
      line("RILEY MORGAN", "Now we find out if we're ready."),
      line("{playerName}", "Let's make it count."),
      line("RILEY MORGAN", "Together."),
    ],
  },
};

export function fillName(text: string, playerName: string): string {
  return text.replaceAll("{playerName}", playerName);
}

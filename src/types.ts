export type Dir = "up" | "down" | "left" | "right";

export type Phase =
  | "NEED_BRIEFING"
  | "NEED_COMMUNICATIONS_BRIEFING"
  | "NEED_RADIO_PICKUP"
  | "NEED_SUIT_TECHNICIAN"
  | "NEED_SUIT_EQUIPPING"
  | "NEED_CREWMATE_MEETING"
  | "NEED_BOARDING"
  | "CHAPTER_COMPLETE";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Look =
  | "player"
  | "val"
  | "chen"
  | "patel"
  | "leo"
  | "nia"
  | "riley"
  | "crew"
  | "crew2";

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface DialogueScript {
  id: string;
  lines: DialogueLine[];
}

import type { Door } from '../content/world';
import type { Rect } from '../types';
export const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
export function actorFootprint(a: {x: number; y: number}): Rect { return {x:a.x-14,y:a.y-12,w:28,h:18}; }
/** Shared geometry for rendering and collision. Panels retract into existing jambs. */
export function doorPanels(d: Door, openness: number): Rect[] {
  const h = d.axis === 'h';
  const length = (h ? d.w : d.h) * 0.5 * (1-openness);
  if (length < 0.01) return [];
  return h ? [{x:d.x,y:d.y,w:length,h:d.h},{x:d.x+d.w-length,y:d.y,w:length,h:d.h}]
    : [{x:d.x,y:d.y,w:d.w,h:length},{x:d.x,y:d.y+d.h-length,w:d.w,h:length}];
}
export class AutomaticDoor {
  openness = 0;
  private hold = 0;
  constructor(readonly definition: Door) {}
  update(dt: number, occupants: Rect[]): void {
    const d = this.definition;
    const sensor = {x:d.x-120,y:d.y-120,w:d.w+240,h:d.h+240};
    const occupied = occupants.some(body => overlaps(sensor,body));
    this.hold = occupied ? 0.65 : Math.max(0,this.hold-dt);
    const opening = occupied || this.hold > 0;
    const next = Math.max(0,Math.min(1,this.openness + dt/(opening ? 0.42 : 0.65)*(opening ? 1 : -1)));
    if (next < this.openness && doorPanels(d,next).some(panel => occupants.some(body => overlaps(panel,body)))) return;
    this.openness = next;
  }
  blocks(body: Rect): boolean { return doorPanels(this.definition,this.openness).some(panel => overlaps(panel,body)); }
}

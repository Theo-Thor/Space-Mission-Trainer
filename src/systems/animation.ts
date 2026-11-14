export interface Motion { x: number; y: number; walking: boolean; walkPhase: number; gait?: number; lean?: number }
/** Distance-driven gait, with a 90 ms visual settling envelope. */
export class CharacterAnimator {
  private previous = new WeakMap<Motion, {x: number; y: number}>();
  track(actor: Motion): void { this.previous.set(actor, {x: actor.x, y: actor.y}); }
  update(actor: Motion, dt: number): void {
    const prev = this.previous.get(actor) ?? actor;
    const dx = actor.x - prev.x;
    const distance = Math.hypot(dx, actor.y - prev.y);
    actor.walking = distance > 0.001 && distance <= 240 * dt + 1;
    if (actor.walking) actor.walkPhase = (actor.walkPhase + distance * Math.PI * 2 / 112) % (Math.PI * 2);
    const blend = 1 - Math.exp(-dt / 0.09);
    actor.gait = (actor.gait ?? 0) + ((actor.walking ? 1 : 0) - (actor.gait ?? 0)) * blend;
    actor.lean = (actor.lean ?? 0) + ((actor.walking ? dx / Math.max(distance, 1) * 0.045 : 0) - (actor.lean ?? 0)) * blend;
    this.track(actor);
  }
}

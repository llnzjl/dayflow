import type { Itinerary } from "../types";
import { compute, stripDerived, type Ctx } from "./compute";
import { fmt } from "../time";

export interface ReplanResult { itin: Itinerary; messages: string[]; preserved: { reservations: boolean; budget: boolean }; applied: string[]; ok: boolean }
/**
 * User is `delayMin` late leaving stop `currentIndex`. Shift the rest of the day,
 * shorten flexible stops (down to minDuration), then drop optional stops, then switch to taxi, to protect reservations.
 */
export async function replan(it: Itinerary, currentIndex: number, delayMin: number, ctx: Ctx): Promise<ReplanResult> {
  const messages: string[] = [], applied: string[] = [];
  const base = stripDerived(it);
  const cur = base.items[currentIndex];
  if (cur) { cur.duration = cur.duration + delayMin; cur.minDuration = Math.min(cur.minDuration, cur.duration); }
  let next = await compute(base, ctx);
  const late = () => next.stops.findIndex((s) => s.lateBy > 0);
  let guard = 0;
  // 1) shorten flexible stops that come after the current one but before the first at-risk reservation
  while (late() >= 0 && guard++ < 30) {
    const li = late(); let changed = false;
    for (let i = currentIndex; i < li; i++) {
      const item = base.items[i]; const room = item.duration - item.minDuration;
      if (room > 0 && !(i === currentIndex && false)) { const cut = Math.min(room, 15, next.stops[li].lateBy + 5); item.duration -= cut; applied.push(`Shortened ${item.place.name} by ${cut} min`); changed = true; break; }
    }
    if (!changed) {
      // 2) drop an optional stop (not reserved, not current) before the at-risk stop
      const drop = base.items.map((x, i) => ({ x, i })).filter(({ x, i }) => i > currentIndex && i < li && !x.reserved && x.place.category !== "restaurant").sort((a, b) => b.x.duration - a.x.duration)[0];
      if (drop) { base.items.splice(drop.i, 1); applied.push(`Skipped ${drop.x.place.name}`); changed = true; }
    }
    if (!changed && base.transport !== "taxi") { base.transport = "taxi"; applied.push("Switched remaining transfers to taxi"); changed = true; }
    if (!changed) break;
    next = await compute(base, ctx);
  }
  const ok = late() < 0;
  const resKept = next.stops.filter((s) => s.reserved).every((s) => s.lateBy === 0);
  const budgetKept = next.budgetState.over <= it.budgetState.over;
  if (!applied.length && ok) messages.push(`You're ${delayMin} min behind, but your plan still works. No changes needed.`);
  else if (ok) messages.push(`You're ${delayMin} min behind. I adjusted the day so you still make every reservation.`);
  else messages.push(`You're ${delayMin} min behind and I couldn't fully protect every reservation. Consider rescheduling the booking.`);
  if (next.stops.some((s) => s.reserved) && resKept) messages.push("✓ Reservations preserved");
  if (budgetKept) messages.push("✓ Budget preserved"); else messages.push("⚠ Taxi switch increased the cost");
  return { itin: next, messages, preserved: { reservations: resKept, budget: budgetKept }, applied, ok };
}
export const describe = (it: Itinerary) => it.stops.map((s) => `${fmt(s.arrive)} ${s.place.name}`).join(" → ");

import type { Itinerary, Place } from "../types";
import { compute, stripDerived, mkItem, type Ctx } from "./compute";
import { dietaryOK } from "../diet";
import { openOK } from "../time";

export interface Change { from: string; to: string; saving: number }
/** Replace the priciest stops with cheaper, diet-compatible, open alternatives of the same category; recompute everything after each swap. */
export async function optimizeBudget(it: Itinerary, ctx: Ctx, candidates: Place[], force = false) {
  let cur = it; const changes: Change[] = []; const skip = new Set<string>();
  for (let i = 0; i < 6; i++) {
    if (!force && cur.budgetState.over <= 0) break;
    const order = cur.stops.filter((s) => s.place.priceMax > 0 && !s.reserved && !skip.has(s.uid)).sort((a, b) => b.cost - a.cost);
    let swapped = false;
    for (const s of order) {
      const used = new Set(cur.stops.map((x) => x.place.id));
      const alt = candidates.filter((p) => p.category === s.place.category && !used.has(p.id) && dietaryOK(p, ctx.diet)
        && openOK(p.open, p.close, s.arrive, p.stay) && p.priceMax * cur.party < s.cost && (!cur.area || p.area === cur.area || true))
        .sort((a, b) => b.priceMax - a.priceMax)[0]; // best quality that is still cheaper
      if (!alt) { skip.add(s.uid); continue; }
      const base = stripDerived(cur); const idx = base.items.findIndex((x) => x.uid === s.uid);
      base.items[idx] = { ...mkItem(alt), uid: s.uid };
      const next = await compute(base, ctx);
      if (next.totals.total < cur.totals.total) { changes.push({ from: s.place.name, to: alt.name, saving: cur.totals.total - next.totals.total }); cur = next; swapped = true; break; }
      skip.add(s.uid);
    }
    if (!swapped) break;
  }
  return { itin: cur, changes };
}

/** Last resort when swaps are not enough: drop the priciest optional stops (never meals/meetup/prayer/reserved) until within budget. */
export async function trimToBudget(it: Itinerary, ctx: Ctx, minStops = 4) {
  let cur = it; const dropped: string[] = [];
  while (cur.budgetState.over > 0 && cur.stops.length > minStops) {
    const v = cur.stops.filter((s) => !s.reserved && ["activity", "shop", "museum", "night", "cafe", "park"].includes(s.place.category) && s.cost > 0).sort((a, b) => b.cost - a.cost)[0];
    if (!v) break;
    const base = stripDerived(cur); base.items = base.items.filter((x) => x.uid !== v.uid); dropped.push(v.place.name); cur = await compute(base, ctx);
  }
  return { itin: cur, dropped };
}

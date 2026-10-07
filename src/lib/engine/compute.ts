import type { Check, Diet, Itinerary, ItinInput, Leg, Mode, PlanItem, RouteOption, Stop, Weather } from "../types";
import type { TransitProvider } from "../providers/types";
import { bufferFor, haversineKm, openOK, fmt } from "../time";
import { budgetState, perPerson, sum } from "../money";
import { dietaryOK } from "../diet";

export interface Ctx { transit: TransitProvider; diet: Diet; weather?: Weather | null }

const optCost = (o: RouteOption, party: number) => {
  const base = o.perPerson ? o.fare * party : o.fare;
  const max = o.fareMax ? (o.perPerson ? o.fareMax * party : o.fareMax) : base;
  return { cost: Math.round((base + max) / 2), max };
};
export const optTotal = (o: RouteOption) => o.walkMin + o.rideMin + o.transferMin;

export function chooseOption(opts: RouteOption[], inp: Pick<ItinInput, "transport" | "lessWalking">, force?: Mode): RouteOption {
  if (force) { const f = opts.find((o) => o.mode === force); if (f) return f; }
  const by = (xs: RouteOption[]) => xs.sort((a, b) => optTotal(a) - optTotal(b))[0];
  const taxi = opts.find((o) => o.mode === "taxi")!;
  if (inp.transport === "taxi" || inp.transport === "car") return taxi;
  const walk = opts.find((o) => o.mode === "walk");
  if (inp.transport === "walk" && walk) return walk;
  let pool = opts.filter((o) => o.mode !== "taxi");
  if (inp.lessWalking) pool = pool.filter((o) => o.walkMin <= 12);
  if (!pool.length) return taxi;
  const best = by(pool);
  // very long public routes are worse than a taxi for "less walking"
  if (inp.lessWalking && optTotal(best) > optTotal(taxi) * 2.2) return taxi;
  return best;
}

export async function compute(inp: ItinInput, ctx: Ctx): Promise<Itinerary> {
  const stops: Stop[] = []; const gaps: Itinerary["gaps"] = [];
  let km = 0; let prev: Stop | undefined;
  for (const it of inp.items) {
    let arrive = inp.startTime, leg: Leg | undefined, lateBy = 0;
    if (prev) {
      const d = haversineKm(prev.place, it.place);
      const opts = await ctx.transit.getOptions(prev.place, it.place, prev.leave);
      const ch = chooseOption(opts, inp, it.routeMode);
      const move = optTotal(ch), buffer = bufferFor(inp.pace, ch.walkMin), expected = prev.leave + move;
      const c = optCost(ch, inp.party);
      arrive = expected + buffer; let slack = buffer;
      if (it.reservedAt != null) { arrive = it.reservedAt >= expected ? it.reservedAt : expected; slack = it.reservedAt - expected; lateBy = Math.max(0, -slack); }
      const wait = arrive - (expected + buffer);
      if (wait >= 45) gaps.push({ afterIndex: stops.length - 1, minutes: wait, from: prev.leave + move + buffer, to: arrive });
      km += d;
      leg = { mode: ch.mode, walkMin: ch.walkMin, rideMin: ch.rideMin, transferMin: ch.transferMin, bufferMin: buffer, moveMin: move,
        departAt: prev.leave, expectedArrival: expected, slack, cost: c.cost, costMax: c.max,
        alternatives: opts.map((o) => { const k = optCost(o, inp.party); return { mode: o.mode, totalMin: optTotal(o), cost: k.cost, costMax: o.fareMax ? k.max : undefined, walkMin: o.walkMin }; }),
        live: ch.live, liveNote: ch.live ? "Live" : "Live ETA unavailable — estimate based on the normal route", source: ch.source, distanceKm: Math.round(d * 10) / 10 } as Leg;
    } else if (it.reservedAt != null) arrive = Math.max(arrive, it.reservedAt);
    const p = it.place; let cost: number, basis: Stop["costBasis"], range: [number, number] | undefined;
    if (it.userPrice != null) { cost = it.userPrice; basis = "user"; }
    else if (p.priceMax === 0) { cost = 0; basis = "free"; }
    else if (p.priceMin !== p.priceMax) { cost = Math.round(((p.priceMin + p.priceMax) / 2) * inp.party); basis = "range"; range = [p.priceMin * inp.party, p.priceMax * inp.party]; }
    else { cost = p.priceMin * inp.party; basis = "estimated"; }
    const warnings: string[] = [];
    if (!openOK(p.open, p.close, arrive, it.duration)) warnings.push(`Not open for the whole visit (${p.open}–${p.close})`);
    if (!dietaryOK(p, ctx.diet)) warnings.push("Does not satisfy dietary preferences");
    if (lateBy > 0) warnings.push(`You would arrive ${lateBy} min after the reservation`);
    else if (leg && leg.slack < 5) warnings.push("Tight transfer");
    const rainy = ctx.weather?.hours.some((h) => h.precip >= 50 && h.h * 60 < arrive + it.duration && (h.h + 1) * 60 > arrive);
    if (rainy && !p.indoor) warnings.push("Rain expected during this outdoor stop");
    const s: Stop = { uid: it.uid, place: p, arrive, leave: arrive + it.duration, duration: it.duration, cost, costBasis: basis, costRange: range, leg,
      reserved: !!it.reserved, reservedAt: it.reservedAt, lateBy, warnings, item: it };
    stops.push(s); prev = s;
  }
  const last = stops[stops.length - 1];
  if (last && inp.endTime - last.leave >= 90) gaps.push({ afterIndex: stops.length - 1, minutes: inp.endTime - last.leave, from: last.leave, to: inp.endTime });

  const cat = (c: string[]) => sum(stops.filter((s) => c.includes(s.place.category)).map((s) => s.cost));
  const transport = sum(stops.map((s) => s.leg?.cost ?? 0));
  const food = cat(["restaurant", "cafe", "market"]), activities = cat(["activity", "museum", "night", "park"]), shopping = cat(["shop"]), other = cat(["meetup", "prayer"]);
  const total = food + transport + activities + shopping + other;
  const bs = budgetState(inp.budget, total);

  const checks: Check[] = []; let score = 100;
  const late = stops.filter((s) => s.lateBy > 0), tight = stops.filter((s) => !s.lateBy && s.leg && s.leg.slack < 5);
  const closed = stops.filter((s) => s.warnings.some((w) => w.startsWith("Not open"))), diet = stops.filter((s) => s.warnings.some((w) => w.startsWith("Does not")));
  const rain = stops.filter((s) => s.warnings.some((w) => w.startsWith("Rain")));
  score -= late.length * 25 + Math.min(tight.length, 3) * 6 + closed.length * 15 + diet.length * 25 + rain.length * 8 + (bs.over > 0 ? 15 : 0);
  score = Math.max(0, Math.min(100, score));
  checks.push(late.length ? { key: "res", label: `${late.length} reservation(s) at risk`, status: "fail" } : stops.some((s) => s.reserved) ? { key: "res", label: "Reservations safe", status: "ok" } : { key: "res", label: "No reservations booked yet (planned only)", status: "warn" });
  checks.push(tight.length ? { key: "buf", label: `${tight.length} tight transfer(s)`, status: "warn" } : { key: "buf", label: "Good travel buffers", status: "ok" });
  checks.push(bs.over > 0 ? { key: "bud", label: `₩${bs.over.toLocaleString()} over budget`, status: "fail" } : { key: "bud", label: inp.budget ? "Budget healthy" : "No budget set", status: "ok" });
  checks.push(diet.length ? { key: "diet", label: "Dietary requirement not met", status: "fail" } : { key: "diet", label: "Dietary requirements satisfied", status: "ok" });
  checks.push(closed.length ? { key: "open", label: "A stop may be closed", status: "fail" } : { key: "open", label: "All stops open", status: "ok" });
  if (ctx.weather) checks.push(rain.length ? { key: "wx", label: "Rain affects an outdoor stop", status: "warn" } : { key: "wx", label: "Weather OK for the plan", status: "ok" });
  const state = late.length || closed.length || diet.length || score < 60 ? "red" : score >= 85 && !tight.length ? "green" : score >= 70 ? (tight.length ? "yellow" : "green") : "yellow";
  const avgMove = stops.length > 1 ? sum(stops.map((s) => s.leg?.moveMin ?? 0)) / (stops.length - 1) : 0;
  const romTags = sum(stops.map((s) => s.place.tags.filter((t) => ["romantic", "scenic", "sunset"].includes(t)).length));
  const stars = {
    romance: Math.max(1, Math.min(5, 2 + romTags)),
    travel: avgMove <= 15 ? 5 : avgMove <= 22 ? 4 : avgMove <= 30 ? 3 : avgMove <= 40 ? 2 : 1,
    budget: inp.budget == null ? 4 : bs.over > 0 ? 1 : bs.remaining! / inp.budget >= 0.15 ? 5 : bs.remaining! / inp.budget >= 0.05 ? 4 : 3,
    schedule: Math.max(1, Math.round(score / 20)),
  };
  return { ...inp, stops, totals: { food, transport, activities, shopping, other, total, perPerson: perPerson(total, inp.party) }, budgetState: bs,
    health: { score, state, checks, stars }, gaps,
    stats: { totalMin: last ? last.leave - inp.startTime : 0, km: Math.round(km * 10) / 10, avgBuffer: stops.length > 1 ? Math.round(sum(stops.map((s) => s.leg?.bufferMin ?? 0)) / (stops.length - 1)) : 0 } };
}
export const stripDerived = (i: Itinerary): ItinInput => { const { stops, totals, budgetState, health, gaps, stats, role, ownerName, live, updatedAt, ...rest } = i; void stops; void totals; void budgetState; void health; void gaps; void stats; void role; void ownerName; void live; void updatedAt; return rest; };
export const uid = () => Math.random().toString(36).slice(2, 10);
export const mkItem = (place: PlanItem["place"], duration?: number): PlanItem => ({ uid: uid(), place, duration: duration ?? place.stay, minDuration: Math.max(15, Math.round((duration ?? place.stay) * 0.6)) });
export { fmt };

import type { Itinerary } from "../types";
import { fmt } from "../time";
export interface Notice { key: string; kind: "leave" | "reservation" | "tight" | "rain"; title: string; body: string }
/** Pure + deduplicated by key: each notice fires at most once per stop. Only useful alerts. */
export function buildNotifications(it: Itinerary, now: number): Notice[] {
  const out: Notice[] = [];
  for (const s of it.stops) {
    if (s.leg) {
      const inMin = s.leg.departAt - now;
      if (inMin >= 0 && inMin <= 15) out.push({ key: `leave:${it.id}:${s.uid}`, kind: "leave", title: `Leave in ${Math.max(1, Math.round(inMin))} minutes`, body: `Head to ${s.place.name} (${s.leg.mode}, ${s.leg.moveMin} min). Expected arrival ${fmt(s.leg.expectedArrival)}.` });
      if (inMin >= -5 && inMin <= 30 && !s.lateBy && s.leg.slack < 5) out.push({ key: `tight:${it.id}:${s.uid}`, kind: "tight", title: "Your schedule is getting tight", body: `Only ${Math.max(0, s.leg.slack)} min of slack before ${s.place.name}.` });
    }
    if (s.reserved && s.reservedAt != null) { const d = s.reservedAt - now; if (d > 0 && d <= 30) out.push({ key: `res:${it.id}:${s.uid}`, kind: "reservation", title: `Reservation in ${d} minutes`, body: `${s.place.name} at ${fmt(s.reservedAt)}${s.item.reservationCode ? ` (code ${s.item.reservationCode})` : ""}.` }); }
    if (s.warnings.some((w) => w.startsWith("Rain")) && s.arrive - now <= 90 && s.leave > now) out.push({ key: `rain:${it.id}:${s.uid}`, kind: "rain", title: "Rain expected during an outdoor stop", body: `${s.place.name} may be affected. Consider an indoor alternative.` });
  }
  return out;
}

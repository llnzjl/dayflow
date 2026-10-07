import type { Itinerary } from "../types";
import type { TransitProvider } from "../providers/types";
import { optTotal } from "./compute";

export interface DelayReport { stopUid: string; place: string; mode: string; plannedMin: number; liveMin: number; delayMin: number; slackAfter: number; wouldBeLate: boolean; severity: "none" | "minor" | "tight" | "late"; source: string }
export type MonitorResult = { live: false; message: string } | { live: true; report: DelayReport | null };
const DELAY_THRESHOLD = 5; // minutes; smaller changes are noise and never notified

/**
 * Re-queries the transit provider for the NEXT leg. Only options flagged live:true count — estimates are never reported as delays.
 * Compares the live trip time to what the plan assumed and recomputes remaining slack / reservation risk.
 */
export async function checkNextLeg(it: Itinerary, now: number, transit: TransitProvider): Promise<MonitorResult> {
  const idx = it.stops.findIndex((s) => s.leg && s.leg.departAt + s.leg.moveMin > now && s.leg.departAt - 30 <= now);
  if (idx < 0) return { live: false, message: "No upcoming transfer to check right now." };
  const s = it.stops[idx], prev = it.stops[idx - 1], leg = s.leg!;
  let opts; try { opts = await transit.getOptions(prev.place, s.place, Math.max(now, leg.departAt)); } catch { return { live: false, message: "Live transit information is temporarily unavailable. Estimates are based on the normal route." }; }
  const o = opts.find((x) => x.mode === leg.mode && x.live);
  if (!o) return { live: false, message: "Live ETA unavailable — using the normal-route estimate." };
  const liveMin = optTotal(o), delay = liveMin - leg.moveMin;
  const startAt = Math.max(now, leg.departAt); const eta = startAt + liveMin; // if leaving now (or on time)
  const limit = s.reservedAt ?? s.arrive; const slackAfter = limit - eta - (s.reservedAt != null ? 0 : 0);
  const wouldBeLate = s.reservedAt != null ? eta > s.reservedAt : false;
  const severity = delay < DELAY_THRESHOLD ? "none" : wouldBeLate ? "late" : slackAfter < 5 ? "tight" : "minor";
  return { live: true, report: { stopUid: s.uid, place: s.place.name, mode: leg.mode, plannedMin: leg.moveMin, liveMin, delayMin: delay, slackAfter, wouldBeLate, severity, source: o.source } };
}
export const delayNotice = (r: DelayReport) => ({
  key: `delay:${r.stopUid}:${Math.floor(r.delayMin / 5)}`, kind: "delay" as const,
  title: r.severity === "late" ? "⚠️ You may arrive late" : `Your ${r.mode} is delayed by ${r.delayMin} min`,
  body: r.severity === "late" ? `${r.place}: new ETA is after your reservation. Open the plan to replan.` : `${r.place}: ${r.plannedMin} → ${r.liveMin} min. ${r.severity === "tight" ? "Your schedule is getting tight." : "You're still okay."}`,
});

import { getDb, id } from "@/lib/db";
import { buildCtx, json } from "@/lib/server";
import { isRes, need } from "@/lib/http";
import { getPlan, getState, roleFor } from "@/lib/repo";
import { compute, stripDerived } from "@/lib/engine/compute";
import { checkNextLeg, delayNotice } from "@/lib/engine/delay";

/** POST {itineraryId, now}: live-delay check for the next transfer. Honest when no live provider: returns live:false. */
export async function POST(req: Request) {
  const u = need(req); if (isRes(u)) return u; const b = await req.json();
  const row = getPlan(b.itineraryId); if (!row || !roleFor(row, u)) return json({ error: "Not found" }, 404);
  const plan = JSON.parse(row.json); const ctx = await buildCtx(plan.date, getState(row.owner_id).profile?.diet);
  const it = await compute(stripDerived(plan), ctx); const r = await checkNextLeg(it, Number(b.now), ctx.transit);
  if (!r.live || !r.report) return json(r);
  const db = getDb(); db.prepare("INSERT INTO transport_snapshots (itinerary_id, stop_uid, planned_min, live_min, delay_min, source, at) VALUES (?,?,?,?,?,?,?)").run(plan.id, r.report.stopUid, r.report.plannedMin, r.report.liveMin, r.report.delayMin, r.report.source, Date.now());
  if (r.report.severity !== "none" && getState(u.id).profile?.notifications !== false) { const n = delayNotice(r.report); db.prepare("INSERT OR IGNORE INTO notifications (id,user_id,key,kind,title,body,created_at) VALUES (?,?,?,?,?,?,?)").run(id(), u.id, n.key, n.kind, n.title, n.body, Date.now()); }
  return json(r);
}

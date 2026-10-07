import { getDb, id } from "@/lib/db";
import { buildCtx, json } from "@/lib/server";
import { isRes, need } from "@/lib/http";
import { canEdit, getPlan, ownerDiet, roleFor, savePlan } from "@/lib/repo";
import { compute, stripDerived } from "@/lib/engine/compute";

/** action: slots | book | cancel. Availability comes from the ReservationProvider only; never invented. */
export async function POST(req: Request) {
  const u = need(req); if (isRes(u)) return u; const b = await req.json();
  const row = getPlan(b.itineraryId); if (!row || !canEdit(roleFor(row, u))) return json({ error: "Not allowed" }, 403);
  const plan = JSON.parse(row.json); const item = plan.items.find((i: any) => i.uid === b.stopUid); if (!item) return json({ error: "Stop not found" }, 404);
  const ctx = await buildCtx(plan.date, ownerDiet(row.owner_id)); const rp = ctx.providers.reservations;
  if (b.action === "slots") { const s = await rp.slots(item.place, plan.date).catch(() => null);
    return json({ slots: s, provider: rp.name, demo: rp.demo, message: s ? undefined : "Reservations aren't available for this place through DateFlow. You can still mark it as booked yourself." }); }
  if (b.action === "book") {
    const r = await rp.book(item.place, plan.date, b.time, plan.party, u.name).catch(() => null);
    if (!r) return json({ error: "That time is no longer available." }, 409);
    const [h, m] = String(b.time).split(":").map(Number); item.reserved = true; item.reservedAt = h * 60 + m; item.reservationCode = r.code; item.reservationDemo = rp.demo;
    getDb().prepare("INSERT INTO reservations VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(id(), plan.id, item.uid, item.place.id, plan.date, b.time, plan.party, "reserved", rp.name, r.code, rp.demo ? 1 : 0, Date.now());
  } else if (b.action === "cancel") {
    item.reserved = false; item.reservedAt = undefined; item.reservationCode = undefined; item.reservationDemo = undefined;
    getDb().prepare("UPDATE reservations SET status='cancelled' WHERE itinerary_id=? AND stop_uid=?").run(plan.id, item.uid);
  } else return json({ error: "Unknown action" }, 400);
  const out = await compute(stripDerived(plan), ctx); savePlan(row.owner_id, out);
  return json({ itinerary: { ...out, role: roleFor(row, u), updatedAt: Date.now() } });
}

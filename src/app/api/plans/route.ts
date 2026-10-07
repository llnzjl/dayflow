import { getDb } from "@/lib/db";
import { buildCtx, json } from "@/lib/server";
import { isRes, need } from "@/lib/http";
import { canEdit, getPlan, listPlans, ownerDiet, roleFor, savePlan, verifiedPlace } from "@/lib/repo";
import { compute, stripDerived } from "@/lib/engine/compute";

export async function GET(req: Request) { const u = need(req); if (isRes(u)) return u; return json({ plans: listPlans(u) }); }
export async function PUT(req: Request) {
  const u = need(req); if (isRes(u)) return u;
  const { itinerary } = await req.json(); if (!itinerary?.id || !Array.isArray(itinerary.items)) return json({ error: "Invalid itinerary" }, 400);
  const row = getPlan(itinerary.id); const role = row ? roleFor(row, u) : "owner";
  if (!canEdit(role)) return json({ error: "You don't have permission to edit this plan." }, 403);
  const ownerId = row ? row.owner_id : u.id;
  const inp = stripDerived(itinerary);
  if (role !== "owner" && row) inp.status = JSON.parse(row.json).status; // only the owner starts/finishes a day
  const ctx = await buildCtx(inp.date, ownerDiet(ownerId));
  // Place validation: every stop must be a place our providers returned; details are re-read from the verified record.
  for (const it of inp.items) { const v = verifiedPlace(it.place.id); if (!v) return json({ error: `"${it.place.name}" is not a verified place and was rejected.` }, 422); it.place = v; }
  const out = await compute(inp, ctx); savePlan(ownerId, out);
  return json({ itinerary: { ...out, role, updatedAt: Date.now() } });
}
export async function DELETE(req: Request) {
  const u = need(req); if (isRes(u)) return u; const pid = new URL(req.url).searchParams.get("id") || "";
  const row = getPlan(pid); if (!row) return json({ ok: true });
  if (row.owner_id !== u.id) return json({ error: "Only the owner can delete a plan." }, 403);
  getDb().prepare("DELETE FROM itineraries WHERE id=?").run(pid); return json({ ok: true });
}

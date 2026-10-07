import { getDb } from "@/lib/db";
import { isRes, json, need } from "@/lib/http";
import { getPlan } from "@/lib/repo";
/** Owner publishes ONLY: schedule state, current/next stop names and an ETA time. Never coordinates. Visible only to people with ETA sharing enabled. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = need(req); if (isRes(u)) return u; const p = getPlan(params.id); if (!p || p.owner_id !== u.id) return json({ error: "Only the owner can publish live status." }, 403);
  const b = await req.json(); const live = { updatedAt: Date.now(), state: ["green", "yellow", "red"].includes(b.state) ? b.state : "green", current: String(b.current || "").slice(0, 80) || undefined, next: String(b.next || "").slice(0, 80) || undefined, etaMin: Number.isFinite(b.etaMin) ? b.etaMin : undefined };
  getDb().prepare("UPDATE itineraries SET live_json=? WHERE id=?").run(JSON.stringify(live), params.id); return json({ ok: true });
}

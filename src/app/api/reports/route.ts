import { getDb, id } from "@/lib/db";
import { isRes, json, need } from "@/lib/http";
import { verifiedPlace } from "@/lib/repo";
const TYPES = ["halal", "vegan", "price", "hours", "closed", "other"];
export async function POST(req: Request) {
  const u = need(req); if (isRes(u)) return u; const b = await req.json(); const p = verifiedPlace(String(b.placeId));
  if (!p) return json({ error: "Unknown place." }, 404); if (!TYPES.includes(b.type)) return json({ error: "Invalid report type." }, 400);
  const db = getDb(); if (db.prepare("SELECT 1 FROM reports WHERE user_id=? AND place_id=? AND type=? AND status='open'").get(u.id, p.id, b.type)) return json({ error: "You already have an open report for this." }, 409);
  db.prepare("INSERT INTO reports (id,user_id,place_id,place_name,type,note,created_at) VALUES (?,?,?,?,?,?,?)").run(id(), u.id, p.id, p.name, b.type, String(b.note || "").slice(0, 500), Date.now());
  return json({ ok: true });
}
export async function GET(req: Request) {
  const u = need(req); if (isRes(u)) return u; if (!u.isAdmin) return json({ error: "Admins only." }, 403);
  const st = new URL(req.url).searchParams.get("status") || "open";
  return json({ reports: getDb().prepare("SELECT r.*, (SELECT halal FROM place_overrides o WHERE o.place_id=r.place_id) as override FROM reports r WHERE status=? ORDER BY created_at DESC LIMIT 200").all(st) });
}
/** Admin: resolve/dismiss; optionally override a place's halal status (e.g. downgrade to "unverified"). */
export async function PATCH(req: Request) {
  const u = need(req); if (isRes(u)) return u; if (!u.isAdmin) return json({ error: "Admins only." }, 403); const b = await req.json(); const db = getDb();
  const r = db.prepare("SELECT * FROM reports WHERE id=?").get(b.id) as any; if (!r) return json({ error: "Not found" }, 404);
  if (b.halalOverride) { if (!["halal_verified", "halal_friendly", "muslim_friendly", "user_reported", "unverified"].includes(b.halalOverride)) return json({ error: "Invalid status" }, 400);
    db.prepare("INSERT INTO place_overrides VALUES (?,?,?,?) ON CONFLICT(place_id) DO UPDATE SET halal=excluded.halal, note=excluded.note, updated_at=excluded.updated_at").run(r.place_id, b.halalOverride, String(b.resolution || ""), Date.now()); }
  db.prepare("UPDATE reports SET status=?, resolution=? WHERE id=?").run(b.status === "dismissed" ? "dismissed" : "resolved", String(b.resolution || ""), b.id); return json({ ok: true });
}

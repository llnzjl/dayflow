import { getDb } from "@/lib/db";
import { isRes, json, need } from "@/lib/http";
import { canManage, getPlan, roleFor } from "@/lib/repo";

const ROLES = ["viewer", "editor", "organizer"];
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const u = need(req); if (isRes(u)) return u; const p = getPlan(params.id); if (!p || !canManage(roleFor(p, u))) return json({ error: "Not allowed" }, 403);
  return json({ shares: getDb().prepare("SELECT email, role, eta_sharing as etaSharing FROM shares WHERE itinerary_id=?").all(params.id) });
}
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = need(req); if (isRes(u)) return u; const p = getPlan(params.id); if (!p || !canManage(roleFor(p, u))) return json({ error: "Only the owner or an organizer can share." }, 403);
  const b = await req.json(); const email = String(b.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Enter a valid email." }, 400); if (email === u.email) return json({ error: "That's you." }, 400);
  if (!ROLES.includes(b.role)) return json({ error: "Invalid role." }, 400);
  if (b.role === "organizer" && p.owner_id !== u.id) return json({ error: "Only the owner can add organizers." }, 403);
  getDb().prepare("INSERT INTO shares VALUES (?,?,?,?,?) ON CONFLICT(itinerary_id,email) DO UPDATE SET role=excluded.role, eta_sharing=excluded.eta_sharing").run(params.id, email, b.role, b.etaSharing ? 1 : 0, Date.now());
  return json({ ok: true });
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const u = need(req); if (isRes(u)) return u; const p = getPlan(params.id); if (!p) return json({ ok: true });
  const email = (new URL(req.url).searchParams.get("email") || u.email).toLowerCase();
  if (email !== u.email && !canManage(roleFor(p, u))) return json({ error: "Not allowed" }, 403); // anyone may leave; managers may remove others
  getDb().prepare("DELETE FROM shares WHERE itinerary_id=? AND email=?").run(params.id, email); return json({ ok: true });
}

import { getDb, id } from "@/lib/db";
import { json } from "@/lib/server";
import { isRes, need } from "@/lib/http";
import { getPlan, getState, roleFor } from "@/lib/repo";
import { buildNotifications } from "@/lib/engine/notify";
import { buildCtx } from "@/lib/server";
import { compute, stripDerived } from "@/lib/engine/compute";

export async function GET(req: Request) {
  const u = need(req); if (isRes(u)) return u;
  return json({ notifications: getDb().prepare("SELECT id, kind, title, body, created_at as createdAt, read FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50").all(u.id) });
}
/** POST {itineraryId, now}: evaluate the plan at `now` and store NEW notices only (dedup by key). Respects the user's notification setting. */
export async function POST(req: Request) {
  const u = need(req); if (isRes(u)) return u; const b = await req.json();
  if (getState(u.id).profile?.notifications === false) return json({ created: [] });
  const row = getPlan(b.itineraryId); if (!row || !roleFor(row, u)) return json({ created: [] });
  const plan = JSON.parse(row.json); const ctx = await buildCtx(plan.date, getState(row.owner_id).profile?.diet);
  const it = await compute(stripDerived(plan), ctx); const created: any[] = [];
  const ins = getDb().prepare("INSERT OR IGNORE INTO notifications (id,user_id,key,kind,title,body,created_at) VALUES (?,?,?,?,?,?,?)");
  for (const n of buildNotifications(it, Number(b.now))) { if (ins.run(id(), u.id, n.key, n.kind, n.title, n.body, Date.now()).changes) created.push(n); }
  return json({ created });
}
export async function PATCH(req: Request) {
  const u = need(req); if (isRes(u)) return u; getDb().prepare("UPDATE notifications SET read=1 WHERE user_id=?").run(u.id); return json({ ok: true });
}

import { getDb } from "@/lib/db";
import { getProviders } from "@/lib/providers";
import { isRes, json, need } from "@/lib/http";
export async function GET(req: Request) {
  const u = need(req); if (isRes(u)) return u; if (!u.isAdmin) return json({ error: "Admins only." }, 403);
  const db = getDb(); const n = (q: string) => (db.prepare(q).get() as any).c as number; const p = getProviders(); const since = Date.now() - 30 * 864e5;
  return json({ users: n("SELECT COUNT(*) c FROM users"), plans: n("SELECT COUNT(*) c FROM itineraries"), shares: n("SELECT COUNT(*) c FROM shares"), openReports: n("SELECT COUNT(*) c FROM reports WHERE status='open'"),
    reservations: n("SELECT COUNT(*) c FROM reservations WHERE status='reserved'"), aiActions30d: n(`SELECT COUNT(*) c FROM ai_actions WHERE at>${since}`),
    events30d: db.prepare("SELECT name, COUNT(*) c FROM events WHERE at>? GROUP BY name ORDER BY c DESC").all(since),
    overrides: db.prepare("SELECT place_id, halal, note FROM place_overrides").all(),
    providers: { map: p.map.name, places: p.places.name + (p.places.demo ? " (demo)" : ""), transit: p.transit.name, weather: p.weather.name, prayer: p.prayer.name, reservations: p.reservations.name } });
}

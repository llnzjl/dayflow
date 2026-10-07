import { getState, setState } from "@/lib/repo";
import { isRes, json, need } from "@/lib/http";
export async function GET(req: Request) { const u = need(req); if (isRes(u)) return u; return json(getState(u.id)); }
export async function PUT(req: Request) {
  const u = need(req); if (isRes(u)) return u; const b = await req.json();
  setState(u.id, { profile: b.profile ?? null, history: (b.history ?? []).slice(-500), savedPlaces: (b.savedPlaces ?? []).slice(0, 200), feedback: b.feedback ?? {}, memories: (b.memories ?? []).slice(-100), onboarded: !!b.onboarded });
  return json({ ok: true });
}

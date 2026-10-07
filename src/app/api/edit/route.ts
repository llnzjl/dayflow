import { buildCtx, json } from "@/lib/server";
import { isRes, need } from "@/lib/http";
import { logAction } from "@/lib/repo";
import { editItinerary } from "@/lib/engine/edit";
import { compute, stripDerived } from "@/lib/engine/compute";
export async function POST(req: Request) {
  try {
    const user = need(req); if (isRes(user)) return user;
    const { itinerary, profile, command } = await req.json();
    const ctx = await buildCtx(itinerary.date, profile.diet, itinerary.city);
    const it = await compute(stripDerived(itinerary), ctx);
    const r = await editItinerary(it, command, ctx, ctx.candidates);
    logAction(user.id, "edit", command, r.reply);
    return json({ itinerary: r.itin, reply: r.reply, changed: r.changed });
  } catch (e: any) { return json({ error: e.message }, 500); }
}

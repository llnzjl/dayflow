import { buildCtx, json } from "@/lib/server";
import { replan } from "@/lib/engine/replan";
import { compute, stripDerived } from "@/lib/engine/compute";
export async function POST(req: Request) {
  try {
    const { itinerary, profile, currentIndex, delayMin } = await req.json();
    const ctx = await buildCtx(itinerary.date, profile.diet, itinerary.city);
    const it = await compute(stripDerived(itinerary), ctx);
    // taxi alternative preview for the running-late screen
    const r = await replan(it, currentIndex, delayMin, ctx);
    return json({ itinerary: r.itin, messages: r.messages, applied: r.applied, ok: r.ok, preserved: r.preserved });
  } catch (e: any) { return json({ error: e.message }, 500); }
}

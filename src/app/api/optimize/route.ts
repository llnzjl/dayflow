import { buildCtx, json } from "@/lib/server";
import { optimizeBudget } from "@/lib/engine/optimize";
import { compute, stripDerived } from "@/lib/engine/compute";
export async function POST(req: Request) {
  try {
    const { itinerary, profile } = await req.json();
    const ctx = await buildCtx(itinerary.date, profile.diet);
    const it = await compute(stripDerived(itinerary), ctx);
    const r = await optimizeBudget(it, ctx, ctx.candidates, true);
    return json({ itinerary: r.itin, changes: r.changes });
  } catch (e: any) { return json({ error: e.message }, 500); }
}

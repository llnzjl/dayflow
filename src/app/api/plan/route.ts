import { buildCtx, json } from "@/lib/server";
import { isRes, need } from "@/lib/http";
import { listPlans, logAction } from "@/lib/repo";
import { extractIntent, intentToRequest } from "@/lib/engine/intent";
import { generate } from "@/lib/engine/generate";
import { optimizeBudget, trimToBudget } from "@/lib/engine/optimize";
import { won } from "@/lib/money";
import type { Profile } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = need(req); if (isRes(user)) return user;
    const { text = "", profile, overrides = {}, history = [] } = (await req.json()) as { text: string; profile: Profile; overrides: any; history: string[] };
    const intent = await extractIntent(text || "surprise me");
    const diet = { ...profile.diet, muslim: profile.diet.muslim || !!intent.halal, vegan: profile.diet.vegan || !!intent.vegan, vegetarian: profile.diet.vegetarian || !!intent.vegetarian };
    const pr = { ...profile, diet };
    const r = intentToRequest(intent, pr, { ...overrides, history });

    // 2-week cooldown (14 days): places selected within 14 days cannot be selected again
    const plannedDateMs = new Date(r.date).getTime();
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    const cooldownSet = new Set<string>();

    try {
      const existingPlans = listPlans(user);
      for (const p of existingPlans) {
        const pDateMs = new Date(p.date).getTime();
        if (!isNaN(pDateMs) && Math.abs(plannedDateMs - pDateMs) <= twoWeeksMs) {
          for (const st of p.stops ?? []) {
            if (st.place?.id && st.place?.category !== "meetup") {
              cooldownSet.add(st.place.id);
            }
          }
        }
      }
    } catch {}

    for (const hid of history ?? []) cooldownSet.add(hid);
    if (Array.isArray(overrides.recentPlaceIds)) {
      for (const rid of overrides.recentPlaceIds) cooldownSet.add(rid);
    }
    r.cooldownPlaceIds = Array.from(cooldownSet);
    if (overrides.seed !== undefined) r.seed = overrides.seed;

    if (!text.trim() && !overrides.vibes?.length) r.surprise = true;
    const targetCity = r.city || overrides.city || intent.city || "seoul";
    r.city = targetCity;
    const ctx = await buildCtx(r.date, diet, targetCity);
    r.prayer = ctx.prayer;
    let { itin, notes } = await generate(r, ctx);
    let opt = "";
    if (itin.budgetState.over > 0) { const o = await optimizeBudget(itin, ctx, ctx.candidates); if (o.changes.length) { itin = o.itin; opt = ` I swapped ${o.changes.length} stop(s) to save ${won(o.changes.reduce((a, c) => a + c.saving, 0))}.`; } }
    if (itin.budgetState.over > 0) { const t = await trimToBudget(itin, ctx); if (t.dropped.length) { itin = t.itin; opt += ` I also dropped ${t.dropped.join(", ")} to fit the budget.`; } }
    const { getCityById, getCityByArea } = await import("@/lib/providers/demo-data");
    const cityOpt = getCityById(r.city || (r.area ? getCityByArea(r.area).id : "seoul"));
    const assumptions = [
      `Date ${r.date}`,
      `City: ${cityOpt.name}`,
      r.meetingPoint ? `Meet at: ${r.meetingPoint}` : null,
      r.endPoint ? `End at: ${r.endPoint}` : null,
      `${r.party} people`,
      r.budget ? `Budget ${won(r.budget)} total` : "No budget",
      r.area ? `Area ${r.area}` : null,
      diet.muslim ? "Halal filter on" : diet.vegan ? "Vegan filter on" : null
    ].filter(Boolean);
    const stops = itin.stops.length;
    const reply = stops < 2 ? "I couldn't verify enough open places that match your requirements. Try widening the area, time window or budget."
      : `I put together a ${r.pace} ${r.vibes[0] ?? ""} day with ${stops} stops and enough time between each, total ${won(itin.totals.total)}${itin.budgetState.limit ? (itin.budgetState.over ? ` (${won(itin.budgetState.over)} over budget)` : `, within your ${won(itin.budgetState.limit)} budget`) : ""}.${opt}`;
    logAction(user.id, "plan", text, reply);
    return json({ itinerary: itin, reply, notes, assumptions, demo: ctx.providers.places.demo, weather: ctx.weather, prayer: ctx.prayer });
  } catch (e: any) { return json({ error: e.message || "Planning failed" }, 500); }
}

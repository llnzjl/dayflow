import type { Category, Itinerary, Place } from "../types";
import { compute, mkItem, stripDerived, type Ctx } from "./compute";
import { dietaryOK } from "../diet";
import { openOK } from "../time";
import { optimizeBudget } from "./optimize";
import { won } from "../money";

const WORDS: Record<string, Category[]> = { halal: ["restaurant"], restaurant: ["restaurant"], dinner: ["restaurant"], lunch: ["restaurant"], cafe: ["cafe"], coffee: ["cafe"], shopping: ["shop"], shop: ["shop"], museum: ["museum"], park: ["park"], activity: ["activity"], prayer: ["prayer"], night: ["night"], exciting: ["night", "activity"], market: ["market"] };

/** Conversational editing: text -> structured actions -> recompute + validate. Returns a reply built from real numbers. */
export async function editItinerary(it: Itinerary, text: string, ctx: Ctx, candidates: Place[]): Promise<{ itin: Itinerary; reply: string; changed: boolean }> {
  const t = text.toLowerCase(); let base = stripDerived(it); const used = new Set(it.stops.map((s) => s.place.id));
  const done = async (reply: string) => ({ itin: await compute(base, ctx), reply, changed: true });
  const ok = (p: Place, at: number) => dietaryOK(p, ctx.diet) && openOK(p.open, p.close, at, p.stay);

  if (/cheap|budget|save|afford|비싸|저렴/.test(t)) {
    const r = await optimizeBudget(it, ctx, candidates, true);
    if (!r.changes.length) return { itin: it, changed: false, reply: "I couldn't find cheaper options that keep your dietary needs and opening hours intact." };
    return { itin: r.itin, changed: true, reply: `Saved ${won(it.totals.total - r.itin.totals.total)}: ${r.changes.map((c) => `${c.from} → ${c.to}`).join(", ")}.` };
  }
  if (/less walking|tired|rest|걷기/.test(t)) { base.lessWalking = true; if (/tired/.test(t)) base.pace = "relaxed"; return done("Done — I'm avoiding long walks and re-checked every transfer."); }
  if (/wake up|late start|not.*early|too early|늦게/.test(t)) { base.startTime += 90; base.endTime = Math.max(base.endTime, base.startTime + 6 * 60); return done("Pushed the start 90 minutes later and re-validated opening hours."); }
  const rm = t.match(/(?:remove|delete|skip|drop|빼)\s+(?:the\s+)?(.+)/);
  if (rm) {
    const q = rm[1].trim(); const i = it.stops.findIndex((s) => (s.place.name + " " + s.place.category + " " + s.place.tags.join(" ")).toLowerCase().includes(q.replace(/s$/, "")));
    if (i < 0) return { itin: it, changed: false, reply: `I couldn't find "${q}" in this plan.` };
    base.items.splice(i, 1); return done(`Removed ${it.stops[i].place.name} and recalculated the route and cost.`);
  }
  const area = t.match(/(?:around|near|in|stay)\s+(hongdae|gangnam|itaewon|seongsu|jongno|yeouido)/);
  if (area) {
    base.area = area[1]; let n = 0;
    for (let i = 0; i < base.items.length; i++) { const s = it.stops[i]; if (s.place.area === area[1] || s.place.category === "meetup") continue; const alt = candidates.filter((p) => p.category === s.place.category && p.area === area[1] && !used.has(p.id) && ok(p, s.arrive)).sort((a, b) => a.priceMax - b.priceMax)[0]; if (alt) { base.items[i] = { ...mkItem(alt), uid: s.uid }; used.add(alt.id); n++; } }
    return n ? done(`Moved ${n} stop(s) to ${area[1]}. Stops with no verified match nearby were kept.`) : { itin: it, changed: false, reply: `I couldn't verify matching places in ${area[1]}.` };
  }
  if (/romantic|more romance/.test(t)) {
    let n = 0;
    for (let i = 0; i < base.items.length && n < 2; i++) { const s = it.stops[i]; if (s.place.tags.includes("romantic") || s.place.category === "meetup") continue; const alt = candidates.filter((p) => p.category === s.place.category && p.tags.includes("romantic") && !used.has(p.id) && ok(p, s.arrive)).sort((a, b) => b.tags.length - a.tags.length)[0]; if (alt) { base.items[i] = { ...mkItem(alt), uid: s.uid }; used.add(alt.id); n++; } }
    base.vibes = [...new Set([...base.vibes, "romantic"])];
    return n ? done(`Swapped ${n} stop(s) for more romantic ones, keeping times realistic.`) : { itin: it, changed: false, reply: "It already uses the most romantic verified options I have for these slots." };
  }
  const add = /add|include|more|exciting|shopping|추가/.test(t) && Object.keys(WORDS).find((w) => t.includes(w));
  if (add) {
    const cats = WORDS[add]; const diet = /halal/.test(t) ? { ...ctx.diet, muslim: true } : ctx.diet;
    const lastEnd = it.stops.length ? it.stops[it.stops.length - 1].leave + 25 : it.startTime;
    const alt = candidates.filter((p) => cats.includes(p.category) && !used.has(p.id) && dietaryOK(p, diet) && openOK(p.open, p.close, lastEnd, p.stay)).sort((a, b) => b.tags.length - a.tags.length)[0];
    if (!alt) return { itin: it, changed: false, reply: `I couldn't verify a matching ${add} that's open at that time.` };
    const lastMeal = base.items.map((x) => x.place.category).lastIndexOf("restaurant");
    const pos = cats.includes("restaurant") || lastMeal < 0 ? base.items.length : lastMeal;
    base.items.splice(pos, 0, mkItem(alt)); return done(`Added ${alt.name}. Times, route and budget are updated.`);
  }
  return { itin: it, changed: false, reply: "I didn't catch an edit I can apply safely. Try: “cheaper”, “less walking”, “remove the museum”, “add a halal restaurant”, “more romantic”, “stay around Hongdae”." };
}

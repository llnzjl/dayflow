import { buildCtx, json } from "@/lib/server";
import { dietaryOK } from "@/lib/diet";
import { ruleIntent } from "@/lib/engine/intent";
import { getDb } from "@/lib/db";
import { haversineKm } from "@/lib/time";
export async function GET(req: Request) {
  const u = new URL(req.url); const q = u.searchParams.get("q") || ""; const cat = u.searchParams.get("category") || undefined;
  const city = u.searchParams.get("city") || "";
  const halal = u.searchParams.get("halal") === "1", vegan = u.searchParams.get("vegan") === "1", veg = u.searchParams.get("vegetarian") === "1";
  const free = u.searchParams.get("free") === "1"; const maxPrice = Number(u.searchParams.get("maxPrice") || 0);
  const page = Number(u.searchParams.get("page") || 0), size = 12;
  const i = ruleIntent(q);
  const targetCity = city || i.city;
  const ctx = await buildCtx(new Date().toISOString().slice(0, 10), undefined, targetCity);
  const { getCityById } = await import("@/lib/providers/demo-data");
  const cityOpt = getCityById(targetCity);
  let candidates = ctx.candidates;

  const isCafeQuery = /caf[fe]|caffe|coffee|커피|카페/i.test(q) || cat === "cafe";
  if (targetCity && (isCafeQuery || q.length >= 3)) {
    try {
      const { searchAiPlaces } = await import("@/lib/engine/ai-places");
      const aiPlaces = await searchAiPlaces(q || "cafe", cityOpt, cat, ctx.diet);
      if (aiPlaces.length > 0) {
        candidates = [...aiPlaces, ...candidates];
      }
    } catch {}
  }

  let r = candidates.filter((p) => !cat || p.category === cat);
  const diet = { ...ctx.diet, muslim: halal || !!i.halal, vegan: vegan || !!i.vegan, vegetarian: veg || !!i.vegetarian };
  r = r.filter((p) => dietaryOK(p, diet) && (!diet.muslim || p.category === "prayer" || p.category === "cafe" || p.halal !== "unverified" || !["restaurant", "market"].includes(p.category)));
  if (i.area) r = r.filter((p) => p.area === i.area);
  if (free) r = r.filter((p) => p.priceMax === 0);
  const cap = maxPrice || i.budget || 0; if (cap) r = r.filter((p) => p.priceMax <= cap);
  const words = q.toLowerCase().replace(/[₩\d,]+/g, "").split(/\s+/).filter((w) => w.length > 2 && !["near", "under", "for", "two", "the", "and", "halal", "vegan", "cheap", "romantic", "quiet"].includes(w));
  const catWord = ["cafe", "restaurant", "museum", "park", "shop"].find((c) => q.toLowerCase().includes(c)) || (isCafeQuery ? "cafe" : undefined);
  if (catWord && !cat) r = r.filter((p) => p.category === catWord);
  if (/prayer|mosque/.test(q.toLowerCase())) r = candidates.filter((p) => p.category === "prayer");
  const textual = words.filter((w) => !["cafe", "caffe", "coffee", "restaurant", "dinner", "lunch", "prayer", "room", "mosque", "hongdae", "gangnam", "seongsu", "itaewon", "steakhouse", "place", "places", "cheongju", "suwon", "busan", "seoul", "incheon", "daegu", "daejeon", "jeonju", "jeju"].includes(w));
  if (textual.length) { const m = r.filter((p) => textual.some((w) => (p.name + p.nameKo + p.tags.join(" ")).toLowerCase().includes(w))); if (m.length) r = m; }
  const from = cityOpt.center;
  const rep = new Map((getDb().prepare("SELECT place_id, COUNT(*) c FROM reports WHERE status='open' GROUP BY place_id").all() as any[]).map((x) => [x.place_id, x.c]));
  const out = r.map((p) => ({ ...p, openReports: rep.get(p.id) ?? 0, distanceKm: Math.round(haversineKm(from, p) * 10) / 10 })).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return json({ places: out.slice(page * size, page * size + size), total: out.length, demo: ctx.providers.places.demo, source: ctx.providers.places.name });
}

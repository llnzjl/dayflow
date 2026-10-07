import type { Category, Diet, Itinerary, ItinInput, Place, PlanItem, PrayerTimes, Profile, Weather } from "../types";
import { compute, mkItem, uid, type Ctx } from "./compute";
import { dietaryOK, isFood } from "../diet";
import { haversineKm, openOK, toMin } from "../time";
import { getCityByArea, getCityById } from "../providers/demo-data";

export interface PlanRequest {
  date: string; startTime: number; endTime: number; party: number; budget: number | null;
  vibes: string[]; interests: string[]; area?: string; city?: string; meetingPoint?: string; endPoint?: string;
  surprise?: boolean; lessWalking: boolean;
  pace: ItinInput["pace"]; transport: ItinInput["transport"]; title?: string;
  history: string[]; dislikedPlaceIds?: string[]; prayerAware?: boolean; prayer?: PrayerTimes | null;
  seed?: number;
  cooldownPlaceIds?: string[];
}
export interface GenCtx extends Ctx { candidates: Place[]; weather?: Weather | null }

const rainyAt = (w: Weather | null | undefined, t: number) => !!w?.hours.some((h) => h.precip >= 50 && h.h * 60 <= t + 60 && (h.h + 1) * 60 > t);

export function scorePlace(p: Place, req: Pick<PlanRequest, "interests" | "vibes" | "history" | "surprise" | "area" | "city" | "cooldownPlaceIds">, prev?: Place, seed = 0, diet?: Diet) {
  let s = 0;
  for (const t of p.tags) { if (req.interests.includes(t)) s += 10; if (req.vibes.map((v) => v.toLowerCase()).includes(t)) s += 6; }
  if (req.vibes.includes("romantic") && p.tags.includes("romantic")) s += 6;
  if (req.vibes.includes("budget")) s -= (p.priceMax / 3000);
  if (req.area && p.area === req.area) s += 14;
  if (req.city) {
    const cityOpt = getCityById(req.city);
    if (cityOpt.areas.includes(p.area) || p.address.toLowerCase().includes(cityOpt.name.toLowerCase()) || haversineKm(cityOpt.center, p) <= 45) {
      s += 45;
    } else {
      s -= 150;
    }
  }
  if (diet?.muslim) {
    if (p.halal === "halal_verified") s += 30;
    else if (p.halal === "halal_friendly" || p.halal === "muslim_friendly") s += 22;
  }
  if (prev) s -= haversineKm(prev, p) * 2.2;
  if (req.history.includes(p.id) || req.cooldownPlaceIds?.includes(p.id)) s -= 120;
  if (p.rating) s += (p.rating - 4) * 4;

  const idHash = p.id.split("").reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 3), 0);
  const randomJitter = (Math.sin(seed * 7919 + idHash * 31) + 1) * 8.5;
  s += randomJitter;
  return s;
}

export function pick(cands: Place[], cat: Category[], t: number, used: Set<string>, req: PlanRequest, ctx: GenCtx, prev?: Place, seed = 0, maxPrice = Infinity) {
  let pool = cands.filter((p) => cat.includes(p.category) && !used.has(p.id) && !req.dislikedPlaceIds?.includes(p.id) && dietaryOK(p, ctx.diet)
    && openOK(p.open, p.close, t, p.stay) && (!rainyAt(ctx.weather, t) || p.indoor) && p.priceMax <= maxPrice && (!req.area || true));

  if (req.city) {
    const cityOpt = getCityById(req.city);
    pool = pool.filter((p) =>
      cityOpt.areas.includes(p.area) ||
      p.address.toLowerCase().includes(cityOpt.name.toLowerCase()) ||
      p.area.toLowerCase().includes(cityOpt.id.toLowerCase()) ||
      haversineKm(cityOpt.center, p) <= 45
    );
  }

  // 2-week cooldown enforcement: exclude places selected within the last 14 days
  if (req.cooldownPlaceIds?.length) {
    const cdSet = new Set(req.cooldownPlaceIds);
    const freshPool = pool.filter((p) => !cdSet.has(p.id));
    if (freshPool.length > 0) {
      pool = freshPool;
    } else if (maxPrice < Infinity) {
      return undefined;
    }
  }

  if (!pool.length) return undefined;

  const sorted = pool.sort((a, b) => scorePlace(b, req, prev, seed, ctx.diet) - scorePlace(a, req, prev, seed, ctx.diet));
  const topScore = scorePlace(sorted[0], req, prev, seed, ctx.diet);
  const topTier = sorted.filter((p) => topScore - scorePlace(p, req, prev, seed, ctx.diet) <= 12).slice(0, 3);
  const pickIndex = Math.abs(Math.floor((Math.sin(seed * 49157 + t * 997 + cat[0].length * 17) + 1) * 50)) % topTier.length;

  return topTier[pickIndex] ?? sorted[0];
}

/** Time-driven slot planner: decides *what kind* of stop is needed; actual places come only from the provider's candidates. */
export async function generate(req: PlanRequest, ctx: GenCtx): Promise<{ itin: Itinerary; notes: string[] }> {
  const notes: string[] = []; const used = new Set<string>(); const items: PlanItem[] = [];
  const seed = req.seed ?? (req.surprise ? Date.now() % 1000 : (Math.floor(Math.random() * 100000) + (Date.now() % 997)));
  const cityOpt = getCityById(req.city || (req.area ? getCityByArea(req.area).id : "seoul"));
  const cityName = cityOpt.name;

  let candidates = ctx.candidates ?? [];
  if (req.city) {
    const inCityPlaces = candidates.filter((p) =>
      (cityOpt.areas.length > 0 && cityOpt.areas.includes(p.area)) ||
      p.address.toLowerCase().includes(cityOpt.name.toLowerCase()) ||
      p.area.toLowerCase().includes(cityOpt.id.toLowerCase()) ||
      haversineKm(cityOpt.center, p) <= 45
    );

    if (inCityPlaces.length < 8) {
      try {
        const { getAiCityRecommendations } = await import("./ai-places");
        const aiPlaces = await getAiCityRecommendations(cityOpt, req.vibes, ctx.diet);
        if (aiPlaces.length > 0) inCityPlaces.push(...aiPlaces);
      } catch {}

      const { getCandidatesForCity } = await import("../providers/demo-data");
      const cityCandidates = getCandidatesForCity(cityOpt.id);
      inCityPlaces.push(...cityCandidates);
    }
    candidates = inCityPlaces;
  }

  let t = req.startTime, prev: Place | undefined, lunch = false, dinner = false, cafes = 0, n = 0;
  const add = (p: Place | undefined) => { if (!p) return false; used.add(p.id); items.push(mkItem(p)); prev = p; t += p.stay + 22; n++; return true; };

  // 1. Meeting location (Where do you want to meet?)
  let meetPlace: Place | undefined;
  if (req.meetingPoint) {
    const mp = req.meetingPoint.toLowerCase();
    meetPlace = candidates.find((p) => p.category === "meetup" && (p.name.toLowerCase().includes(mp) || p.nameKo.toLowerCase().includes(mp) || p.id.toLowerCase().includes(mp)));
    if (!meetPlace) {
      meetPlace = candidates.find((p) => p.name.toLowerCase().includes(mp) || p.nameKo.toLowerCase().includes(mp));
    }
    if (!meetPlace) {
      meetPlace = {
        id: `meet-custom-${Math.random().toString(36).slice(2, 7)}`,
        name: req.meetingPoint,
        nameKo: req.meetingPoint,
        category: "meetup",
        area: cityOpt.areas[0] || "custom",
        lat: cityOpt.center.lat,
        lng: cityOpt.center.lng,
        address: `${req.meetingPoint}, ${cityName} (meeting location)`,
        priceMin: 0,
        priceMax: 0,
        stay: 15,
        open: "00:00",
        close: "23:59",
        indoor: true,
        tags: ["meetup", "start"],
        halal: "unverified",
        vegan: "none",
        alcohol: false,
        accessible: true,
        rating: 5,
        source: "Meeting location",
        updated: "user",
      };
    }
  } else if (req.party >= 2) {
    meetPlace = candidates.find((p) => p.category === "meetup" && (cityOpt.areas.includes(p.area) || haversineKm(cityOpt.center, p) <= 45) && openOK(p.open, p.close, t, 15))
      || candidates.find((p) => p.category === "meetup" && openOK(p.open, p.close, t, 15));
  }
  if (meetPlace) {
    used.add(meetPlace.id);
    items.push(mkItem(meetPlace, 15));
    prev = meetPlace;
    t += 15 + 20;
  }

  const pp = req.budget ? req.budget / req.party : Infinity;
  while (t < req.endTime - 60 && n < 8) {
    let want: Category[];
    if (!lunch && t >= 11 * 60 && t <= 14 * 60) { want = ["restaurant"]; lunch = true; }
    else if (!dinner && t >= 17 * 60 + 15) { want = ["restaurant"]; dinner = true; }
    else if (t < 11 * 60 && cafes === 0) { want = ["cafe"]; cafes++; }
    else if (t >= 19 * 60 + 30) want = ["night", "activity"];
    else if (t >= 14 * 60 && t < 17 * 60) want = cafes < 2 && n % 2 === 0 ? ["cafe", "shop"] : ["park", "activity", "museum", "shop"];
    else want = ["activity", "park", "museum", "shop"];
    const cap = want[0] === "restaurant" ? pp * 0.3 : pp * 0.14;
    let p = pick(candidates, want, t, used, req, ctx, prev, seed + n, cap);
    if (!p) p = pick(candidates, want, t, used, req, ctx, prev, seed + n);
    if (!p) { if (want[0] === "restaurant") { notes.push(`I couldn't verify a ${ctx.diet.muslim ? "halal " : ""}meal option open at ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}.`); } t += 45; continue; }
    if (p.category === "cafe") cafes++;
    add(p);
  }

  // 2. Ending location (Where would you want to end the date?)
  if (req.endPoint) {
    const ep = req.endPoint.toLowerCase();
    let endPlace = candidates.find((p) => !used.has(p.id) && (p.name.toLowerCase().includes(ep) || p.nameKo.toLowerCase().includes(ep) || p.id.toLowerCase().includes(ep)));
    if (!endPlace) {
      endPlace = {
        id: `end-custom-${Math.random().toString(36).slice(2, 7)}`,
        name: req.endPoint,
        nameKo: req.endPoint,
        category: "meetup",
        area: cityOpt.areas[0] || "custom",
        lat: prev ? prev.lat + 0.003 : cityOpt.center.lat,
        lng: prev ? prev.lng + 0.003 : cityOpt.center.lng,
        address: `${req.endPoint}, ${cityName} (ending location)`,
        priceMin: 0,
        priceMax: 0,
        stay: 20,
        open: "00:00",
        close: "23:59",
        indoor: true,
        tags: ["farewell", "end"],
        halal: "unverified",
        vegan: "none",
        alcohol: false,
        accessible: true,
        rating: 5,
        source: "Ending location",
        updated: "user",
      };
    }
    used.add(endPlace.id);
    items.push(mkItem(endPlace, endPlace.stay || 20));
  }

  const pre = (prayer: PrayerTimes | null | undefined) => prayer;
  let itin = await compute(toInput(req, items, cityName), ctx);
  // prayer-aware: insert a prayer stop after the stop that spans Dhuhr / Asr
  if (req.prayerAware && pre(req.prayer)) {
    for (const k of ["Dhuhr", "Asr"] as const) {
      const pt = toMin(req.prayer![k]);
      const idx = itin.stops.findIndex((s) => s.arrive <= pt + 15 && s.leave >= pt - 5);
      if (idx < 0 || itin.stops.some((s) => s.place.category === "prayer" && Math.abs(s.arrive - pt) < 90)) continue;
      const near = candidates.filter((p) => p.category === "prayer" && !used.has(p.id) && openOK(p.open, p.close, pt, 20))
        .sort((a, b) => haversineKm(itin.stops[idx].place, a) - haversineKm(itin.stops[idx].place, b))[0];
      if (!near) { notes.push(`I couldn't verify a prayer space near your ${k} time.`); continue; }
      used.add(near.id); items.splice(idx + 1, 0, mkItem(near, 20)); itin = await compute(toInput(req, items, cityName), ctx);
      notes.push(`Added a ${k} prayer stop at ${near.name}.`);
    }
  }
  return { itin, notes };
}

const toInput = (req: PlanRequest, items: PlanItem[], cityName = "Seoul"): ItinInput => {
  const defaultCityName = cityName || "Seoul";
  const defaultTitle = req.vibes[0] ? `${cap(req.vibes[0])} ${defaultCityName} day` : `${defaultCityName} day`;
  return {
    id: uid(),
    title: req.title || defaultTitle,
    date: req.date,
    startTime: req.startTime,
    endTime: req.endTime,
    party: req.party,
    budget: req.budget,
    pace: req.pace,
    transport: req.transport,
    lessWalking: req.lessWalking,
    vibes: req.vibes,
    area: req.area,
    city: req.city || defaultCityName.toLowerCase(),
    meetingPoint: req.meetingPoint,
    endPoint: req.endPoint,
    items,
    status: "upcoming"
  };
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
export const dietFrom = (p: Profile): Diet => p.diet;
export { isFood };

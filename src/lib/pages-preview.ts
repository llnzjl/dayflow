import { defaultProfile, type Store } from "./client";
import type { Itinerary, Profile } from "./types";
import { compute, stripDerived } from "./engine/compute";
import { generate } from "./engine/generate";
import { ruleIntent, intentToRequest } from "./engine/intent";
import { optimizeBudget, trimToBudget } from "./engine/optimize";
import { editItinerary } from "./engine/edit";
import { replan } from "./engine/replan";
import { getCandidatesForCity, getCityById } from "./providers/demo-data";
import { MockTransitProvider, MockWeatherProvider, MockPrayerProvider } from "./providers/mock";
import { dietaryOK } from "./diet";
import { haversineKm } from "./time";

const KEY = "dateflow:pages-preview:v1";
type Preview = Pick<Store, "profile" | "plans" | "history" | "savedPlaces" | "feedback" | "memories" | "onboarded"> & { session: boolean };
const empty = (): Preview => ({ session: false, profile: null, plans: [], history: [], savedPlaces: [], feedback: {}, memories: [], onboarded: false });
function read(): Preview {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return empty(); }
}
function write(state: Preview) { localStorage.setItem(KEY, JSON.stringify(state)); }
async function context(profile: Profile, date: string, city = "seoul") {
  return {
    diet: profile.diet, transit: new MockTransitProvider(), candidates: getCandidatesForCity(city),
    weather: await new MockWeatherProvider().get(getCityById(city).center, date),
    prayer: await new MockPrayerProvider().get(),
  };
}

/** A local-only adapter for the static Pages build. Never sends credentials or API requests. */
export async function previewApi(url: string, body?: unknown, method?: string): Promise<any> {
  const { pathname: path, searchParams: q } = new URL(url, "https://preview.invalid");
  const verb = method ?? (body === undefined ? "GET" : "POST");
  const b = (body ?? {}) as any;
  const state = read();
  if (path === "/api/auth/me") return { user: state.session && state.profile ? { name: state.profile.name, email: state.profile.email, isAdmin: false } : null };
  if (path === "/api/auth/preview") {
    state.session = true;
    state.profile ??= defaultProfile("Guest", "");
    write(state);
    return { ok: true };
  }
  if (path === "/api/auth/logout") { state.session = false; write(state); return { ok: true }; }
  if (path === "/api/auth/delete") { localStorage.removeItem(KEY); return { ok: true }; }
  if (!state.session || !state.profile) throw new Error("Open the browser preview to continue.");
  if (path === "/api/auth/export") return state;
  if (path === "/api/state") {
    if (verb === "PUT") {
      for (const key of ["profile", "history", "savedPlaces", "feedback", "memories", "onboarded"] as const) {
        if (key in b) (state as any)[key] = b[key];
      }
      write(state);
    }
    return state;
  }
  if (path === "/api/plans") {
    if (verb === "DELETE") { state.plans = state.plans.filter((p) => p.id !== q.get("id")); write(state); }
    if (verb === "PUT") {
      const input = b.itinerary ?? b;
      const plan = await compute(stripDerived(input), await context(state.profile, input.date, input.city));
      // Re-read after async work so simultaneous saves cannot overwrite each other.
      const latest = read();
      latest.plans = [plan, ...latest.plans.filter((p) => p.id !== plan.id)];
      write(latest);
      return { itinerary: plan };
    }
    return { plans: state.plans };
  }
  if (path === "/api/context") {
    const ctx = await context(state.profile, q.get("date") || "");
    return { weather: ctx.weather, prayer: ctx.prayer, providers: { demo: true } };
  }
  if (path === "/api/places") {
    const intent = ruleIntent(q.get("q") || "");
    const city = q.get("city") || intent.city || "seoul";
    const diet = { ...defaultProfile("", "").diet, muslim: q.get("halal") === "1" || !!intent.halal, vegan: q.get("vegan") === "1" || !!intent.vegan, vegetarian: !!intent.vegetarian };
    let places = getCandidatesForCity(city).filter((p) => dietaryOK(p, diet)
      && (!q.get("category") || p.category === q.get("category"))
      && (q.get("free") !== "1" || p.priceMax === 0));
    const query = (q.get("q") || "").trim().toLowerCase();
    if (query) {
      const matches = places.filter((p) => `${p.name} ${p.nameKo} ${p.category} ${p.area} ${p.tags.join(" ")}`.toLowerCase().includes(query));
      if (matches.length) places = matches;
    }
    const page = Math.max(0, Number(q.get("page")) || 0);
    return { places: places.slice(page * 12, page * 12 + 12).map((p) => ({ ...p, openReports: 0, distanceKm: Math.round(haversineKm(getCityById(city).center, p) * 10) / 10 })), total: places.length, demo: true, source: "Demo data" };
  }
  if (path === "/api/plan") {
    const intent = ruleIntent(b.text || "surprise me");
    const profile: Profile = b.profile ?? state.profile;
    const diet = { ...profile.diet, muslim: profile.diet.muslim || !!intent.halal, vegan: profile.diet.vegan || !!intent.vegan, vegetarian: profile.diet.vegetarian || !!intent.vegetarian };
    const request = intentToRequest(intent, { ...profile, diet }, { ...b.overrides, history: b.history ?? [] });
    request.cooldownPlaceIds = [...new Set<string>([...(b.overrides?.recentPlaceIds ?? []), ...(b.history ?? [])])];
    const ctx = await context({ ...profile, diet }, request.date, request.city);
    request.prayer = ctx.prayer;
    let { itin, notes } = await generate(request, ctx);
    if (itin.budgetState.over > 0) itin = (await optimizeBudget(itin, ctx, ctx.candidates)).itin;
    if (itin.budgetState.over > 0) itin = (await trimToBudget(itin, ctx)).itin;
    return { itinerary: itin, notes, demo: true, reply: `Created ${itin.stops.length} stops using demo places and estimated travel times.` };
  }
  if (["/api/recompute", "/api/edit", "/api/optimize", "/api/replan"].includes(path)) {
    const input = b.itinerary as Itinerary;
    const ctx = await context(b.profile ?? state.profile, input.date, input.city);
    const itinerary = await compute(stripDerived(input), ctx);
    if (path === "/api/edit") { const r = await editItinerary(itinerary, b.command, ctx, ctx.candidates); return { ...r, itinerary: r.itin }; }
    if (path === "/api/optimize") { const r = await optimizeBudget(itinerary, ctx, ctx.candidates); return { ...r, itinerary: r.itin }; }
    if (path === "/api/replan") { const r = await replan(itinerary, b.currentIndex, b.delayMin, ctx); return { ...r, itinerary: r.itin }; }
    return { itinerary };
  }
  if (path === "/api/reservations") return { slots: null, message: "Online reservations need the hosted app. You can still mark bookings made elsewhere." };
  if (path === "/api/notifications") return { notifications: [], created: [] };
  if (path === "/api/monitor") return { live: false };
  if (path === "/api/events" || path.endsWith("/eta")) return { ok: true };
  if (path.endsWith("/share") && verb === "GET") return { shares: [] };
  throw new Error("This feature needs the hosted app and is unavailable in the browser preview.");
}

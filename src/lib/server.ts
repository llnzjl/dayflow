import { getProviders } from "./providers";
import type { Diet, Itinerary, ItinInput, Profile, Weather } from "./types";
import { compute } from "./engine/compute";
import { applyOverrides, cachePlaces } from "./repo";
import { defaultDiet } from "./diet-default";
import type { GenCtx } from "./engine/generate";

import { getCityById, getCandidatesForCity } from "./providers/demo-data";

const cache = new Map<string, { at: number; v: any }>();
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const c = cache.get(key); if (c && Date.now() - c.at < ttlMs) return c.v;
  const v = await fn(); cache.set(key, { at: Date.now(), v }); return v;
}
export { defaultDiet };
export async function buildCtx(date: string, diet: Diet = defaultDiet, city?: string): Promise<GenCtx & { providers: ReturnType<typeof getProviders>; prayer: Awaited<ReturnType<ReturnType<typeof getProviders>["prayer"]["get"]>> }> {
  const providers = getProviders();
  const cityOpt = getCityById(city);
  const cityCoords = cityOpt.center;

  const [weather, prayer, candidates] = await Promise.all([
    cached(`w:${providers.weather.name}:${cityOpt.id}:${date}`, 30 * 60e3, () => providers.weather.get(cityCoords, date).catch(() => null)),
    cached(`p:${providers.prayer.name}:${cityOpt.id}:${date}`, 6 * 3600e3, () => providers.prayer.get(cityCoords, date).catch(() => null)),
    cached(`c:${providers.places.name}:${cityOpt.id}`, 10 * 60e3, () => providers.places.search({ city: cityOpt.id, limit: 300 }).catch(() => getCandidatesForCity(cityOpt.id))),
  ]);
  const rawList = Array.isArray(candidates) && candidates.length > 0 ? candidates : getCandidatesForCity(cityOpt.id);
  const verified = applyOverrides(rawList as any[]); cachePlaces(verified);
  return { transit: providers.transit, diet, weather: weather as Weather | null, candidates: verified, providers, prayer };
}
export const recompute = async (inp: ItinInput, profile?: Partial<Profile>): Promise<Itinerary> => compute(inp, await buildCtx(inp.date, profile?.diet ?? defaultDiet, inp.city));
export const json = (d: unknown, status = 200) => Response.json(d, { status });

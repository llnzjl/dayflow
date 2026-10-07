import type { Weather, PrayerTimes, RouteOption, Place } from "../types";
import { fmt, toMin } from "../time";
import { haversineKm } from "../time";
import { DEMO_PLACES, getCandidatesForCity } from "./demo-data";
import type { ReservationProvider, LatLng, PlaceProvider, PlaceQuery, TransitProvider, WeatherProvider, PrayerProvider, MapProvider } from "./types";

export class MockPlaceProvider implements PlaceProvider {
  name = "Demo data"; demo = true;
  async search(q: PlaceQuery) {
    let r = q.city ? getCandidatesForCity(q.city) : DEMO_PLACES.slice();
    if (q.category) r = r.filter((p) => p.category === q.category);
    if (q.area) r = r.filter((p) => p.area === q.area);
    if (q.halal) r = r.filter((p) => p.halal !== "unverified");
    if (q.vegan) r = r.filter((p) => p.vegan !== "none");
    if (q.q) {
      const s = q.q.toLowerCase();
      if (!q.city) {
        const cityCand = getCandidatesForCity(q.q);
        if (cityCand.length > 0) r = [...r, ...cityCand];
      }
      r = r.filter((p) => (p.name + p.nameKo + p.tags.join(" ") + p.area + p.category + p.address).toLowerCase().includes(s));
    }
    return r.slice(0, q.limit ?? 100);
  }
}
/** Pure estimator shared by demo + as the offline fallback of the real transit provider. */
export function estimateOptions(from: LatLng, to: LatLng, source: string): RouteOption[] {
  const d = haversineKm(from, to), road = d * 1.3, out: RouteOption[] = [];
  if (d < 0.05) return [{ mode: "walk", walkMin: 1, rideMin: 0, transferMin: 0, fare: 0, perPerson: true, source, live: false }];
  if (d <= 2.5) out.push({ mode: "walk", walkMin: Math.ceil((road / 4.5) * 60), rideMin: 0, transferMin: 0, fare: 0, perPerson: true, source, live: false });
  out.push({ mode: "subway", walkMin: 10, rideMin: Math.ceil((d * 1.25 / 32) * 60) + 3, transferMin: d > 6 ? 5 : 0, fare: 1550, perPerson: true, source, live: false });
  out.push({ mode: "bus", walkMin: 8, rideMin: Math.ceil((road / 17) * 60) + 6, transferMin: 0, fare: 1500, perPerson: true, source, live: false });
  const fare = Math.round((4800 + Math.max(0, road - 1.6) * 1000) / 100) * 100;
  out.push({ mode: "taxi", walkMin: 2, rideMin: Math.ceil((road / 24) * 60) + 3, transferMin: 0, fare, fareMax: Math.round((fare * 1.3) / 100) * 100, perPerson: false, source, live: false });
  return out;
}
export class MockTransitProvider implements TransitProvider {
  name = "Demo estimate"; demo = true;
  async getOptions(from: LatLng, to: LatLng) { return estimateOptions(from, to, "Demo estimate"); }
}
export class MockWeatherProvider implements WeatherProvider {
  name = "Demo data";
  async get(_p: LatLng, _date: string): Promise<Weather> {
    return { summary: "Demo: partly cloudy, light rain possible 15:00–16:00", tempC: 19, source: "Demo data", live: false,
      hours: Array.from({ length: 24 }, (_, h) => ({ h, precip: h >= 15 && h <= 16 ? 60 : 10 })) };
  }
}
export class MockPrayerProvider implements PrayerProvider {
  name = "Demo data";
  async get(): Promise<PrayerTimes> { return { Fajr: "05:12", Dhuhr: "12:18", Asr: "15:34", Maghrib: "17:59", Isha: "19:22", source: "Demo data", live: false }; }
}
export class MockMapProvider implements MapProvider {
  name = "Demo";
  async geocode(a: string) { const p = DEMO_PLACES.find((x) => x.name.toLowerCase().includes(a.toLowerCase())); return p ? { lat: p.lat, lng: p.lng, address: p.address } : null; }
  async reverse() { return null; }
}

/** Demo reservations: deterministic availability, clearly labelled as a demo booking. Real Korean booking APIs are partner-only, so none is bundled. */
export class MockReservationProvider implements ReservationProvider {
  name = "Demo reservations"; demo = true;
  private h(s: string) { let x = 0; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; }
  async slots(p: Place, date: string) {
    if (!["restaurant", "activity"].includes(p.category)) return null;
    const o = toMin(p.open); const c = toMin(p.close) <= o ? toMin(p.close) + 1440 : toMin(p.close); const out: { time: string; available: boolean }[] = [];
    for (let t = Math.ceil(o / 30) * 30; t + p.stay <= c && out.length < 24; t += 30) out.push({ time: fmt(t), available: this.h(p.id + date + t) % 4 !== 0 });
    return out;
  }
  async book(p: Place, date: string, time: string, party: number) {
    const s = await this.slots(p, date); if (!s?.find((x) => x.time === time && x.available)) return null;
    return { code: "DEMO-" + this.h(p.id + date + time + party).toString(36).toUpperCase().slice(0, 6) };
  }
}
export class NoReservationProvider implements ReservationProvider {
  name = "None"; demo = false;
  async slots() { return null; } async book() { return null; }
}

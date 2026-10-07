import type { Place, PrayerTimes, Weather } from "../types";
import { estimateOptions } from "./mock";
import type { LatLng, MapProvider, PlaceProvider, PlaceQuery, PrayerProvider, TransitProvider, WeatherProvider } from "./types";

const ncpHeaders = () => ({ "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_NCP_KEY_ID || "", "X-NCP-APIGW-API-KEY": process.env.NAVER_NCP_KEY || "" });

/** NAVER Cloud Platform Maps: Geocoding / Reverse geocoding (official REST APIs). */
export class NaverMapProvider implements MapProvider {
  name = "NAVER";
  async geocode(address: string) {
    const r = await fetch(`https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`, { headers: ncpHeaders() });
    if (!r.ok) throw new Error(`NAVER geocode ${r.status}`);
    const a = (await r.json()).addresses?.[0];
    return a ? { lat: Number(a.y), lng: Number(a.x), address: a.roadAddress || a.jibunAddress } : null;
  }
  async reverse(p: LatLng) {
    const r = await fetch(`https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${p.lng},${p.lat}&output=json&orders=roadaddr,addr`, { headers: ncpHeaders() });
    if (!r.ok) throw new Error(`NAVER reverse ${r.status}`);
    const a = (await r.json()).results?.[0];
    return a ? [a.region?.area1?.name, a.region?.area2?.name, a.land?.name, a.land?.number1].filter(Boolean).join(" ") : null;
  }
  /** Driving route duration in minutes (traffic-aware where the plan supports it). */
  async drivingMinutes(a: LatLng, b: LatLng) {
    const r = await fetch(`https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${a.lng},${a.lat}&goal=${b.lng},${b.lat}`, { headers: ncpHeaders() });
    if (!r.ok) throw new Error(`NAVER directions ${r.status}`);
    const s = (await r.json()).route?.traoptimal?.[0]?.summary;
    return s ? { minutes: Math.round(s.duration / 60000), taxiFare: s.taxiFare as number, tollFare: s.tollFare as number } : null;
  }
}
/** NAVER Developers Local Search. Returns text results only: NO halal data, NO prices, NO hours -> everything stays "Unverified". */
export class NaverPlaceProvider implements PlaceProvider {
  name = "NAVER Local Search"; demo = false;
  async search(q: PlaceQuery): Promise<Place[]> {
    const query = [q.area, q.category, q.q].filter(Boolean).join(" ") || "맛집";
    const r = await fetch(`https://openapi.naver.com/v1/search/local.json?display=${Math.min(q.limit ?? 5, 5)}&query=${encodeURIComponent(query)}`, {
      headers: { "X-Naver-Client-Id": process.env.NAVER_SEARCH_CLIENT_ID || "", "X-Naver-Client-Secret": process.env.NAVER_SEARCH_CLIENT_SECRET || "" } });
    if (!r.ok) throw new Error(`NAVER search ${r.status}`);
    const items = (await r.json()).items ?? [];
    return items.map((it: any, i: number): Place => ({
      id: `naver-${it.mapx}-${it.mapy}-${i}`, name: String(it.title).replace(/<[^>]+>/g, ""), nameKo: String(it.title).replace(/<[^>]+>/g, ""),
      category: /카페|커피/.test(it.category) ? "cafe" : /음식|식당/.test(it.category) ? "restaurant" : "activity", area: "custom",
      lat: Number(it.mapy) / 1e7, lng: Number(it.mapx) / 1e7, address: it.roadAddress || it.address,
      priceMin: 0, priceMax: 0, stay: 60, open: "00:00", close: "23:59", indoor: true, tags: [], halal: "unverified", vegan: "none",
      alcohol: false, accessible: false, source: "NAVER Local Search", updated: new Date().toISOString().slice(0, 10),
    }));
  }
}
/**
 * Korean public transit. Route *options* are estimated (flagged live:false -> UI shows "Live ETA unavailable").
 * Real-time bus arrivals come from TAGO (data.go.kr) via getBusArrivals() once you know a stop's cityCode/nodeId.
 */
export class KoreanTransitProvider implements TransitProvider {
  name = "Korean transit (estimates + TAGO)"; demo = false;
  async getOptions(from: LatLng, to: LatLng) { return estimateOptions(from, to, "Estimate (no live route API wired)"); }
  async getBusArrivals(cityCode: string, nodeId: string) {
    const key = process.env.TAGO_SERVICE_KEY; if (!key) return null;
    const u = `https://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList?serviceKey=${encodeURIComponent(key)}&cityCode=${cityCode}&nodeId=${nodeId}&_type=json`;
    const r = await fetch(u); if (!r.ok) return null; return r.json();
  }
}
/** Open-Meteo: free, no API key. */
export class OpenMeteoProvider implements WeatherProvider {
  name = "Open-Meteo";
  async get(p: LatLng, date: string): Promise<Weather | null> {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=precipitation_probability,temperature_2m&start_date=${date}&end_date=${date}&timezone=Asia%2FSeoul`);
    if (!r.ok) return null;
    const j = await r.json(); const pr: number[] = j.hourly?.precipitation_probability ?? []; const t: number[] = j.hourly?.temperature_2m ?? [];
    if (!pr.length) return null;
    const rainy = pr.map((v, h) => ({ v, h })).filter((x) => x.v >= 50);
    return { summary: rainy.length ? `Rain likely ${rainy[0].h}:00–${rainy[rainy.length - 1].h + 1}:00` : "No significant rain expected",
      tempC: t.length ? Math.round(t[13] ?? t[0]) : null, source: "Open-Meteo", live: true, hours: pr.map((v, h) => ({ h, precip: v })) };
  }
}
/** Aladhan prayer-times API: free, no key. Method 3 = Muslim World League. */
export class AladhanProvider implements PrayerProvider {
  name = "Aladhan";
  async get(p: LatLng, date: string): Promise<PrayerTimes | null> {
    const [y, m, d] = date.split("-");
    const r = await fetch(`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${p.lat}&longitude=${p.lng}&method=3&timezonestring=Asia/Seoul`);
    if (!r.ok) return null;
    const t = (await r.json()).data?.timings; if (!t) return null;
    const c = (s: string) => String(s).slice(0, 5);
    return { Fajr: c(t.Fajr), Dhuhr: c(t.Dhuhr), Asr: c(t.Asr), Maghrib: c(t.Maghrib), Isha: c(t.Isha), source: "Aladhan", live: true };
  }
}

export const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };
export const fmt = (m: number) => {
  const r = Math.round(m); const h = Math.floor(r / 60) % 24; const mm = ((r % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
export const durLabel = (m: number) => { const h = Math.floor(m / 60), r = Math.round(m % 60); return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`; };
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const BASE = { fast: 2, normal: 5, relaxed: 10 } as const;
/** Buffer = pace buffer + 3 min navigation/entrance uncertainty whenever any walking is involved. */
export const bufferFor = (pace: keyof typeof BASE, walkMin: number) => BASE[pace] + (walkMin > 0 ? 3 : 0);
/** Is [arrive, arrive+stay] inside open hours? Handles closing after midnight. */
export function openOK(open: string, close: string, arrive: number, stay: number) {
  const o = toMin(open); let c = toMin(close); if (c <= o) c += 1440;
  const a = arrive < o && arrive + 1440 <= c ? arrive + 1440 : arrive;
  return a >= o && a + stay <= c;
}

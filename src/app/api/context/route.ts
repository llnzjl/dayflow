import { buildCtx, json } from "@/lib/server";
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const ctx = await buildCtx(date);
  const p = ctx.providers;
  return json({ weather: ctx.weather, prayer: ctx.prayer, providers: { map: p.map.name, places: p.places.name, transit: p.transit.name, weather: p.weather.name, prayer: p.prayer.name, demo: p.places.demo || p.transit.demo },
    naverMapClientId: process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || null, ai: !!process.env.OPENAI_API_KEY });
}

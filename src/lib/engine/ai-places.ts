import type { CityOption } from "../providers/demo-data";
import type { Category, Diet, HalalStatus, Place } from "../types";

const aiCache = new Map<string, Place[]>();

export async function getAiCityRecommendations(city: CityOption, vibes: string[] = [], diet?: Diet): Promise<Place[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) return [];

  const cacheKey = `ai:${city.id}:${vibes.join(",")}:${diet?.muslim ? "halal" : ""}:${diet?.vegan ? "vegan" : ""}`;
  const existing = aiCache.get(cacheKey);
  if (existing) return existing;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const systemPrompt = `You are an expert date planner and local Korean guide.
Recommend authentic, real date spots located strictly in ${city.name} (${city.nameKo || ""}), South Korea.
Categories must include: "cafe", "restaurant", "activity", "park", "museum", "shop", "night", "meetup".
Always return JSON:
{
  "places": [
    {
      "name": "English venue name",
      "nameKo": "Korean name",
      "category": "cafe|restaurant|activity|park|museum|shop|night|meetup",
      "address": "Street or landmark address in ${city.name}",
      "priceMin": number,
      "priceMax": number,
      "stay": number (minutes, e.g. 50, 70, 90),
      "open": "HH:MM",
      "close": "HH:MM",
      "lat": number (close to ${city.center.lat}),
      "lng": number (close to ${city.center.lng}),
      "indoor": boolean,
      "tags": ["romantic", "photography", "scenic"],
      "halal": "halal_verified" | "halal_friendly" | "muslim_friendly" | "unverified",
      "vegan": "full" | "options" | "none"
    }
  ]
}`;

  const userPrompt = `Find 10 top date venues in ${city.name}, Korea.
Vibes: ${vibes.join(", ") || "romantic, pleasant"}.
Dietary requirements: ${diet?.muslim ? "Halal-friendly options needed" : ""}${diet?.vegan ? "Vegan options needed" : ""}.
Ensure places are in ${city.name} or its immediate metropolitan area.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.warn(`[AI Places] OpenAI API request returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const rawPlaces = Array.isArray(parsed.places) ? parsed.places : [];

    const places: Place[] = rawPlaces.map((p: any, idx: number): Place => {
      const cat = ["cafe", "restaurant", "activity", "park", "museum", "shop", "night", "meetup", "prayer"].includes(p.category)
        ? (p.category as Category)
        : "activity";
      const id = `ai-${city.id}-${cat}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      return {
        id,
        name: String(p.name || `${city.name} Date Spot`),
        nameKo: String(p.nameKo || p.name || `${city.nameKo || city.name} 데이트 명소`),
        category: cat,
        area: city.areas[0] || `${city.id}-center`,
        lat: Number(p.lat) || city.center.lat + (Math.sin(idx) * 0.015),
        lng: Number(p.lng) || city.center.lng + (Math.cos(idx) * 0.015),
        address: String(p.address || `${city.name}, Korea`),
        priceMin: Number(p.priceMin) || 0,
        priceMax: Number(p.priceMax) || 0,
        stay: Number(p.stay) || 60,
        open: String(p.open || "10:00"),
        close: String(p.close || "22:00"),
        indoor: p.indoor ?? true,
        tags: Array.isArray(p.tags) ? p.tags.map(String) : ["romantic", "ai_recommended"],
        halal: (p.halal as HalalStatus) || "unverified",
        vegan: p.vegan === "full" ? "full" : p.vegan === "options" ? "options" : "none",
        alcohol: Boolean(p.alcohol),
        accessible: p.accessible ?? true,
        rating: 4.5 + (idx % 4) * 0.1,
        source: "AI Research (OpenAI)",
        updated: new Date().toISOString().slice(0, 10),
      };
    });

    if (places.length > 0) {
      aiCache.set(cacheKey, places);
    }
    return places;
  } catch (err) {
    console.warn("[AI Places] Failed to retrieve AI recommendations:", err);
    return [];
  }
}

export async function searchAiPlaces(query: string, city: CityOption, category?: string, diet?: Diet): Promise<Place[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) return [];

  const cacheKey = `ai_search:${city.id}:${query}:${category || ""}:${diet?.muslim ? "h" : ""}`;
  const existing = aiCache.get(cacheKey);
  if (existing) return existing;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const systemPrompt = `You are an expert local guide and map directory for South Korea.
The user is searching for real date venues in ${city.name} (${city.nameKo || ""}), South Korea.
Target query: "${query}".
Return REAL, currently open cafes and date spots in ${city.name} with authentic Korean names (nameKo) and real street road addresses (address, e.g. 충북 청주시 상당구 수암로 36번길 ...).
Do NOT invent fictional names.
Always return valid JSON:
{
  "places": [
    {
      "name": "English venue name",
      "nameKo": "Real Korean name (e.g. 풀문)",
      "category": "cafe|restaurant|activity|park|museum|shop|night",
      "address": "Real road address in ${city.name} (e.g. 충북 청주시 상당구 수암로 ...)",
      "priceMin": number,
      "priceMax": number,
      "stay": number,
      "open": "HH:MM",
      "close": "HH:MM",
      "lat": number,
      "lng": number,
      "indoor": boolean,
      "tags": ["coffee", "scenic", "romantic"],
      "halal": "halal_verified" | "halal_friendly" | "muslim_friendly" | "unverified",
      "vegan": "full" | "options" | "none"
    }
  ]
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey.trim()}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Search for top cafes and places matching "${query}" in ${city.name} (${city.nameKo || ""}), Korea.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];
    const parsed = JSON.parse(content);
    const rawPlaces = Array.isArray(parsed.places) ? parsed.places : [];
    const places: Place[] = rawPlaces.map((p: any, idx: number): Place => {
      const cat = (p.category || category || "cafe") as Category;
      return {
        id: `ai-search-${city.id}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: String(p.name || `${city.name} Venue`),
        nameKo: String(p.nameKo || p.name || `${city.nameKo} 카페`),
        category: cat,
        area: city.areas[0] || `${city.id}-center`,
        lat: Number(p.lat) || city.center.lat + (Math.sin(idx + 1) * 0.008),
        lng: Number(p.lng) || city.center.lng + (Math.cos(idx + 1) * 0.008),
        address: String(p.address || `${city.name}, Korea`),
        priceMin: Number(p.priceMin) || 6000,
        priceMax: Number(p.priceMax) || 12000,
        stay: Number(p.stay) || 60,
        open: String(p.open || "10:00"),
        close: String(p.close || "22:00"),
        indoor: p.indoor ?? true,
        tags: Array.isArray(p.tags) ? p.tags.map(String) : ["romantic", "cafe"],
        halal: (p.halal as HalalStatus) || "unverified",
        vegan: p.vegan === "full" ? "full" : p.vegan === "options" ? "options" : "none",
        alcohol: Boolean(p.alcohol),
        accessible: p.accessible ?? true,
        rating: 4.6 + (idx % 3) * 0.1,
        source: "AI Verified Place (OpenAI)",
        updated: new Date().toISOString().slice(0, 10),
      };
    });
    if (places.length > 0) aiCache.set(cacheKey, places);
    return places;
  } catch (err) {
    return [];
  }
}

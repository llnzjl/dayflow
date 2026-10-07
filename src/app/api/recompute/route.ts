import { json, recompute } from "@/lib/server";
export async function POST(req: Request) {
  try { const { itinerary, profile } = await req.json(); return json({ itinerary: await recompute(itinerary, profile) }); }
  catch (e: any) { return json({ error: e.message }, 500); }
}

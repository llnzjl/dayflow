import { getDb } from "@/lib/db";
import { json } from "@/lib/http";
const OK = new Set(["onboarding_completed", "itinerary_created", "ai_plan_generated", "place_added", "route_viewed", "budget_changed", "itinerary_replanned", "reservation_started", "itinerary_completed", "place_saved", "recommendation_rejected"]);
/** Privacy-conscious analytics: allow-listed event names + timestamp. No user id, no payload. */
export async function POST(req: Request) { const { name } = await req.json().catch(() => ({})); if (OK.has(name)) getDb().prepare("INSERT INTO events (name, at) VALUES (?,?)").run(name, Date.now()); return json({ ok: true }); }

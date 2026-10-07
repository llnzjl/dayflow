import { getDb } from "./db";
import { decrypt, encrypt, type User } from "./auth";
import type { Diet, Itinerary, ItinInput, Place, Profile, Role } from "./types";
import { defaultDiet } from "./diet-default";

export interface UserState { profile: Profile | null; history: string[]; savedPlaces: Place[]; feedback: Record<string, string>; memories: string[]; onboarded: boolean }
export function getState(userId: string): UserState {
  const r = getDb().prepare("SELECT profile_enc, data FROM user_state WHERE user_id=?").get(userId) as any;
  const d = r ? JSON.parse(r.data) : {};
  return { profile: r?.profile_enc ? JSON.parse(decrypt(r.profile_enc)) : null, history: d.history ?? [], savedPlaces: d.savedPlaces ?? [], feedback: d.feedback ?? {}, memories: d.memories ?? [], onboarded: !!d.onboarded };
}
export function setState(userId: string, s: UserState) {
  const { profile, ...rest } = s;
  getDb().prepare("INSERT INTO user_state (user_id, profile_enc, data) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET profile_enc=excluded.profile_enc, data=excluded.data")
    .run(userId, profile ? encrypt(JSON.stringify(profile)) : null, JSON.stringify(rest));
}
export const ownerDiet = (ownerId: string): Diet => getState(ownerId).profile?.diet ?? defaultDiet;

export interface PlanRow { id: string; owner_id: string; json: string; status: string; live_json: string | null; updated_at: number }
export const getPlan = (id: string) => getDb().prepare("SELECT * FROM itineraries WHERE id=?").get(id) as PlanRow | undefined;
export function roleFor(p: PlanRow, u: User): Role | null {
  if (p.owner_id === u.id) return "owner";
  const s = getDb().prepare("SELECT role FROM shares WHERE itinerary_id=? AND email=?").get(p.id, u.email) as any; return s?.role ?? null;
}
export const canEdit = (r: Role | null) => r === "owner" || r === "organizer" || r === "editor";
export const canManage = (r: Role | null) => r === "owner" || r === "organizer";
export function savePlan(ownerId: string, it: Itinerary | (ItinInput & Record<string, unknown>)) {
  getDb().prepare("INSERT INTO itineraries (id, owner_id, json, status, updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json, status=excluded.status, updated_at=excluded.updated_at")
    .run(it.id, ownerId, JSON.stringify(it), it.status ?? "upcoming", Date.now());
}
export function listPlans(u: User): Itinerary[] {
  const db = getDb();
  const own = db.prepare("SELECT i.*, u.name as owner_name FROM itineraries i JOIN users u ON u.id=i.owner_id WHERE i.owner_id=? ORDER BY i.updated_at DESC").all(u.id) as any[];
  const shared = db.prepare("SELECT i.*, u.name as owner_name, s.role, s.eta_sharing FROM shares s JOIN itineraries i ON i.id=s.itinerary_id JOIN users u ON u.id=i.owner_id WHERE s.email=? ORDER BY i.updated_at DESC").all(u.email) as any[];
  return [...own.map((r) => ({ ...JSON.parse(r.json), role: "owner", ownerName: r.owner_name, updatedAt: r.updated_at, live: r.live_json ? JSON.parse(r.live_json) : null })),
    ...shared.map((r) => ({ ...JSON.parse(r.json), role: r.role, ownerName: r.owner_name, updatedAt: r.updated_at, status: r.status, live: r.eta_sharing && r.live_json ? JSON.parse(r.live_json) : null }))];
}
export function cachePlaces(ps: Place[]) {
  const db = getDb(); const st = db.prepare("INSERT INTO places (id, json, source, lat, lng, fetched_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json, fetched_at=excluded.fetched_at");
  db.transaction(() => ps.forEach((p) => st.run(p.id, JSON.stringify(p), p.source, p.lat, p.lng, Date.now())))();
}
export function applyOverrides(ps: Place[]): Place[] {
  const rows = getDb().prepare("SELECT place_id, halal FROM place_overrides").all() as any[]; if (!rows.length) return ps;
  const m = new Map(rows.map((r) => [r.place_id, r.halal])); return ps.map((p) => (m.has(p.id) && m.get(p.id) ? { ...p, halal: m.get(p.id) } : p));
}
export function verifiedPlace(placeId: string): Place | null {
  const r = getDb().prepare("SELECT json FROM places WHERE id=?").get(placeId) as any; return r ? applyOverrides([JSON.parse(r.json)])[0] : null;
}
export const logAction = (userId: string | null, kind: string, input: string, summary: string) =>
  getDb().prepare("INSERT INTO ai_actions (user_id, kind, input, summary, at) VALUES (?,?,?,?,?)").run(userId, kind, input.slice(0, 500), summary.slice(0, 500), Date.now());

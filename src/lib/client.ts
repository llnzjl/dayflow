"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Itinerary, Place, Profile } from "./types";

export interface Store { session: boolean; user: { name: string; email: string; isAdmin: boolean } | null; profile: Profile | null; plans: Itinerary[]; history: string[];
  savedPlaces: Place[]; feedback: Record<string, string>; memories: string[]; onboarded: boolean; dark: boolean; brand: string }
const PREF = "dateflow:prefs";
const EMPTY: Store = { session: false, user: null, profile: null, plans: [], history: [], savedPlaces: [], feedback: {}, memories: [], onboarded: false, dark: false, brand: "Coral" };

export async function api<T = any>(url: string, body?: unknown, method?: string): Promise<T> {
  const r = await fetch(url, body !== undefined || method ? { method: method ?? "POST", headers: { "Content-Type": "application/json" }, body: body !== undefined ? JSON.stringify(body) : undefined } : undefined);
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Request failed"); return j;
}
export const defaultProfile = (name: string, email: string): Profile => ({ name, email, lang: "en", currency: "KRW", diet: { muslim: false, vegetarian: false, vegan: false, noPork: false, noAlcohol: false, allergies: [] },
  interests: [], dislikes: [], mobility: "normal", transport: "transit", defaultBudget: 100000, prayerAware: false, pace: "relaxed", consentSensitive: false, notifications: true });
const strip = (p: Itinerary) => { const { role, ownerName, live, updatedAt, ...rest } = p as any; void role; void ownerName; void live; void updatedAt; return rest; };

/** Server-backed store: auth session cookie + SQLite on the server. Local storage only keeps theme prefs. */
export function useStore() {
  const [s, setS] = useState<Store>(EMPTY); const [ready, setReady] = useState(false);
  const synced = useRef<Record<string, string>>({}); const stateSig = useRef(""); const loaded = useRef(false);
  const update = useCallback((f: (p: Store) => Store) => setS((p) => f(p)), []);
  const load = useCallback(async () => {
    try {
      const me = await api("/api/auth/me");
      if (!me.user) { loaded.current = false; setS((p) => ({ ...EMPTY, dark: p.dark, brand: p.brand })); return; }
      const [st, pl] = await Promise.all([api("/api/state"), api("/api/plans")]);
      const profile: Profile = st.profile ?? defaultProfile(me.user.name, me.user.email);
      synced.current = Object.fromEntries((pl.plans as Itinerary[]).map((p) => [p.id, JSON.stringify(strip(p))]));
      stateSig.current = JSON.stringify({ profile: st.profile, history: st.history, savedPlaces: st.savedPlaces, feedback: st.feedback, memories: st.memories, onboarded: st.onboarded });
      loaded.current = true;
      setS((p) => ({ ...p, session: true, user: me.user, profile, plans: pl.plans, history: st.history, savedPlaces: st.savedPlaces, feedback: st.feedback, memories: st.memories, onboarded: st.onboarded }));
    } catch { /* offline: keep current */ }
  }, []);
  useEffect(() => { try { const r = JSON.parse(localStorage.getItem(PREF) || "{}"); setS((p) => ({ ...p, dark: !!r.dark, brand: r.brand || "Coral" })); } catch {} load().finally(() => setReady(true)); }, [load]);
  useEffect(() => { if (ready) try { localStorage.setItem(PREF, JSON.stringify({ dark: s.dark, brand: s.brand })); } catch {} }, [s.dark, s.brand, ready]);
  // push profile/state (sensitive diet only if the user consented)
  useEffect(() => {
    if (!loaded.current || !s.session || !s.profile) return;
    const profile = s.profile.consentSensitive ? s.profile : { ...s.profile, diet: { muslim: false, vegetarian: false, vegan: false, noPork: false, noAlcohol: false, allergies: [] }, prayerAware: false };
    const body = { profile, history: s.history, savedPlaces: s.savedPlaces, feedback: s.feedback, memories: s.memories, onboarded: s.onboarded }; const sig = JSON.stringify(body);
    if (sig === stateSig.current) return; const t = setTimeout(() => { stateSig.current = sig; api("/api/state", body, "PUT").catch(() => (stateSig.current = "")); }, 600); return () => clearTimeout(t);
  }, [s.profile, s.history, s.savedPlaces, s.feedback, s.memories, s.onboarded, s.session]);
  // push plans (server revalidates & recalculates) / delete removed owned plans
  useEffect(() => {
    if (!loaded.current || !s.session) return;
    const t = setTimeout(() => {
      const ids = new Set(s.plans.map((p) => p.id));
      for (const p of s.plans) { if (p.role === "viewer") continue; const str = JSON.stringify(strip(p)); if (synced.current[p.id] === str) continue; synced.current[p.id] = str;
        api("/api/plans", { itinerary: strip(p) }, "PUT").catch(() => { delete synced.current[p.id]; }); }
      for (const id of Object.keys(synced.current)) if (!ids.has(id)) { delete synced.current[id]; api(`/api/plans?id=${id}`, undefined, "DELETE").catch(() => {}); }
    }, 500); return () => clearTimeout(t);
  }, [s.plans, s.session]);
  // refresh shared changes (other people's edits / live ETA) when nothing is pending locally
  useEffect(() => {
    if (!s.session) return;
    const tick = async () => { if (document.hidden || !loaded.current) return; try {
      const pl: Itinerary[] = (await api("/api/plans")).plans;
      setS((p) => { let ch = false; const local = new Map(p.plans.map((x) => [x.id, x]));
        const next = pl.map((sv) => { const lc = local.get(sv.id); const svStr = JSON.stringify(strip(sv));
          if (!lc) { synced.current[sv.id] = svStr; ch = true; return sv; }
          const clean = JSON.stringify(strip(lc)) === synced.current[sv.id];
          if (clean && (svStr !== synced.current[sv.id] || JSON.stringify(lc.live) !== JSON.stringify(sv.live))) { synced.current[sv.id] = svStr; ch = true; return sv; } return lc; });
        const pending = p.plans.filter((x) => !pl.some((y) => y.id === x.id) && synced.current[x.id] !== JSON.stringify(strip(x)));
        return ch ? { ...p, plans: [...next, ...pending] } : p; }); } catch {} };
    const iv = setInterval(tick, 20000); document.addEventListener("visibilitychange", tick); return () => { clearInterval(iv); document.removeEventListener("visibilitychange", tick); };
  }, [s.session]);
  const track = useCallback((name: string) => { fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => {}); }, []);
  const logout = useCallback(async () => { await api("/api/auth/logout", {}); loaded.current = false; setS((p) => ({ ...EMPTY, dark: p.dark, brand: p.brand })); }, []);
  return { s, ready, update, track, reload: load, logout };
}

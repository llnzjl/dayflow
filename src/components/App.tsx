"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BRAND, BRAND_COLORS } from "@/lib/brand";
import { api, useStore } from "@/lib/client";
import type { Itinerary, Place, Profile } from "@/lib/types";
import { CITIES, getCityById } from "@/lib/providers/demo-data";
import { fmt, toMin } from "@/lib/time";
import { won } from "@/lib/money";
import { HALAL_LABEL } from "@/lib/diet";
import { getGoogleMapsUrl, getNaverMapUrl } from "@/lib/maps";
import { Auth } from "./Auth";
import { Onboarding } from "./Onboarding";
import { PlanView } from "./PlanView";
import { MapView } from "./MapView";
import { Badge, Chip, Fade, Motion, Spinner, Toggle } from "./ui";
import { Bell, LanguageToggle, ReportButton } from "./Extras";

type Tab = "home" | "plans" | "explore" | "map" | "profile";
const TABS: [Tab, string, string][] = [["home", "Home", "✨"], ["plans", "Plans", "🗓"], ["explore", "Explore", "🧭"], ["map", "Map", "🗺"], ["profile", "Profile", "👤"]];
const VIBES = ["Romantic", "Relaxing", "Fun", "Fancy", "Creative", "Adventurous", "Food-focused", "Photography", "Nature", "Night", "Budget"];
const EXAMPLES = ["Plan a romantic date in Seoul.", "Cheap date under ₩80,000.", "Something fun around Hongdae.", "Halal date for two.", "Rainy day activities.", "Surprise me."];
const QUICK: [string, string, string][] = [["Plan a date", "plan", "💞"], ["Explore nearby", "explore:", "🧭"], ["Find halal places", "explore:halal", "🥘"], ["Find vegan places", "explore:vegan", "🌱"], ["Find restaurants", "explore:restaurant", "🍽"], ["Find cafes", "explore:cafe", "☕"], ["Find activities", "explore:activity", "🎯"], ["Prayer locations", "explore:prayer", "🕌"], ["Open map", "map", "🗺"]];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function App() {
  const { s, ready, update, track, reload, logout } = useStore();
  const [tab, setTab] = useState<Tab>("home"); const [openId, setOpenId] = useState<string | null>(null); const [planner, setPlanner] = useState<{ text: string } | null>(null);
  const [info, setInfo] = useState<any>(null); const [exploreInit, setExploreInit] = useState("");
  useEffect(() => { document.documentElement.classList.toggle("dark", s.dark); document.documentElement.style.setProperty("--brand", BRAND_COLORS[s.brand] ?? BRAND_COLORS.Coral); }, [s.dark, s.brand]);
  useEffect(() => { if (s.session) api("/api/context?date=" + todayISO()).then(setInfo).catch(() => setInfo(null)); }, [s.session]);
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("dateflow:lang") as "en" | "ko" | null;
      if (savedLang && (savedLang === "en" || savedLang === "ko") && s.profile && s.profile.lang !== savedLang) {
        update((x) => (x.profile ? { ...x, profile: { ...x.profile, lang: savedLang } } : x));
      }
    } catch {}
  }, [s.profile?.email, update]);
  useEffect(() => {
    if (!s.plans?.length) return;
    const today = todayISO();
    const expired = s.plans.filter((p) => p.date < today && p.status !== "past");
    if (expired.length > 0) {
      update((x) => ({
        ...x,
        plans: x.plans.map((p) => (p.date < today && p.status !== "past" ? { ...p, status: "past" as const } : p)),
        history: [...new Set([...x.history, ...expired.flatMap((p) => p.stops.map((s2) => s2.place.id))])],
      }));
      expired.forEach((p) => {
        api("/api/plans", { ...p, status: "past" }, "PUT").catch(() => {});
      });
    }
  }, [s.plans, update]);
  if (!ready) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  if (!s.session || !s.profile) return <Motion><Auth reload={reload} /></Motion>;
  const profile = s.profile; const setProfile = (p: Profile) => update((x) => ({ ...x, profile: p }));
  if (!s.onboarded) return <Motion><Onboarding profile={profile} done={(p) => { update((x) => ({ ...x, profile: p, onboarded: true })); track("onboarding_completed"); }} /></Motion>;
  const savePlan = (p: Itinerary) => update((x) => ({ ...x, plans: x.plans.some((o) => o.id === p.id) ? x.plans.map((o) => (o.id === p.id ? p : o)) : [p, ...x.plans] }));
  const open = s.plans.find((p) => p.id === openId);
  const go = (a: string) => { if (a === "plan") setPlanner({ text: "" }); else if (a.startsWith("explore:")) { setExploreInit(a.slice(8)); setTab("explore"); setOpenId(null); } else { setTab(a as Tab); setOpenId(null); } };
  const nav = (t: Tab) => { setTab(t); setOpenId(null); };
  return (
    <Motion>
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col gap-1 p-5 md:flex"><div className="mb-6 text-lg font-bold text-brand">{BRAND.name}</div>
          {TABS.map(([t, l, e]) => <button key={t} onClick={() => nav(t)} className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium ${tab === t ? "bg-brand/10 text-brand" : "text-muted hover:bg-line/40"}`}>{e} {l}</button>)}
          {info?.providers?.demo && <p className="mt-auto rounded-xl bg-warn/10 p-3 text-xs text-warn">Demo data is active (mock providers). See README to connect real APIs.</p>}</aside>
        <main className="min-w-0 flex-1 px-5 pb-28 pt-6 md:pb-10">
          <div className="mb-4 flex items-center justify-end gap-2">
            {s.user?.isAdmin && <a className="btn-ghost !px-3 !py-1.5" href="/admin">{profile.lang === "ko" ? "관리자" : "Admin"}</a>}
            <LanguageToggle
              lang={profile.lang}
              onChange={(newLang) => {
                setProfile({ ...profile, lang: newLang });
                try { localStorage.setItem("dateflow:lang", newLang); } catch {}
              }}
            />
            <Bell />
          </div>
          <AnimatePresence mode="wait"><Fade k={tab + openId}>
            {tab === "home" && !open && <Home s={s} info={info} go={go} openPlan={(id) => { setTab("plans"); setOpenId(id); }} start={(t) => setPlanner({ text: t })} />}
            {tab === "plans" && !open && <Plans plans={s.plans} openPlan={setOpenId} remove={(id) => update((x) => ({ ...x, plans: x.plans.filter((p) => p.id !== id) }))} leave={async (id) => { await api(`/api/plans/${id}/share`, undefined, "DELETE"); update((x) => ({ ...x, plans: x.plans.filter((p) => p.id !== id) })); }} create={() => setPlanner({ text: "" })} manual={async () => { const r = await api("/api/recompute", { itinerary: { id: Math.random().toString(36).slice(2), title: "My plan", date: todayISO(), startTime: toMin("10:00"), endTime: toMin("20:00"), party: 2, budget: profile.defaultBudget, pace: profile.pace, transport: profile.transport, lessWalking: profile.mobility !== "normal", vibes: [], items: [], status: "upcoming" }, profile }); savePlan(r.itinerary); setOpenId(r.itinerary.id); track("itinerary_created"); }} />}
            {open && <PlanView plan={open} profile={profile} info={info} track={track} onBack={() => setOpenId(null)} onUpdate={savePlan} onLeave={() => { setOpenId(null); update((x) => ({ ...x, plans: x.plans.filter((p) => p.id !== open.id) })); reload(); }}
              onFinish={async (p) => {
                const finishedPlan: Itinerary = { ...p, status: "past" };
                savePlan(finishedPlan);
                update((x) => ({ ...x, plans: x.plans.map((o) => (o.id === p.id ? finishedPlan : o)), history: [...new Set([...x.history, ...p.stops.map((s2) => s2.place.id)])] }));
                track("itinerary_completed");
                try { await api("/api/plans", finishedPlan, "PUT"); } catch {}
              }}
              feedback={s.feedback} setFeedback={(k, v) => update((x) => ({ ...x, feedback: { ...x.feedback, [k]: v } }))}
              saveMemory={(p) => update((x) => ({ ...x, memories: [...new Set([...x.memories, `Enjoyed ${p.vibes.join("/") || "a mixed"} day in ${p.area ?? "Seoul"}`, ...p.stops.filter((s2) => x.feedback[s2.place.id] === "loved").map((s2) => `Loved ${s2.place.name}`)])] }))} />}
            {tab === "explore" && <Explore key={exploreInit} init={exploreInit} profile={profile} plans={s.plans} saved={s.savedPlaces} onSave={(p) => update((x) => ({ ...x, savedPlaces: x.savedPlaces.some((q) => q.id === p.id) ? x.savedPlaces.filter((q) => q.id !== p.id) : [...x.savedPlaces, p] }))}
              onAdd={async (p, planId) => { const pl = s.plans.find((x) => x.id === planId)!; const { mkItem, stripDerived } = await import("@/lib/engine/compute"); const inp = stripDerived(pl); inp.items.push(mkItem(p)); const r = await api("/api/recompute", { itinerary: inp, profile }); savePlan(r.itinerary); track("place_added"); }} />}
            {tab === "map" && <MapTab plan={s.plans.find((p) => p.status === "active") ?? s.plans[0]} saved={s.savedPlaces} naverId={info?.naverMapClientId} />}
            {tab === "profile" && <ProfileTab s={s} profile={profile} setProfile={setProfile} update={update} logout={logout} reload={reload} />}
          </Fade></AnimatePresence>
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {TABS.map(([t, l, e]) => <button key={t} onClick={() => nav(t)} className={`py-2.5 text-[11px] font-medium ${tab === t ? "text-brand" : "text-muted"}`}><div className="text-lg">{e}</div>{l}</button>)}</nav>
      <AnimatePresence>{planner && <Planner init={planner.text} profile={profile} history={s.history} plans={s.plans} onClose={() => setPlanner(null)}
        onDone={(p) => { savePlan(p); track("ai_plan_generated"); track("itinerary_created"); setPlanner(null); setTab("plans"); setOpenId(p.id); }} />}</AnimatePresence>
    </Motion>);
}

function Home({ s, info, go, openPlan, start }: { s: ReturnType<typeof useStore>["s"]; info: any; go: (a: string) => void; openPlan: (id: string) => void; start: (t: string) => void }) {
  const h = new Date().getHours(); const [t, setT] = useState(""); const up = s.plans.filter((p) => p.status !== "past").slice(0, 3);
  return (
    <div className="space-y-7">
      <header><p className="text-muted">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}{info?.weather && <> · {info.weather.summary}{info.weather.tempC != null ? `, ${info.weather.tempC}°C` : ""}{!info.weather.live && " (demo)"}</>}</p>
        <h1 className="mt-1 text-4xl font-bold">{h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, {s.profile!.name.split(" ")[0]}</h1><p className="mt-1 text-xl text-muted">What are you doing today?</p></header>
      <div className="flex flex-wrap gap-3"><button className="btn-primary px-6 py-3.5 text-base" onClick={() => start("")}>✨ Plan my day</button><button className="btn-ghost px-6 py-3.5 text-base" onClick={() => go("plan")}>+ Create itinerary</button></div>
      <form className="card p-4" onSubmit={(e) => { e.preventDefault(); start(t); }}><input className="input !border-0 !px-0 text-base" placeholder="I have no idea what to do today…" value={t} onChange={(e) => setT(e.target.value)} />
        <div className="mt-2 flex flex-wrap gap-2">{EXAMPLES.map((x) => <button type="button" key={x} className="chip" onClick={() => start(x)}>{x}</button>)}</div></form>
      <section><h2 className="mb-3 font-semibold">Upcoming</h2>{up.length ? <div className="grid gap-3 sm:grid-cols-2">{up.map((p) => (
        <button key={p.id} onClick={() => openPlan(p.id)} className="card p-5 text-left transition hover:border-brand"><div className="flex justify-between"><b>{p.title}</b><Badge tone={p.health.state === "green" ? "ok" : p.health.state === "yellow" ? "warn" : "bad"}>{p.health.state === "green" ? "🟢 Healthy" : p.health.state === "yellow" ? "🟡 Tight" : "🔴 At risk"}</Badge></div>
          <p className="num mt-2 text-sm text-muted">{p.date} · {fmt(p.stops[0]?.arrive ?? p.startTime)} → {fmt(p.stops.at(-1)?.leave ?? p.endTime)}</p><p className="num mt-1 text-sm">{p.stops.length} stops · <b>{won(p.totals.total)}</b></p></button>))}</div>
        : <div className="card p-8 text-center text-muted">No plans yet — tap <b>✨ Plan my day</b> and I’ll build one.</div>}</section>
      <section><h2 className="mb-3 font-semibold">Quick actions</h2><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{QUICK.map(([l, a, e]) => <button key={l} onClick={() => go(a)} className="card p-3 text-center text-xs font-medium transition hover:border-brand"><div className="text-2xl">{e}</div>{l}</button>)}</div></section>
      {s.profile!.diet.muslim && info?.prayer && <section className="card p-5"><h2 className="font-semibold">Prayer times {!info.prayer.live && <span className="text-xs font-normal text-muted">(demo)</span>}</h2><div className="num mt-2 grid grid-cols-4 gap-2 text-center text-sm">{(["Dhuhr", "Asr", "Maghrib", "Isha"] as const).map((k) => <div key={k}><div className="text-xs text-muted">{k}</div><b>{info.prayer[k]}</b></div>)}</div></section>}
    </div>);
}

function Planner({ init, profile, history, plans, onClose, onDone }: { init: string; profile: Profile; history: string[]; plans: Itinerary[]; onClose: () => void; onDone: (p: Itinerary) => void }) {
  const [city, setCity] = useState(() => {
    const t = init.toLowerCase();
    if (/suwon|seouwon|수원/.test(t)) return "suwon";
    if (/busan|부산/.test(t)) return "busan";
    if (/incheon|인천/.test(t)) return "incheon";
    if (/jeju|제주/.test(t)) return "jeju";
    if (/daegu|대구/.test(t)) return "daegu";
    if (/daejeon|대전/.test(t)) return "daejeon";
    if (/jeonju|전주/.test(t)) return "jeonju";
    if (/gangneung|강릉/.test(t)) return "gangneung";
    if (/gyeongju|경주/.test(t)) return "gyeongju";
    if (/sokcho|속초/.test(t)) return "sokcho";
    if (/chuncheon|춘천/.test(t)) return "chuncheon";
    if (/yeosu|여수/.test(t)) return "yeosu";
    if (/gwangju|광주/.test(t)) return "gwangju";
    if (/pohang|포항/.test(t)) return "pohang";
    return "seoul";
  });
  const [customCity, setCustomCity] = useState("");
  const activeCityId = city === "other" && customCity.trim() ? customCity.trim() : city;
  const selectedCityOpt = getCityById(activeCityId);
  const [meetingPoint, setMeetingPoint] = useState(() => {
    const m = init.match(/(?:meet(?:ing)? at|start(?:ing)? (?:at|from)|만남(?:\:|장소)?)\s+([^,.]+)/i);
    return m ? m[1].trim() : (selectedCityOpt.meetingSuggestions[0] || "");
  });
  const [endPoint, setEndPoint] = useState(() => {
    const m = init.match(/(?:end(?:ing)? at|finish(?:ing)? at|끝(?:\:|장소)?)\s+([^,.]+)/i);
    return m ? m[1].trim() : (selectedCityOpt.endSuggestions[0] || "");
  });

  const [text, setText] = useState(init);
  const [vibes, setVibes] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>(profile.defaultBudget ? String(profile.defaultBudget) : "");
  const [party, setParty] = useState(2);
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("20:30");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [stage, setStage] = useState(0);
  const STAGES = ["Understanding your request", "Finding verified places", "Checking opening hours & diet", "Calculating routes & buffers", "Balancing budget"];

  const handleSelectCity = (cId: string) => {
    setCity(cId);
    if (cId !== "other") setCustomCity("");
    const opt = getCityById(cId);
    if (opt.meetingSuggestions.length) setMeetingPoint(opt.meetingSuggestions[0]);
    if (opt.endSuggestions.length) setEndPoint(opt.endSuggestions[0]);
  };

  const handleCustomCityChange = (val: string) => {
    setCustomCity(val);
    if (val.trim()) {
      const opt = getCityById(val.trim());
      if (opt.meetingSuggestions.length) setMeetingPoint(opt.meetingSuggestions[0]);
      if (opt.endSuggestions.length) setEndPoint(opt.endSuggestions[0]);
    }
  };

  async function go(surprise = false) {
    setBusy(true); setErr(""); const iv = setInterval(() => setStage((x) => Math.min(STAGES.length - 1, x + 1)), 500);
    try {
      const targetCity = city === "other" && customCity.trim() ? customCity.trim() : city;
      // 2-week (14 days) cooldown: venues from plans within 14 days of date cannot be selected again
      const targetDateMs = new Date(date || todayISO()).getTime();
      const recentFromPlans = (plans || []).flatMap((p) => {
        const pDateMs = new Date(p.date).getTime();
        const diffDays = Math.abs(targetDateMs - pDateMs) / (1000 * 60 * 60 * 24);
        if (diffDays <= 14) {
          return (p.stops || []).filter((s) => s.place?.category !== "meetup").map((s) => s.place.id);
        }
        return [];
      });
      const recentPlaceIds = Array.from(new Set([...recentFromPlans, ...(history || [])]));

      const r = await api("/api/plan", {
        text,
        profile,
        history,
        overrides: {
          city: targetCity,
          meetingPoint: meetingPoint.trim() || undefined,
          endPoint: endPoint.trim() || undefined,
          date,
          startTime: toMin(start),
          endTime: toMin(end),
          party,
          budget: budget ? Number(budget) : null,
          vibes: vibes.map((v) => v.toLowerCase().replace("-focused", "")),
          recentPlaceIds,
          surprise
        }
      });
      if (r.itinerary.stops.length < 2) { setErr(r.reply + (r.notes?.length ? " " + r.notes.join(" ") : "")); return; }
      onDone({ ...r.itinerary, title: surprise ? "Surprise day" : r.itinerary.title });
    } catch (e: any) { setErr(e.message); } finally { clearInterval(iv); setBusy(false); setStage(0); }
  }
  return (
    <motion.div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-bg p-6 md:rounded-3xl" initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={(e) => e.stopPropagation()}>
        {busy ? <div className="py-10 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" /><p className="mt-5 text-lg font-semibold">{STAGES[stage]}…</p><p className="mt-1 text-sm text-muted">Only verified places make it into your day.</p></div> : <>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">✨ Plan your date</h2>
              <p className="text-xs text-muted mt-0.5">Where to explore, meet, and end your date across Korea.</p>
            </div>
            <button onClick={onClose} aria-label="close" className="text-muted p-1 hover:text-ink">✕</button>
          </div>

          {/* Question 1: Where do you want the date? */}
          <div className="mt-4 rounded-2xl border border-line bg-surface/50 p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <span>📍</span> Where do you want the date?
              </label>
              <span className="text-[11px] text-muted">Select a city / region</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <Chip key={c.id} on={city === c.id} onClick={() => handleSelectCity(c.id)}>
                  {c.emoji} {c.name} <span className="text-[11px] text-muted">({c.nameKo})</span>
                </Chip>
              ))}
            </div>
            {city === "other" && (
              <div className="mt-3">
                <input
                  className="input"
                  placeholder="Enter any city or region across Korea (e.g. Gyeongju, Sokcho, Pohang, Chuncheon...)"
                  value={customCity}
                  onChange={(e) => handleCustomCityChange(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-muted mr-1">Suggestions:</span>
                  {["Gyeongju", "Sokcho", "Pohang", "Chuncheon", "Yeosu", "Tongyeong", "Suncheon", "Andong"].map((sug) => (
                    <button
                      type="button"
                      key={sug}
                      className="chip !text-[11px] !py-0.5"
                      onClick={() => handleCustomCityChange(sug)}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Question 2: Where do you want to meet? */}
          <div className="mt-3 rounded-2xl border border-line bg-surface/50 p-4">
            <label className="text-sm font-semibold flex items-center gap-1.5">
              <span>🤝</span> Where do you want to meet?
            </label>
            <p className="text-xs text-muted mt-0.5">Start & meeting point for your date</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedCityOpt.meetingSuggestions.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  className={`chip !text-xs ${meetingPoint === sug ? "chip-on" : ""}`}
                  onClick={() => setMeetingPoint(sug)}
                >
                  {sug}
                </button>
              ))}
            </div>
            <input
              className="input mt-2"
              placeholder="e.g. Suwon Station Exit 4, Gangnam Station, cozy cafe nearby..."
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
            />
          </div>

          {/* Question 3: Where would you want to end the date? */}
          <div className="mt-3 rounded-2xl border border-line bg-surface/50 p-4">
            <label className="text-sm font-semibold flex items-center gap-1.5">
              <span>🌙</span> Where would you want to end the date?
            </label>
            <p className="text-xs text-muted mt-0.5">Ending & farewell location</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedCityOpt.endSuggestions.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  className={`chip !text-xs ${endPoint === sug ? "chip-on" : ""}`}
                  onClick={() => setEndPoint(sug)}
                >
                  {sug}
                </button>
              ))}
            </div>
            <input
              className="input mt-2"
              placeholder="e.g. Banghwasuryujeong Night View, Suwon Station, drop off at home..."
              value={endPoint}
              onChange={(e) => setEndPoint(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold">Special requests or date ideas (optional)</label>
            <textarea
              className="input mt-1.5 min-h-20"
              placeholder="e.g. I want a romantic date tomorrow in Seoul. We like food and photography, budget ₩100,000, I'm Muslim."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <p className="mt-4 text-sm font-semibold">Vibe</p>
          <div className="mt-2 flex flex-wrap gap-2">{VIBES.map((v) => <Chip key={v} on={vibes.includes(v)} onClick={() => setVibes((x) => (x.includes(v) ? x.filter((i) => i !== v) : [...x, v]))}>{v}</Chip>)}</div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <label>Date<input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>People<input type="number" min={1} max={12} className="input mt-1" value={party} onChange={(e) => setParty(Math.max(1, Number(e.target.value)))} /></label>
            <label>Start<input type="time" className="input mt-1" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label>End<input type="time" className="input mt-1" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
            <label className="col-span-2">Total budget (₩, blank = none)<input inputMode="numeric" className="input mt-1" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))} /></label>
          </div>

          <p className="mt-2 text-xs text-muted">Diet & preferences from your profile{profile.diet.muslim ? " (halal on)" : ""}. Anything in your text overrides defaults.</p>
          {err && <p className="mt-3 text-sm text-bad">{err}</p>}
          <div className="mt-5 flex gap-3">
            <button className="btn-primary flex-1 py-3" onClick={() => go(false)}>Build my day</button>
            <button className="btn-ghost py-3" onClick={() => go(true)}>✨ Surprise me</button>
          </div>
        </>}
      </motion.div>
    </motion.div>
  );
}

function Plans({ plans, openPlan, remove, leave, create, manual }: { plans: Itinerary[]; openPlan: (id: string) => void; remove: (id: string) => void; leave: (id: string) => void; create: () => void; manual: () => void }) {
  const [t, setT] = useState<"upcoming" | "active" | "past" | "shared">("upcoming"); const list = plans.filter((p) => (t === "shared" ? p.role && p.role !== "owner" : (p.status ?? "upcoming") === t && (!p.role || p.role === "owner" || true)));
  return (<div className="space-y-5"><div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Plans</h1><div className="flex gap-2"><button className="btn-ghost" onClick={manual}>+ Blank</button><button className="btn-primary" onClick={create}>✨ AI plan</button></div></div>
    <div className="flex gap-2">{(["upcoming", "active", "past", "shared"] as const).map((x) => <Chip key={x} on={t === x} onClick={() => setT(x)}>{x === "past" ? "Previous plans" : x === "shared" ? "shared with me" : x}</Chip>)}</div>
    {list.length ? <div className="grid gap-3 sm:grid-cols-2">{list.map((p) => <div key={p.id} className="card p-5"><button className="w-full text-left" onClick={() => openPlan(p.id)}><div className="flex items-center justify-between gap-2"><b>{p.title}</b>{p.status === "past" && <Badge tone="ok">✓ Previous plan</Badge>}{p.role && p.role !== "owner" && <Badge tone="brand">{p.role}</Badge>}</div><p className="num mt-1 text-sm text-muted">{p.date} · {p.stops.length} stops · {won(p.totals.total)}{p.ownerName && p.role !== "owner" ? ` · by ${p.ownerName}` : ""}</p>{p.city && <p className="mt-1 text-xs text-muted">📍 {p.city.toUpperCase()}</p>}</button>{!p.role || p.role === "owner" ? <button className="mt-2 text-xs text-bad" onClick={() => confirm("Delete this plan?") && remove(p.id)}>Delete</button> : <button className="mt-2 text-xs text-bad" onClick={() => confirm("Leave this shared plan?") && leave(p.id)}>Leave</button>}</div>)}</div>
      : <div className="card p-10 text-center text-muted">{t === "past" ? "No previous plans yet. When you complete a date, it will be stored here." : `Nothing ${t} yet.`}<div className="mt-3"><button className="btn-primary" onClick={create}>Plan my day</button></div></div>}</div>);
}

function Explore({ init, profile, plans, saved, onSave, onAdd }: { init: string; profile: Profile; plans: Itinerary[]; saved: Place[]; onSave: (p: Place) => void; onAdd: (p: Place, planId: string) => void }) {
  const [q, setQ] = useState("");
  const [exploreCity, setExploreCity] = useState("all");
  const [f, setF] = useState({ halal: init === "halal" || profile.diet.muslim, vegan: init === "vegan" || profile.diet.vegan, free: false, cat: ["restaurant", "cafe", "activity", "prayer"].includes(init) ? init : "" });
  const [res, setRes] = useState<{ places: (Place & { distanceKm: number })[]; total: number; demo: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Place | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dateflow_recent_searches");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentSearches(parsed);
      }
    } catch {}
  }, []);

  const saveRecent = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((x) => x.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
      try { localStorage.setItem("dateflow_recent_searches", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const removeRecent = (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((x) => x !== term);
      try { localStorage.setItem("dateflow_recent_searches", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try { localStorage.removeItem("dateflow_recent_searches"); } catch {}
  };

  useEffect(() => {
    const cityParam = exploreCity !== "all" ? `&city=${encodeURIComponent(exploreCity)}` : "";
    const id = setTimeout(() => {
      if (q.trim().length >= 2) {
        saveRecent(q.trim());
      }
      api(`/api/places?q=${encodeURIComponent(q)}${cityParam}&halal=${f.halal ? 1 : 0}&vegan=${f.vegan ? 1 : 0}&free=${f.free ? 1 : 0}&category=${f.cat}&page=${page}`)
        .then(setRes)
        .catch(() => setRes(null));
    }, 250);
    return () => clearTimeout(id);
  }, [q, exploreCity, f, page]);

  return (<div className="space-y-4"><h1 className="text-3xl font-bold">Explore</h1>
    <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) saveRecent(q.trim()); }}>
      <input
        className="input"
        placeholder="Try: halal steakhouse near Gangnam · cafe in Cheongju · cheap vegan dinner near Haeundae"
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(0); }}
      />
    </form>
    {recentSearches.length > 0 && (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted shrink-0 flex items-center gap-1">🕒 Recent:</span>
        {recentSearches.map((term) => (
          <span
            key={term}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/80 px-2.5 py-1 text-xs text-ink transition hover:border-brand"
          >
            <button
              type="button"
              className="hover:underline"
              onClick={() => { setQ(term); setPage(0); saveRecent(term); }}
            >
              {term}
            </button>
            <button
              type="button"
              className="text-muted hover:text-bad ml-0.5"
              onClick={(e) => { e.stopPropagation(); removeRecent(term); }}
              title="Remove"
            >
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          className="text-[11px] text-muted hover:text-ink underline ml-1"
          onClick={clearRecent}
        >
          Clear
        </button>
      </div>
    )}
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-muted shrink-0 text-xs">City:</span>
        <Chip on={exploreCity === "all"} onClick={() => { setExploreCity("all"); setPage(0); }}>All Korea</Chip>
        {CITIES.filter((c) => c.id !== "other").map((c) => (
          <Chip key={c.id} on={exploreCity === c.id} onClick={() => { setExploreCity(c.id); setPage(0); }}>
            {c.emoji} {c.name}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip on={f.halal} onClick={() => setF({ ...f, halal: !f.halal })}>Halal</Chip>
        <Chip on={f.vegan} onClick={() => setF({ ...f, vegan: !f.vegan })}>Vegan</Chip>
        <Chip on={f.free} onClick={() => setF({ ...f, free: !f.free })}>Free</Chip>
        {["", "restaurant", "cafe", "activity", "park", "museum", "shop", "prayer"].map((c) => <Chip key={c} on={f.cat === c} onClick={() => { setF({ ...f, cat: c }); setPage(0); }}>{c || "All"}</Chip>)}
      </div>
    </div>
    {res?.demo && <p className="text-xs text-warn">Demo data — fictional venues for development.</p>}
    {res && !res.places.length && <div className="card p-8 text-center text-muted">No verified places match. Try fewer filters.</div>}
    <div className="grid gap-3 sm:grid-cols-2">{res?.places.map((p) => (<div key={p.id} className="card p-4"><button className="w-full text-left" onClick={() => setSel(sel?.id === p.id ? null : p)}><div className="flex justify-between"><b>{p.name}</b><span className="text-xs text-muted">★ {p.rating?.toFixed(1)}</span></div><p className="text-xs text-muted">{p.nameKo} · {p.category} · {p.area} · {p.distanceKm} km from {exploreCity !== "all" ? getCityById(exploreCity).name : "Seoul"} Stn</p>
      <p className="num mt-1 text-sm font-semibold">{p.priceMax ? `${won(p.priceMin)}–${won(p.priceMax)} / person` : "Free"} <span className="text-[11px] font-normal text-muted">(estimated)</span></p>
      <div className="mt-1 flex flex-wrap gap-1">{["restaurant", "market"].includes(p.category) && <Badge tone={p.halal === "unverified" ? "muted" : "ok"}>{HALAL_LABEL[p.halal]}</Badge>}{p.category === "prayer" && <Badge tone="brand">Prayer space</Badge>}{p.vegan !== "none" && <Badge tone="ok">{p.vegan === "full" ? "Vegan" : "Vegan options"}</Badge>}<Badge>{p.source}</Badge>{(p as any).openReports > 0 && <Badge tone="warn">{(p as any).openReports} report(s) of outdated info</Badge>}</div></button>
      {sel?.id === p.id && <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs text-muted"><p>📍 {p.address} · {p.open}–{p.close} · {p.accessible ? "Accessible" : "Limited access"} · Updated {p.updated}</p>
        <div className="flex flex-wrap gap-2">
          <ReportButton placeId={p.id} />
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => onSave(p)}>{saved.some((x) => x.id === p.id) ? "★ Saved" : "☆ Save"}</button>
          <a className="btn-ghost !px-3 !py-1 text-xs" target="_blank" rel="noreferrer" href={getGoogleMapsUrl(p, exploreCity !== "all" ? exploreCity : undefined)}>Google Maps ↗</a>
          <a className="btn-primary !px-3 !py-1 !bg-[#03c75a] text-white text-xs font-semibold" target="_blank" rel="noreferrer" href={getNaverMapUrl(p)}>Navigate (Naver Map) ↗</a>
          {plans.filter((x) => x.status !== "past").slice(0, 3).map((pl) => <button key={pl.id} className="btn-primary !px-3 !py-1" onClick={() => onAdd(p, pl.id)}>Add to “{pl.title}”</button>)}</div>{!plans.length && <p>Create a plan first to add places.</p>}</div>}</div>))}</div>
    {res && res.total > 12 && <div className="flex gap-2"><button className="btn-ghost" disabled={!page} onClick={() => setPage(page - 1)}>Prev</button><button className="btn-ghost" disabled={(page + 1) * 12 >= res.total} onClick={() => setPage(page + 1)}>Next</button></div>}</div>);
}

function MapTab({ plan, saved, naverId }: { plan?: Itinerary; saved: Place[]; naverId?: string | null }) {
  return (<div className="space-y-4"><h1 className="text-3xl font-bold">Map</h1>{plan ? <>
    <p className="text-muted">{plan.title} — {plan.stops.length} stops {plan.city ? `(${plan.city.toUpperCase()})` : ""}</p>
    <MapView stops={plan.stops} extra={saved.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name }))} naverId={naverId} height={460} />
    <div className="mt-4 space-y-2">
      <h2 className="text-sm font-semibold">Stops & Navigation</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {plan.stops.map((s, i) => (
          <div key={s.uid} className="card p-3 flex items-center justify-between gap-2 text-xs">
            <div>
              <div className="font-semibold text-ink">{i + 1}. {s.place.name}</div>
              <div className="text-muted">{s.place.nameKo} · {s.place.area}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a className="btn-ghost !px-2 !py-0.5 text-xs" target="_blank" rel="noreferrer" href={getGoogleMapsUrl(s.place, plan.city)}>Google Maps ↗</a>
              <a className="btn-primary !px-2 !py-0.5 !bg-[#03c75a] text-white text-xs font-semibold" target="_blank" rel="noreferrer" href={getNaverMapUrl(s.place)}>Navigate ↗</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  </> : <div className="card p-10 text-center text-muted">Create a plan to see its route here.</div>}
    {saved.length > 0 && <p className="text-sm text-muted">Grey dots: your {saved.length} saved places.</p>}</div>);
}

function ProfileTab({ s, profile, setProfile, update, logout, reload }: { s: ReturnType<typeof useStore>["s"]; profile: Profile; setProfile: (p: Profile) => void; update: (f: (p: any) => any) => void; logout: () => void; reload: () => Promise<void> }) {
  const d = (k: keyof Profile["diet"], v: boolean) => setProfile({ ...profile, diet: { ...profile.diet, [k]: v } });
  const [budget, setBudget] = useState(String(profile.defaultBudget ?? ""));
  const exportData = async () => { const d = await api("/api/auth/export"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" })); a.download = "dateflow-export.json"; a.click(); };
  return (<div className="space-y-5"><h1 className="text-3xl font-bold">Profile</h1>
    <section className="card p-5"><p className="font-semibold">{profile.name}</p><p className="text-sm text-muted">{profile.email}</p></section>
    <section className="card p-5"><h2 className="font-semibold">Dietary</h2><div className="mt-2 divide-y divide-line">
      <Toggle on={profile.diet.muslim} set={(v) => d("muslim", v)} label="Muslim / Halal" hint="Halal filtering + prayer features" /><Toggle on={profile.diet.vegan} set={(v) => d("vegan", v)} label="Vegan" /><Toggle on={profile.diet.vegetarian} set={(v) => d("vegetarian", v)} label="Vegetarian" /><Toggle on={profile.diet.noPork} set={(v) => d("noPork", v)} label="No pork" /><Toggle on={profile.diet.noAlcohol} set={(v) => d("noAlcohol", v)} label="No alcohol" />
      {profile.diet.muslim && <Toggle on={profile.prayerAware} set={(v) => setProfile({ ...profile, prayerAware: v })} label="Prayer-aware planning" />}</div></section>
    <section className="card p-5"><h2 className="font-semibold">Planning</h2><p className="mt-3 text-xs text-muted">Default budget (₩)</p><input className="input mt-1" inputMode="numeric" value={budget} onChange={(e) => { setBudget(e.target.value.replace(/\D/g, "")); setProfile({ ...profile, defaultBudget: Number(e.target.value.replace(/\D/g, "")) || null }); }} />
      <p className="mt-3 text-xs text-muted">Mobility</p><div className="mt-1 flex flex-wrap gap-2">{(["normal", "less", "avoid_long", "wheelchair"] as const).map((m) => <Chip key={m} on={profile.mobility === m} onClick={() => setProfile({ ...profile, mobility: m })}>{m.replace("_", " ")}</Chip>)}</div>
      <p className="mt-3 text-xs text-muted">Transport</p><div className="mt-1 flex flex-wrap gap-2">{(["transit", "taxi", "walk", "car"] as const).map((m) => <Chip key={m} on={profile.transport === m} onClick={() => setProfile({ ...profile, transport: m })}>{m}</Chip>)}</div>
      <p className="mt-3 text-xs text-muted">Pace</p><div className="mt-1 flex gap-2">{(["fast", "normal", "relaxed"] as const).map((m) => <Chip key={m} on={profile.pace === m} onClick={() => setProfile({ ...profile, pace: m })}>{m}</Chip>)}</div></section>
    <section className="card p-5"><h2 className="font-semibold">{profile.lang === "ko" ? "언어 (Language)" : "Language"}</h2>
      <p className="mt-1 text-xs text-muted">{profile.lang === "ko" ? "앱 인터페이스 언어를 한국어 또는 영어로 설정합니다." : "Choose Korean or English interface language."}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={`chip ${profile.lang !== "ko" ? "chip-on font-semibold" : ""}`}
          onClick={() => {
            setProfile({ ...profile, lang: "en" });
            try { localStorage.setItem("dateflow:lang", "en"); } catch {}
          }}
        >
          🇺🇸 English
        </button>
        <button
          type="button"
          className={`chip ${profile.lang === "ko" ? "chip-on font-semibold" : ""}`}
          onClick={() => {
            setProfile({ ...profile, lang: "ko" });
            try { localStorage.setItem("dateflow:lang", "ko"); } catch {}
          }}
        >
          🇰🇷 한국어
        </button>
      </div>
    </section>
    <section className="card p-5"><h2 className="font-semibold">Appearance</h2><div className="mt-2"><Toggle on={s.dark} set={(v) => update((x) => ({ ...x, dark: v }))} label="Dark mode" /></div><div className="mt-2 flex gap-2">{Object.entries(BRAND_COLORS).map(([n, c]) => <button key={n} aria-label={n} onClick={() => update((x) => ({ ...x, brand: n }))} className={`h-8 w-8 rounded-full border-2 ${s.brand === n ? "border-ink" : "border-transparent"}`} style={{ background: `rgb(${c})` }} />)}</div></section>
    <section className="card p-5"><h2 className="font-semibold">Notifications & privacy</h2><div className="divide-y divide-line"><Toggle on={profile.notifications} set={(v) => setProfile({ ...profile, notifications: v })} label="Useful notifications only" /><Toggle on={profile.consentSensitive} set={(v) => setProfile({ ...profile, consentSensitive: v })} label="Remember dietary/religious settings" hint="Saved encrypted on the server. Off = kept only for this session" /></div>
      {s.memories.length > 0 && <div className="mt-3 text-sm"><b>Memories</b><ul className="mt-1 list-disc pl-5 text-muted">{s.memories.map((m) => <li key={m}>{m}</li>)}</ul><button className="mt-1 text-xs text-bad" onClick={() => update((x) => ({ ...x, memories: [], history: [] }))}>Clear memories & history</button></div>}
      <div className="mt-4 flex flex-wrap gap-2"><button className="btn-ghost" onClick={exportData}>Export my data</button><button className="btn-ghost" onClick={logout}>Log out</button>
        <button className="btn-ghost !text-bad" onClick={async () => { if (confirm("Delete your account and all your data on the server? This cannot be undone.")) { await api("/api/auth/delete", {}); await reload(); } }}>Delete account</button></div></section></div>);
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Itinerary, Mode, Place, Profile, Stop } from "@/lib/types";
import { api } from "@/lib/client";
import { durLabel, fmt, openOK } from "@/lib/time";
import { won } from "@/lib/money";
import { HALAL_LABEL, dietaryOK } from "@/lib/diet";
import { mkItem, stripDerived } from "@/lib/engine/compute";
import { Badge, Spinner } from "./ui";
import { MapView } from "./MapView";
import { LiveBanner, ReportButton, ReserveControl, SharePanel } from "./Extras";
import { getGoogleMapsUrl, getNaverMapUrl } from "@/lib/maps";

const ICON: Record<string, string> = { walk: "🚶", subway: "🚇", bus: "🚌", taxi: "🚕" };
const CAT: Record<string, string> = { cafe: "☕", restaurant: "🍽", activity: "🎯", park: "🌳", shop: "🛍", museum: "🎨", prayer: "🕌", market: "🛒", night: "🌙", meetup: "📍" };
const BASIS: Record<string, string> = { estimated: "estimated", range: "range · estimated", user: "user entered", free: "free" };
const tone = (s: string) => (s === "green" ? "ok" : s === "yellow" ? "warn" : "bad") as "ok" | "warn" | "bad";
const Stars = ({ n }: { n: number }) => <span aria-label={`${n} of 5`} className="text-warn">{"★".repeat(n)}<span className="text-line">{"★".repeat(5 - n)}</span></span>;
export const priceLabel = (s: Stop) => (s.costBasis === "free" ? "Free" : s.costBasis === "range" && s.costRange ? `${won(s.costRange[0])}–${won(s.costRange[1])}` : won(s.cost));

interface Props { plan: Itinerary; profile: Profile; info: any; onUpdate: (p: Itinerary) => void; onBack: () => void; onFinish: (p: Itinerary) => void; track: (e: string) => void; feedback: Record<string, string>; setFeedback: (k: string, v: string) => void; saveMemory: (p: Itinerary) => void; onLeave: () => void }
export function PlanView({ plan, profile, info, onUpdate, onBack, onFinish, track, feedback, setFeedback, saveMemory, onLeave }: Props) {
  const [busy, setBusy] = useState(""); const [err, setErr] = useState(""); const [chat, setChat] = useState(""); const [log, setLog] = useState<string[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [q, setQ] = useState(""); const [found, setFound] = useState<Place[]>([]); const [ideas, setIdeas] = useState<Record<number, Place[]>>({});
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("dateflow_recent_searches") || "[]"); } catch { return []; }
  });
  const saveRecent = (term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try { localStorage.setItem("dateflow_recent_searches", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [delay, setDelay] = useState<any>(null); const [now, setNow] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }); const [late, setLate] = useState<any>(null);
  const diet = profile.diet; const active = plan.status === "active", past = plan.status === "past";
  const isOwner = !plan.role || plan.role === "owner"; const canEdit = !past && plan.role !== "viewer";
  const run = async (label: string, f: () => Promise<void>) => { setBusy(label); setErr(""); try { await f(); } catch (e: any) { setErr(e.message); } finally { setBusy(""); } };
  const mutate = (label: string, f: (i: ReturnType<typeof stripDerived>) => void, ev?: string) => !canEdit ? Promise.resolve() : run(label, async () => { const inp = structuredClone(stripDerived(plan)); f(inp); const r = await api("/api/recompute", { itinerary: inp, profile }); onUpdate(r.itinerary); if (ev) track(ev); });
  const idx = (uid: string) => plan.items.findIndex((i) => i.uid === uid);
  const tog = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const chatSend = (text: string) => { if (!text.trim()) return; setLog((l) => [...l, "You: " + text]); setChat("");
    run("chat", async () => { const r = await api("/api/edit", { itinerary: plan, profile, command: text }); if (r.changed) onUpdate(r.itinerary); setLog((l) => [...l, "✨ " + r.reply]); track("itinerary_created"); }); };
  const search = (t: string) => {
    setQ(t);
    if (t.trim().length >= 2) saveRecent(t);
    if (t.length < 2) return setFound([]);
    const cityParam = plan.city ? `&city=${encodeURIComponent(plan.city)}` : "";
    api(`/api/places?q=${encodeURIComponent(t)}${cityParam}`).then((r) => setFound(r.places)).catch(() => setFound([]));
  };
  const addPlace = (p: Place, at?: number) => mutate("add", (i) => { const it = mkItem(p); if (at == null) i.items.push(it); else i.items.splice(at, 0, it); }, "place_added");
  const findIdeas = async (g: Itinerary["gaps"][number]) => {
    const cats = ["cafe", "park", "museum", "shop", ...(diet.muslim ? ["prayer", "market"] : [])];
    const rs = await Promise.all(cats.map((c) => api(`/api/places?category=${c}`).then((r) => r.places as Place[])));
    const used = new Set(plan.stops.map((s) => s.place.id));
    setIdeas((p) => ({ ...p, [g.afterIndex]: rs.flat().filter((x) => !used.has(x.id) && x.stay + 25 <= g.minutes && dietaryOK(x, diet) && openOK(x.open, x.close, g.from + 15, x.stay)).slice(0, 4) }));
  };
  const curI = plan.stops.findIndex((s) => now >= s.arrive && now < s.leave);
  useEffect(() => { // owner-only: publish schedule status (never location) and evaluate notifications for the current clock
    if (!active || !isOwner) return;
    const nx = plan.stops[curI >= 0 ? curI + 1 : plan.stops.findIndex((s) => s.arrive > now)];
    const t = setTimeout(() => {
      api(`/api/plans/${plan.id}/eta`, { state: plan.health.state, current: plan.stops[curI]?.place.name, next: nx?.place.name, etaMin: nx?.leg?.expectedArrival ?? nx?.arrive }).catch(() => {});
      api("/api/monitor", { itineraryId: plan.id, now }).then((r) => { setDelay(r.live && r.report && r.report.severity !== "none" ? r.report : null); if (r.live && r.report?.severity !== "none") window.dispatchEvent(new Event("df:notify")); }).catch(() => {});
      api("/api/notifications", { itineraryId: plan.id, now }).then((r) => r.created?.length && window.dispatchEvent(new Event("df:notify"))).catch(() => {});
    }, 800); return () => clearTimeout(t);
  }, [active, isOwner, now, plan.updatedAt, plan.health.state]); // eslint-disable-line
  const cur = useMemo(() => plan.stops.findIndex((s) => now >= s.arrive && now < s.leave), [plan, now]);
  const nextI = cur >= 0 ? cur + 1 : plan.stops.findIndex((s) => s.arrive > now);
  const nextS = plan.stops[nextI]; const curS = plan.stops[cur];
  const bs = plan.budgetState; const pct = bs.limit ? Math.min(100, (bs.planned / bs.limit) * 100) : 0;
  const shareText = `${plan.title} — ${plan.date}\n` + plan.stops.map((s) => `${fmt(s.arrive)} ${s.place.name} (${priceLabel(s)})`).join("\n") + `\nTotal ${won(plan.totals.total)} · ${won(plan.totals.perPerson)}/person`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><button className="text-sm text-muted" onClick={onBack}>← Plans</button>
        <div className="flex gap-2"><button className="btn-ghost !py-1.5" onClick={() => { navigator.clipboard?.writeText(shareText); setLog((l) => [...l, "✓ Summary copied to clipboard"]); }}>Share</button>
          {!active && !past && isOwner && (
            <>
              <button className="btn-primary !py-1.5" onClick={() => { onUpdate({ ...plan, status: "active" }); track("route_viewed"); }}>▶ Start day</button>
              <button className="btn-ghost !py-1.5" onClick={() => onFinish(plan)}>✓ Save to previous plans</button>
            </>
          )}
          {active && isOwner && <button className="btn-primary !py-1.5 !bg-ok" onClick={() => onFinish(plan)}>✓ Finish day</button>}
          {past && <span className="rounded-xl bg-ok/10 px-3 py-1.5 text-xs font-semibold text-ok">✓ Previous plan</span>}</div></div>
      <div><h1 className="text-3xl font-bold">{plan.title}</h1>
        <p className="num mt-1 text-muted">{plan.date} · {fmt(plan.stops[0]?.arrive ?? plan.startTime)} → {fmt(plan.stops.at(-1)?.leave ?? plan.endTime)} · {plan.stops.length} stops · {plan.party} {plan.party === 1 ? "person" : "people"}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          {plan.city && <Badge tone="brand">📍 {plan.city.toUpperCase()}</Badge>}
          {plan.meetingPoint && <Badge tone="ok">Start: {plan.meetingPoint}</Badge>}
          {plan.endPoint && <Badge tone="ok">Finish: {plan.endPoint}</Badge>}
        </div></div>
      {plan.role && plan.role !== "owner" && <p className="rounded-xl bg-brand/10 p-3 text-sm">Shared by <b>{plan.ownerName}</b> · you are a <b>{plan.role}</b>{plan.role === "viewer" ? " (read-only)" : ""}.</p>}
      {!isOwner && <LiveBanner live={plan.live} owner={plan.ownerName} />}
      {err && <p className="card border-bad p-3 text-sm text-bad">{err}</p>}

      {active && (
        <section className="card border-brand p-5" aria-live="polite">
          <div className="flex items-center justify-between"><div className="text-xs font-semibold tracking-widest text-brand">NOW</div><Badge tone={tone(plan.health.state)}>{plan.health.state === "green" ? "On schedule" : plan.health.state === "yellow" ? "Getting tight" : "At risk"}</Badge></div>
          <div className="num mt-1 text-5xl font-bold">{fmt(now)}</div>
          <p className="mt-2 text-sm">{curS ? <>Current: <b>{CAT[curS.place.category]} {curS.place.name}</b> (until {fmt(curS.leave)})</> : nextS && now < nextS.arrive ? "Free time before your next stop" : "No active stop"}</p>
          {nextS && <p className="mt-1 text-sm">Next: <b>{CAT[nextS.place.category]} {nextS.place.name}</b> · leave in <b className="num">{Math.max(0, (nextS.leg?.departAt ?? nextS.arrive) - now)} min</b> · ETA <span className="num">{nextS.leg ? fmt(nextS.leg.expectedArrival) : fmt(nextS.arrive)}</span>{nextS.reservedAt != null && <> · Reservation <span className="num">{fmt(nextS.reservedAt)}</span></>}</p>}
          {nextS?.leg && <p className="mt-1 text-xs text-muted">{nextS.leg.liveNote}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn-primary !bg-bad" onClick={() => setLate({ minutes: 15 })}>🚨 I’m running late</button>
            <label className="flex items-center gap-2 text-xs text-muted">Demo clock<input type="range" min={plan.startTime - 30} max={plan.endTime + 30} value={now} onChange={(e) => setNow(Number(e.target.value))} /></label>
            <button className="text-xs text-muted underline" onClick={() => { const d = new Date(); setNow(d.getHours() * 60 + d.getMinutes()); }}>real time</button></div>
          {delay && !late && <div className="mt-4 rounded-xl border border-warn/50 bg-warn/10 p-4 text-sm"><p className="font-semibold">{delay.severity === "late" ? "⚠️ You may arrive late" : `⚠️ Your ${delay.mode} is ${delay.delayMin} min slower than planned`}</p>
            <p className="mt-1 text-muted">{delay.place}: {delay.plannedMin} → {delay.liveMin} min ({delay.source}). {delay.severity === "late" ? "New ETA is after your reservation." : "You may still be okay."}</p>
            <div className="mt-2 flex gap-2"><button className="btn-primary !py-1.5" onClick={() => setLate({ minutes: Math.max(5, delay.delayMin) })}>Replan</button><button className="btn-ghost !py-1.5" onClick={() => setDelay(null)}>Keep current route</button></div></div>}
          {late && <div className="mt-4 rounded-xl bg-bg p-4"><p className="text-sm font-semibold">How late are you?</p>
            <div className="mt-2 flex gap-2">{[5, 10, 15, 30].map((m) => <button key={m} className={`chip ${late.minutes === m ? "chip-on" : ""}`} onClick={() => setLate({ minutes: m })}>{m} min</button>)}
              <button className="btn-primary !py-1.5" disabled={!!busy} onClick={() => run("late", async () => { const r = await api("/api/replan", { itinerary: plan, profile, currentIndex: Math.max(0, cur), delayMin: late.minutes }); setLate({ minutes: late.minutes, r }); track("itinerary_replanned"); })}>{busy === "late" ? <Spinner /> : "Find solution"}</button></div>
            {late.r && <div className="mt-3 space-y-2 text-sm"><p className="font-semibold">⚠️ Your plan needs an update.</p>{late.r.messages.map((m: string) => <p key={m}>{m}</p>)}{late.r.applied.map((m: string) => <p key={m} className="text-muted">• {m}</p>)}
              <div className="num rounded-lg border border-line bg-surface p-3 text-xs">{late.r.itinerary.stops.map((s: Stop) => <div key={s.uid}>{fmt(s.arrive)} → {fmt(s.leave)} {s.place.name}</div>)}</div>
              <div className="flex gap-2"><button className="btn-primary !py-1.5" onClick={() => { onUpdate(late.r.itinerary); setLate(null); }}>Apply changes</button><button className="btn-ghost !py-1.5" onClick={() => setLate(null)}>Keep current plan</button></div></div>}</div>}
        </section>)}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5"><div className="flex items-baseline justify-between"><h2 className="font-semibold">Date health</h2><Badge tone={tone(plan.health.state)}>{plan.health.state}</Badge></div>
          <div className="num mt-2 text-4xl font-bold">{plan.health.score}%</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><motion.div className={`h-full ${plan.health.state === "green" ? "bg-ok" : plan.health.state === "yellow" ? "bg-warn" : "bg-bad"}`} animate={{ width: `${plan.health.score}%` }} /></div>
          <ul className="mt-3 space-y-1 text-sm">{plan.health.checks.map((c) => <li key={c.key}>{c.status === "ok" ? "✓" : c.status === "warn" ? "⚠️" : "✕"} {c.label}</li>)}</ul>
          <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-muted"><span>Romance <Stars n={plan.health.stars.romance} /></span><span>Travel comfort <Stars n={plan.health.stars.travel} /></span><span>Budget <Stars n={plan.health.stars.budget} /></span><span>Schedule <Stars n={plan.health.stars.schedule} /></span></div></section>
        <section className="card p-5"><h2 className="font-semibold">Budget & cost</h2>
          <div className="mt-2 flex items-end justify-between"><div><div className="num text-4xl font-bold">{won(plan.totals.total)}</div><div className="num text-sm text-muted">{won(plan.totals.perPerson)} / person</div></div>
            <div className="text-right text-xs text-muted"><div>Party size</div><div className="mt-1 flex items-center gap-2"><button className="btn-ghost !px-2.5 !py-0.5" onClick={() => plan.party > 1 && mutate("party", (i) => { i.party -= 1; }, "budget_changed")}>−</button><b className="num text-base text-ink">{plan.party}</b><button className="btn-ghost !px-2.5 !py-0.5" onClick={() => mutate("party", (i) => { i.party += 1; }, "budget_changed")}>+</button></div></div></div>
          <div className="mt-3 flex items-center gap-2 text-sm"><span className="text-muted">Budget</span>
            <select className="input !w-auto !py-1" value={plan.budget ?? ""} onChange={(e) => mutate("budget", (i) => { i.budget = e.target.value ? Number(e.target.value) : null; }, "budget_changed")}>{[["", "None"], ...[50000, 80000, 100000, 150000, 200000].map((b) => [String(b), won(b)]), ...(plan.budget && ![50000, 80000, 100000, 150000, 200000].includes(plan.budget) ? [[String(plan.budget), won(plan.budget)]] : [])].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <button className="text-xs text-brand underline" onClick={() => { const v = window.prompt("Custom budget (₩)", String(plan.budget ?? 100000)); const n = Number((v ?? "").replace(/\D/g, "")); if (n) mutate("budget", (i) => { i.budget = n; }, "budget_changed"); }}>custom</button></div>
          {bs.limit != null && <><div className="mt-3 h-2 overflow-hidden rounded-full bg-line"><motion.div className={`h-full ${bs.over ? "bg-bad" : "bg-brand"}`} animate={{ width: `${pct}%` }} /></div>
            <p className="num mt-1 text-sm">{bs.over ? <span className="text-bad">🔴 {won(bs.over)} over budget</span> : <>Remaining <b>{won(bs.remaining!)}</b></>}</p></>}
          <div className="num mt-3 grid grid-cols-3 gap-2 text-xs text-muted">{([["Food", plan.totals.food], ["Transport", plan.totals.transport], ["Activities", plan.totals.activities], ["Shopping", plan.totals.shopping], ["Other", plan.totals.other]] as const).map(([l, v]) => <div key={l}>{l}<div className="text-sm font-semibold text-ink">{won(v)}</div></div>)}</div>
          {canEdit && bs.limit != null && <button className="btn-ghost mt-3 !py-1.5" disabled={!!busy} onClick={() => run("opt", async () => { const r = await api("/api/optimize", { itinerary: plan, profile }); if (r.changes.length) onUpdate(r.itinerary); setLog((l) => [...l, r.changes.length ? "💸 " + r.changes.map((c: any) => `${c.from} → ${c.to} (save ${won(c.saving)})`).join("; ") : "No cheaper verified alternatives that keep your preferences."]); track("budget_changed"); })}>{busy === "opt" ? <Spinner /> : "Optimize budget"}</button>}</section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="lg:sticky lg:top-4 lg:self-start"><MapView stops={plan.stops} naverId={info?.naverMapClientId} activeIndex={cur} height={380} />
          <p className="mt-1 text-xs text-muted">{info?.naverMapClientId ? "NAVER map" : "Built-in map (set NEXT_PUBLIC_NAVER_MAP_CLIENT_ID for NAVER)"} · {plan.stats.km} km · avg buffer {plan.stats.avgBuffer} min</p></div>
        <section>
          <ol className="relative space-y-0">
            {plan.stops.map((s, i) => (
              <li key={s.uid}>
                {s.leg && (<div className="ml-5 border-l-2 border-dashed border-line py-3 pl-6"><button className="text-left text-sm text-muted" onClick={() => tog("leg" + s.uid)}>
                  <span>{ICON[s.leg.mode]} {s.leg.walkMin ? `${s.leg.walkMin}m walk` : ""}{s.leg.rideMin ? ` + ${s.leg.rideMin}m ${s.leg.mode}` : ""} · <b className="num text-ink">{durLabel(s.leg.moveMin)}</b> · ₩{s.leg.cost.toLocaleString()} · buffer {s.leg.bufferMin}m</span> <span aria-hidden>{open.has("leg" + s.uid) ? "▴" : "▾"}</span></button>
                  <AnimatePresence>{open.has("leg" + s.uid) && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="num mt-2 space-y-1 rounded-xl bg-bg p-3 text-xs">
                    <div>{s.place.name}: leave <b>{fmt(s.leg.departAt)}</b> · expected arrival <b>{fmt(s.leg.expectedArrival)}</b> · buffer <b>{s.leg.slack}m</b></div>
                    <div className="text-muted">{s.leg.liveNote} · {s.leg.source}</div>
                    {s.leg.alternatives.map((a) => (<button key={a.mode} onClick={() => mutate("route", (inp) => { const k = idx(s.uid); inp.items[k].routeMode = a.mode as Mode; }, "route_viewed")} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 ${a.mode === s.leg!.mode ? "border-brand bg-brand/5" : "border-line"}`}><span>{ICON[a.mode]} {a.mode} · {a.totalMin} min</span><span>{a.costMax ? `${won(a.cost - 0)}~${won(a.costMax)}` : won(a.cost)}</span></button>))}</div></motion.div>)}</AnimatePresence></div>)}
                <motion.div layout className={`card p-4 ${i === cur ? "border-brand" : ""}`}>
                  <div className="flex items-start gap-3"><div className="num w-14 shrink-0 text-lg font-bold">{fmt(s.arrive)}</div>
                    <div className="min-w-0 flex-1"><button className="text-left" onClick={() => tog(s.uid)}><div className="font-semibold">{CAT[s.place.category]} {s.place.name}</div><div className="text-xs text-muted">{s.place.nameKo} · {s.place.category} · {durLabel(s.duration)}</div></button>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="num font-semibold">{priceLabel(s)}</span><span className="text-[11px] text-muted">({BASIS[s.costBasis]})</span>
                        {["restaurant", "market"].includes(s.place.category) && <Badge tone={s.place.halal === "unverified" ? "muted" : s.place.halal === "user_reported" ? "warn" : "ok"}>{HALAL_LABEL[s.place.halal]}</Badge>}
                        {s.place.vegan !== "none" && <Badge tone="ok">{s.place.vegan === "full" ? "Vegan" : "Vegan options"}</Badge>}
                        <Badge tone={s.reserved ? "ok" : "muted"}>{s.reserved ? (s.item.reservationCode ? `✓ Reserved${s.item.reservationDemo ? " (demo booking)" : ""}` : "✓ Marked as booked (by you)") : "Planned"}</Badge>
                        {i === 0 && (plan.meetingPoint || s.place.category === "meetup") && <Badge tone="brand">🤝 Meeting point</Badge>}
                        {i === plan.stops.length - 1 && plan.stops.length > 1 && (plan.endPoint || s.place.tags?.includes("farewell") || s.place.tags?.includes("end")) && <Badge tone="ok">🏁 End of date</Badge>}
                        <Badge>{s.place.source}</Badge></div>
                      {s.warnings.map((w) => <p key={w} className="mt-1 text-xs text-warn">⚠️ {w}</p>)}</div></div>
                  {open.has(s.uid) && (<div className="mt-3 space-y-2 border-t border-line pt-3 text-xs text-muted"><p>📍 {s.place.address} · Hours {s.place.open}–{s.place.close} · {s.place.indoor ? "Indoor" : "Outdoor"} · {s.place.accessible ? "Accessible" : "Stairs / limited access"} · Updated {s.place.updated}</p>
                    {canEdit && (<div className="flex flex-wrap gap-2">
                      <button className="btn-ghost !px-3 !py-1" disabled={i === 0} onClick={() => mutate("move", (inp) => { const k = idx(s.uid); [inp.items[k - 1], inp.items[k]] = [inp.items[k], inp.items[k - 1]]; })}>↑</button>
                      <button className="btn-ghost !px-3 !py-1" disabled={i === plan.stops.length - 1} onClick={() => mutate("move", (inp) => { const k = idx(s.uid); [inp.items[k + 1], inp.items[k]] = [inp.items[k], inp.items[k + 1]]; })}>↓</button>
                      <button className="btn-ghost !px-3 !py-1" onClick={() => mutate("dur", (inp) => { const it = inp.items[idx(s.uid)]; it.duration = Math.max(15, it.duration - 15); it.minDuration = Math.min(it.minDuration, it.duration); })}>−15m</button>
                      <button className="btn-ghost !px-3 !py-1" onClick={() => mutate("dur", (inp) => { inp.items[idx(s.uid)].duration += 15; })}>+15m</button>
                      <button className="btn-ghost !px-3 !py-1" onClick={() => { const v = window.prompt("Your price for the whole party (₩)", String(s.cost)); const n = Number((v ?? "").replace(/\D/g, "")); if (v !== null) mutate("price", (inp) => { inp.items[idx(s.uid)].userPrice = n; }, "budget_changed"); }}>Set price</button>
                      <ReserveControl plan={plan} stop={s} canEdit={canEdit} apply={(p) => { onUpdate(p); track("reservation_started"); }} manual={() => mutate("res", (inp) => { const it = inp.items[idx(s.uid)]; it.reserved = !it.reserved; it.reservedAt = it.reserved ? s.arrive : undefined; it.reservationCode = undefined; }, "reservation_started")} />
                      <a className="btn-ghost !px-3 !py-1 text-xs" target="_blank" rel="noreferrer" href={getGoogleMapsUrl(s.place, plan.city)}>Google Maps ↗</a>
                      <a className="btn-primary !px-3 !py-1 !bg-[#03c75a] text-white text-xs font-semibold" target="_blank" rel="noreferrer" href={getNaverMapUrl(s.place)}>Navigate (Naver Map) ↗</a>
                      <button className="btn-ghost !px-3 !py-1 !text-bad" onClick={() => mutate("rm", (inp) => { inp.items.splice(idx(s.uid), 1); })}>Remove</button></div>)}<div><ReportButton placeId={s.place.id} /></div></div>)}
                  {past && (<div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-sm"><span className="text-xs text-muted">How was it?</span>{[["❤️", "loved"], ["🙂", "good"], ["😐", "okay"], ["👎", "no"]].map(([e, v]) => <button key={v} aria-label={v} className={`chip ${feedback[s.place.id] === v ? "chip-on" : ""}`} onClick={() => { setFeedback(s.place.id, v); if (v === "no") track("recommendation_rejected"); }}>{e}</button>)}</div>)}
                </motion.div>
                {plan.gaps.filter((g) => g.afterIndex === i).map((g) => (<div key={g.from} className="my-3 ml-5 rounded-xl border border-dashed border-brand/50 bg-brand/5 p-3 text-sm"><b className="num">{durLabel(g.minutes)}</b> free ({fmt(g.from)}–{fmt(g.to)}) <button className="ml-2 text-brand underline" onClick={() => findIdeas(g)}>Find ideas</button>
                  {ideas[g.afterIndex] && (ideas[g.afterIndex].length ? <div className="mt-2 space-y-1">{ideas[g.afterIndex].map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-2"><span>{CAT[p.category]} {p.name} <span className="text-xs text-muted">{durLabel(p.stay)}</span></span><div className="flex items-center gap-1.5"><a className="btn-ghost !px-2.5 !py-0.5 text-xs" target="_blank" rel="noreferrer" href={getGoogleMapsUrl(p, plan.city)}>Google Maps ↗</a><a className="btn-ghost !px-2.5 !py-0.5 !text-[#03c75a] text-xs font-semibold" target="_blank" rel="noreferrer" href={getNaverMapUrl(p)}>Navigate ↗</a><button className="btn-primary !px-3 !py-1" onClick={() => addPlace(p, i + 1)}>Add</button></div></div>)}</div> : <p className="mt-1 text-xs text-muted">I couldn’t verify a suitable place for this gap.</p>)}</div>))}
              </li>))}
          </ol>
          {!plan.stops.length && <div className="card p-8 text-center text-muted">No stops yet. Search below or ask the AI.</div>}
          {canEdit && (
            <div className="card mt-4 p-4">
              <input className="input" placeholder="🔎 Add a place (e.g. cafe, halal, vegan, museum…)" value={q} onChange={(e) => search(e.target.value)} />
              {recentSearches.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-muted shrink-0 text-xs">Recent:</span>
                  {recentSearches.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-surface border border-line px-2.5 py-0.5 text-xs text-ink hover:border-brand cursor-pointer shrink-0">
                      <button type="button" onClick={() => search(s)}>
                        🕒 {s}
                      </button>
                      <button
                        type="button"
                        className="text-muted hover:text-bad ml-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecentSearches((prev) => {
                            const next = prev.filter((x) => x !== s);
                            try { localStorage.setItem("dateflow_recent_searches", JSON.stringify(next)); } catch {}
                            return next;
                          });
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="text-muted hover:text-bad text-[11px] underline ml-1 shrink-0"
                    onClick={() => {
                      setRecentSearches([]);
                      try { localStorage.removeItem("dateflow_recent_searches"); } catch {}
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
              {found.length > 0 && (
                <div className="mt-2 max-h-60 space-y-1 overflow-auto">
                  {found.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-2 hover:bg-bg">
                      <span className="text-sm">
                        {CAT[p.category]} {p.name} <span className="text-xs text-muted">· {won(p.priceMin)}–{won(p.priceMax)}/p · {HALAL_LABEL[p.halal]}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <a className="btn-ghost !px-2.5 !py-0.5 text-xs" target="_blank" rel="noreferrer" href={getGoogleMapsUrl(p, plan.city)}>Google Maps ↗</a>
                        <a className="btn-ghost !px-2.5 !py-0.5 !text-[#03c75a] text-xs font-semibold" target="_blank" rel="noreferrer" href={getNaverMapUrl(p)}>Navigate ↗</a>
                        <button className="btn-ghost !px-3 !py-1" onClick={() => { addPlace(p); setQ(""); setFound([]); }}>Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {canEdit && (<section className="card p-5"><h2 className="font-semibold">✨ Edit with AI</h2><div className="mt-2 flex flex-wrap gap-2">{["Cheaper", "Less walking", "More romantic", "Add a halal restaurant", "Add shopping", "Remove the museum", "Make the evening more exciting", "Stay around Hongdae", "We are tired"].map((c) => <button key={c} className="chip" onClick={() => chatSend(c)}>{c}</button>)}</div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); chatSend(chat); }}><input className="input" placeholder="Tell me what to change…" value={chat} onChange={(e) => setChat(e.target.value)} /><button className="btn-primary" disabled={!!busy}>{busy === "chat" ? <Spinner /> : "Send"}</button></form>
        {log.length > 0 && <div className="mt-3 space-y-1 text-sm">{log.slice(-6).map((l, i) => <p key={i} className={l.startsWith("You") ? "text-muted" : ""}>{l}</p>)}</div>}</section>)}

      <SharePanel plan={plan} onLeave={onLeave} />
      {past && (<Summary plan={plan} onSave={() => saveMemory(plan)} />)}
      {busy && busy !== "late" && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-bg shadow-lg md:bottom-6"><Spinner /> Recalculating…</div>}
    </div>);
}
function Summary({ plan, onSave }: { plan: Itinerary; onSave: () => void }) {
  const [saved, setSaved] = useState(false); const t = plan.totals;
  return (<section className="card p-6"><div className="text-xs font-semibold tracking-widest text-brand">❤️ YOUR DAY</div>
    <p className="num mt-2 text-2xl font-bold">{durLabel(plan.stats.totalMin)} · {plan.stops.length} places · {plan.stats.km} km</p>
    <div className="num mt-4 grid grid-cols-2 gap-2 text-sm"><span>Food {won(t.food)}</span><span>Transport {won(t.transport)}</span><span>Activities {won(t.activities)}</span><span>Shopping {won(t.shopping)}</span></div>
    <div className="num mt-3 border-t border-line pt-3 text-xl font-bold">TOTAL {won(t.total)} <span className="text-sm font-normal text-muted">· {won(t.perPerson)} / person</span></div>
    <ul className="mt-3 space-y-1 text-sm"><li>{plan.budgetState.over ? "✕ Over budget" : "✓ Stayed within budget"}</li><li>{plan.health.checks.find((c) => c.key === "diet")?.status === "ok" ? "✓ All dietary requirements satisfied" : "✕ A dietary requirement was not met"}</li><li>{plan.stops.some((s) => s.lateBy) ? "✕ A reservation was at risk" : "✓ No missed reservations"}</li><li>✓ {plan.stats.avgBuffer} min average buffer</li></ul>
    <button className="btn-primary mt-4" disabled={saved} onClick={() => { onSave(); setSaved(true); }}>{saved ? "Saved ✓" : "Save as memory"}</button></section>);
}

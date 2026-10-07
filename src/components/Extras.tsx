"use client";
import { useEffect, useRef, useState } from "react";
import type { Itinerary, LiveStatus, Role, Stop } from "@/lib/types";
import { api } from "@/lib/client";
import { fmt } from "@/lib/time";
import { Badge, Spinner } from "./ui";

/** Reserve flow: availability comes from the ReservationProvider; manual "booked elsewhere" stays available. */
export function ReserveControl({ plan, stop, canEdit, apply, manual }: { plan: Itinerary; stop: Stop; canEdit: boolean; apply: (p: Itinerary) => void; manual: () => void }) {
  const [slots, setSlots] = useState<{ time: string; available: boolean }[] | null>(null); const [info, setInfo] = useState(""); const [busy, setBusy] = useState(false);
  const call = async (action: string, time?: string) => { setBusy(true); setInfo(""); try {
    const r = await api("/api/reservations", { action, itineraryId: plan.id, stopUid: stop.uid, time });
    if (r.itinerary) { apply({ ...plan, ...r.itinerary }); setSlots(null); } else { setSlots(r.slots); if (!r.slots) setInfo(r.message); else setInfo(r.demo ? "Demo availability — not a real booking." : ""); }
  } catch (e: any) { setInfo(e.message); } finally { setBusy(false); } };
  if (!canEdit) return null;
  if (stop.reserved) return (<span className="inline-flex flex-wrap items-center gap-2"><Badge tone="ok">{stop.item.reservationCode ? `Code ${stop.item.reservationCode}${stop.item.reservationDemo ? " · demo" : ""}` : "Marked as booked"}</Badge>
    <button className="btn-ghost !px-3 !py-1" disabled={busy} onClick={() => (stop.item.reservationCode ? call("cancel") : manual())}>Cancel reservation</button></span>);
  if (!["restaurant", "activity"].includes(stop.place.category)) return <button className="btn-ghost !px-3 !py-1" onClick={manual}>Mark as booked</button>;
  return (<span className="inline-flex flex-col gap-2"><span className="flex gap-2"><button className="btn-ghost !px-3 !py-1" disabled={busy} onClick={() => call("slots")}>{busy ? <Spinner /> : "Reserve"}</button><button className="btn-ghost !px-3 !py-1" onClick={manual}>I booked elsewhere</button></span>
    {slots && <span className="flex max-w-xs flex-wrap gap-1">{slots.slice(0, 16).map((s) => <button key={s.time} disabled={!s.available || busy} className={`chip !px-2 !py-1 text-xs ${s.available ? "" : "line-through opacity-40"}`} onClick={() => call("book", s.time)}>{s.time}</button>)}</span>}
    {info && <span className="text-xs text-warn">{info}</span>}</span>);
}

export function SharePanel({ plan, onLeave }: { plan: Itinerary; onLeave: () => void }) {
  const role: Role = plan.role ?? "owner"; const manage = role === "owner" || role === "organizer";
  const [shares, setShares] = useState<{ email: string; role: string; etaSharing: number }[]>([]); const [email, setEmail] = useState(""); const [r, setR] = useState("viewer"); const [eta, setEta] = useState(false); const [err, setErr] = useState("");
  const load = () => manage && api(`/api/plans/${plan.id}/share`).then((x) => setShares(x.shares)).catch(() => {});
  useEffect(() => { load(); }, [plan.id]); // eslint-disable-line
  const add = async () => { setErr(""); try { await api(`/api/plans/${plan.id}/share`, { email, role: r, etaSharing: eta }); setEmail(""); load(); } catch (e: any) { setErr(e.message); } };
  const rm = async (em: string) => { await api(`/api/plans/${plan.id}/share?email=${encodeURIComponent(em)}`, undefined, "DELETE"); load(); };
  return (<section className="card p-5"><h2 className="font-semibold">Share this plan</h2>
    <p className="mt-1 text-xs text-muted">Shared people see the schedule, places, routes, costs, reservations and changes. They never see your location. Live ETA sharing shows only your schedule status, current/next stop name and an arrival time — and only to people you switch it on for.</p>
    {role !== "owner" && <p className="mt-2 text-sm">Your role: <b>{role}</b> · shared by {plan.ownerName} <button className="ml-2 text-xs text-bad underline" onClick={async () => { await api(`/api/plans/${plan.id}/share`, undefined, "DELETE"); onLeave(); }}>Leave plan</button></p>}
    {manage && <><div className="mt-3 flex flex-wrap gap-2"><input className="input !w-auto min-w-48 flex-1" type="email" placeholder="friend@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <select className="input !w-auto" value={r} onChange={(e) => setR(e.target.value)}><option value="viewer">Viewer</option><option value="editor">Editor</option>{role === "owner" && <option value="organizer">Organizer</option>}</select>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={eta} onChange={(e) => setEta(e.target.checked)} /> Live ETA</label><button className="btn-primary !py-2" onClick={add}>Invite</button></div>
      {err && <p className="mt-1 text-xs text-bad">{err}</p>}
      <ul className="mt-3 divide-y divide-line text-sm">{shares.map((s) => <li key={s.email} className="flex items-center justify-between py-2"><span>{s.email} <Badge>{s.role}</Badge>{s.etaSharing ? <Badge tone="brand">live ETA</Badge> : null}</span><button className="text-xs text-bad" onClick={() => rm(s.email)}>Remove</button></li>)}</ul></>}
  </section>);
}
export function LiveBanner({ live, owner }: { live?: LiveStatus | null; owner?: string }) {
  if (!live) return null;
  return (<div className="card border-brand p-4 text-sm" aria-live="polite"><b>{owner ?? "They"} — live status</b> <Badge tone={live.state === "green" ? "ok" : live.state === "yellow" ? "warn" : "bad"}>{live.state === "green" ? "On schedule" : live.state === "yellow" ? "Getting tight" : "Running late"}</Badge>
    <p className="mt-1 text-muted">{live.current ? `Now: ${live.current}. ` : ""}{live.next ? `Next: ${live.next}${live.etaMin != null ? ` · ETA ${fmt(live.etaMin)}` : ""}. ` : ""}Updated {new Date(live.updatedAt).toLocaleTimeString()}. No location is shared.</p></div>);
}
export function ReportButton({ placeId }: { placeId: string }) {
  const [open, setOpen] = useState(false); const [type, setType] = useState("halal"); const [note, setNote] = useState(""); const [msg, setMsg] = useState("");
  const send = async () => { try { await api("/api/reports", { placeId, type, note }); setMsg("Thanks — sent to our moderators."); setOpen(false); } catch (e: any) { setMsg(e.message); } };
  return (<span className="inline-flex flex-col gap-2"><button className="btn-ghost !px-3 !py-1" onClick={() => setOpen(!open)}>⚑ Report outdated info</button>
    {open && <span className="flex flex-wrap gap-2"><select className="input !w-auto !py-1" value={type} onChange={(e) => setType(e.target.value)}>{[["halal", "Halal info"], ["vegan", "Vegan info"], ["price", "Price"], ["hours", "Opening hours"], ["closed", "Closed"], ["other", "Other"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <input className="input !w-auto !py-1" placeholder="What's wrong?" value={note} onChange={(e) => setNote(e.target.value)} /><button className="btn-primary !px-3 !py-1" onClick={send}>Send</button></span>}
    {msg && <span className="text-xs text-muted">{msg}</span>}</span>);
}
export function Bell() {
  const [list, setList] = useState<any[]>([]); const [open, setOpen] = useState(false); const [seen] = useState(() => new Set<string>());
  const load = async () => { try { const r = (await api("/api/notifications")).notifications as any[];
    if (typeof Notification !== "undefined" && Notification.permission === "granted") r.filter((n) => !n.read && !seen.has(n.id)).forEach((n) => new Notification(n.title, { body: n.body }));
    r.forEach((n) => seen.add(n.id)); setList(r); } catch {} };
  useEffect(() => { load(); const h = () => load(); window.addEventListener("df:notify", h); const iv = setInterval(load, 60000); return () => { window.removeEventListener("df:notify", h); clearInterval(iv); }; }, []); // eslint-disable-line
  const unread = list.filter((n) => !n.read).length;
  return (<div className="relative"><button aria-label="Notifications" className="btn-ghost !px-3 !py-1.5" onClick={() => { setOpen(!open); if (!open && unread) api("/api/notifications", {}, "PATCH").then(() => setList((l) => l.map((n) => ({ ...n, read: 1 })))); }}>🔔{unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] text-white">{unread}</span>}</button>
    {open && <div className="card absolute right-0 z-30 mt-2 w-80 max-w-[85vw] p-3 shadow-xl"><div className="mb-2 flex justify-between text-xs"><b>Notifications</b>{typeof Notification !== "undefined" && Notification.permission === "default" && <button className="text-brand underline" onClick={() => Notification.requestPermission()}>Enable browser alerts</button>}</div>
      {list.length ? <ul className="max-h-80 space-y-2 overflow-auto text-sm">{list.map((n) => <li key={n.id} className="rounded-lg bg-bg p-2"><b>{n.title}</b><div className="text-xs text-muted">{n.body}</div></li>)}</ul> : <p className="text-sm text-muted">Nothing yet. You’ll only hear from us when it matters.</p>}</div>}</div>);
}

export function LanguageToggle({
  lang = "en",
  onChange,
}: {
  lang?: "en" | "ko";
  onChange: (l: "en" | "ko") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLang = lang === "ko" ? "ko" : "en";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Change language (Korean / English)"
        title="Change language / 언어 변경"
        className="btn-ghost !px-2.5 !py-1.5 flex items-center gap-1.5 text-xs font-medium"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm leading-none" role="img" aria-label="globe">🌐</span>
        <span className="font-semibold">{currentLang === "ko" ? "한국어" : "English"}</span>
        <span className="text-[10px] text-muted">▾</span>
      </button>

      {open && (
        <div className="card absolute right-0 z-40 mt-1.5 w-36 overflow-hidden p-1 shadow-xl border border-line bg-surface">
          <button
            type="button"
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
              currentLang === "en" ? "bg-brand/10 text-brand font-bold" : "text-ink hover:bg-line/40"
            }`}
            onClick={() => {
              onChange("en");
              setOpen(false);
            }}
          >
            <span className="text-sm leading-none">🇺🇸</span>
            <span>English</span>
            {currentLang === "en" && <span className="ml-auto text-brand text-xs font-bold">✓</span>}
          </button>
          <button
            type="button"
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
              currentLang === "ko" ? "bg-brand/10 text-brand font-bold" : "text-ink hover:bg-line/40"
            }`}
            onClick={() => {
              onChange("ko");
              setOpen(false);
            }}
          >
            <span className="text-sm leading-none">🇰🇷</span>
            <span>한국어</span>
            {currentLang === "ko" && <span className="ml-auto text-brand text-xs font-bold">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}


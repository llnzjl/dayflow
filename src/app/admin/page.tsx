"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function Admin() {
  const [st, setSt] = useState<any>(null); const [reports, setReports] = useState<any[]>([]); const [err, setErr] = useState(""); const [tab, setTab] = useState("open");
  const load = (t = tab) => Promise.all([api("/api/admin/stats"), api(`/api/reports?status=${t}`)]).then(([a, b]) => { setSt(a); setReports(b.reports); setErr(""); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [tab]); // eslint-disable-line
  const act = async (r: any, status: string, halalOverride?: string) => { const resolution = window.prompt("Resolution note", "") ?? ""; await api("/api/reports", { id: r.id, status, resolution, halalOverride }, "PATCH"); load(); };
  if (err) return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Admin</h1><p className="mt-3 text-bad">{err}</p><p className="mt-2 text-sm text-muted">Log in on the main page with an email listed in ADMIN_EMAILS, then reopen /admin.</p></main>;
  if (!st) return <main className="p-8">Loading…</main>;
  return (<main className="mx-auto max-w-4xl space-y-6 p-6"><h1 className="text-3xl font-bold">DateFlow Admin</h1>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Users", st.users], ["Plans", st.plans], ["Shares", st.shares], ["Open reports", st.openReports], ["Reservations", st.reservations], ["AI actions 30d", st.aiActions30d]].map(([l, v]) => <div key={l as string} className="card p-4"><div className="text-xs text-muted">{l}</div><div className="num text-2xl font-bold">{v}</div></div>)}</div>
    <section className="card p-5"><h2 className="font-semibold">Providers</h2><ul className="mt-2 text-sm text-muted">{Object.entries(st.providers).map(([k, v]) => <li key={k}>{k}: <b className="text-ink">{String(v)}</b></li>)}</ul></section>
    <section className="card p-5"><h2 className="font-semibold">Events (30 days, anonymous)</h2><ul className="num mt-2 text-sm">{st.events30d.map((e: any) => <li key={e.name}>{e.name}: {e.c}</li>)}{!st.events30d.length && <li className="text-muted">No events yet</li>}</ul></section>
    <section className="card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Reports & halal verification</h2><div className="flex gap-2">{["open", "resolved", "dismissed"].map((t) => <button key={t} className={`chip ${tab === t ? "chip-on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div></div>
      <ul className="mt-3 divide-y divide-line text-sm">{reports.map((r) => <li key={r.id} className="py-3"><b>{r.place_name}</b> <span className="rounded-full bg-line px-2 py-0.5 text-xs">{r.type}</span> {r.override && <span className="text-xs text-warn">override: {r.override}</span>}<p className="text-muted">{r.note || "(no note)"}</p>{r.resolution && <p className="text-xs">Resolution: {r.resolution}</p>}
        {tab === "open" && <div className="mt-2 flex flex-wrap gap-2"><button className="btn-primary !px-3 !py-1" onClick={() => act(r, "resolved")}>Resolve</button>{r.type === "halal" && <button className="btn-ghost !px-3 !py-1" onClick={() => act(r, "resolved", "unverified")}>Resolve + set halal to “Unverified”</button>}<button className="btn-ghost !px-3 !py-1" onClick={() => act(r, "dismissed")}>Dismiss</button></div>}</li>)}
        {!reports.length && <li className="py-3 text-muted">Nothing here.</li>}</ul></section>
    {st.overrides.length > 0 && <section className="card p-5"><h2 className="font-semibold">Active halal overrides</h2><ul className="mt-2 text-sm">{st.overrides.map((o: any) => <li key={o.place_id}>{o.place_id} → <b>{o.halal}</b> {o.note && `(${o.note})`}</li>)}</ul></section>}</main>);
}

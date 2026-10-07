"use client";
import { useEffect, useRef, useState } from "react";
import type { Stop } from "@/lib/types";
import { fmt } from "@/lib/time";

type Pt = { lat: number; lng: number; name: string; label?: string };
declare global { interface Window { naver?: any } }
const MODE: Record<string, string> = { walk: "🚶", subway: "🚇", bus: "🚌", taxi: "🚕" };

/** Uses NAVER Dynamic Map when NEXT_PUBLIC_NAVER_MAP_CLIENT_ID is set; otherwise a built-in SVG map. */
export function MapView({ stops, extra = [], naverId, activeIndex, height = 320 }: { stops: Stop[]; extra?: Pt[]; naverId?: string | null; activeIndex?: number; height?: number }) {
  const pts: Pt[] = stops.map((s, i) => ({ lat: s.place.lat, lng: s.place.lng, name: s.place.name, label: String(i + 1) }));
  const all = [...pts, ...extra]; const ref = useRef<HTMLDivElement>(null); const [naverOK, setNaverOK] = useState(false);
  useEffect(() => {
    if (!naverId || !all.length) return; let dead = false;
    const init = () => { try {
      if (dead || !ref.current || !window.naver?.maps) return; const n = window.naver.maps;
      const map = new n.Map(ref.current, { center: new n.LatLng(all[0].lat, all[0].lng), zoom: 12 });
      const b = new n.LatLngBounds(); pts.forEach((p) => { const ll = new n.LatLng(p.lat, p.lng); b.extend(ll); new n.Marker({ map, position: ll, title: p.name, icon: { content: `<div style="background:#d94838;color:#fff;border-radius:99px;width:24px;height:24px;display:grid;place-items:center;font:600 12px sans-serif">${p.label}</div>` } }); });
      if (pts.length > 1) { new n.Polyline({ map, path: pts.map((p) => new n.LatLng(p.lat, p.lng)), strokeColor: "#d94838", strokeWeight: 4 }); map.fitBounds(b, { top: 30, left: 30, right: 30, bottom: 30 }); }
      setNaverOK(true); } catch { setNaverOK(false); } };
    if (window.naver?.maps) init(); else { const sc = document.createElement("script"); sc.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverId}`; sc.onload = init; sc.onerror = () => setNaverOK(false); document.head.appendChild(sc); }
    return () => { dead = true; };
  }, [naverId, JSON.stringify(all.map((p) => [p.lat, p.lng]))]); // eslint-disable-line
  if (naverId && naverOK !== undefined && all.length) return (<div className="relative"><div ref={ref} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-line" />{!naverOK && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading NAVER map…</div>}</div>);
  if (!all.length) return <div style={{ height }} className="card grid place-items-center text-sm text-muted">Add stops to see the map</div>;
  const la = all.map((p) => p.lat), ln = all.map((p) => p.lng); const [minA, maxA, minN, maxN] = [Math.min(...la), Math.max(...la), Math.min(...ln), Math.max(...ln)];
  const W = 600, H = 360, pad = 50; const x = (g: number) => pad + ((g - minN) / Math.max(1e-6, maxN - minN)) * (W - 2 * pad), y = (a: number) => H - pad - ((a - minA) / Math.max(1e-6, maxA - minA)) * (H - 2 * pad);
  return (
    <div className="card overflow-hidden" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Route map">
        <defs><pattern id="g" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="rgb(var(--line))" strokeWidth=".6" /></pattern></defs>
        <rect width={W} height={H} fill="url(#g)" />
        {pts.slice(1).map((p, i) => (<g key={i}><line x1={x(pts[i].lng)} y1={y(pts[i].lat)} x2={x(p.lng)} y2={y(p.lat)} stroke="rgb(var(--brand))" strokeWidth="3" strokeDasharray={stops[i + 1].leg?.mode === "walk" ? "2 6" : "0"} strokeLinecap="round" />
          <text x={(x(pts[i].lng) + x(p.lng)) / 2} y={(y(pts[i].lat) + y(p.lat)) / 2 - 6} fontSize="13" textAnchor="middle">{MODE[stops[i + 1].leg?.mode ?? "walk"]}</text></g>))}
        {extra.map((p, i) => (<g key={"e" + i}><circle cx={x(p.lng)} cy={y(p.lat)} r="6" fill="rgb(var(--muted))" opacity=".6" /><title>{p.name}</title></g>))}
        {pts.map((p, i) => (<g key={i}><circle cx={x(p.lng)} cy={y(p.lat)} r={i === activeIndex ? 16 : 13} fill="rgb(var(--brand))" /><text x={x(p.lng)} y={y(p.lat) + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{p.label}</text>
          <text x={x(p.lng)} y={y(p.lat) - 20} textAnchor="middle" fontSize="11" fill="rgb(var(--ink))">{p.name.length > 22 ? p.name.slice(0, 21) + "…" : p.name}</text>{stops[i] && <text x={x(p.lng)} y={y(p.lat) + 30} textAnchor="middle" fontSize="10" fill="rgb(var(--muted))">{fmt(stops[i].arrive)}</text>}</g>))}
      </svg>
    </div>);
}

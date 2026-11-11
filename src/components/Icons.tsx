import type { SVGProps } from "react";

const paths = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  sun: "M12 3V1 M12 23v-2 M3 12H1 M23 12h-2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  moon: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z",
  calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 M7 14h2 M15 14h2 M7 18h2",
  tasks: "M9 5h12 M9 12h12 M9 19h12 M2 5l2 2 3-4 M2 12l2 2 3-4 M2 19l2 2 3-4",
  sparkles: "m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z M20 2v4 M18 4h4",
  chart: "M4 3v17h17 M8 15v-4 M13 15V6 M18 15V9",
  settings: "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  compass: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M16 8l-3 5-5 3 3-5 5-3Z",
  map: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z M9 3v15 M15 6v15",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M15 15l6 6",
  plus: "M12 5v14 M5 12h14",
  close: "m6 6 12 12 M18 6 6 18",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  chevronLeft: "m15 5-7 7 7 7",
  check: "m5 12 4 4L19 6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2",
  pin: "M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0 M14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  panel: "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1 M9 3v18",
  focus: "M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  flag: "M5 21V3 M5 4c5-4 9 4 14 0v9c-5 4-9-4-14 0",
  trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  up: "M12 20V4 M6 10l6-6 6 6",
  down: "M12 4v16 M6 14l6 6 6-6",
  monitor: "M3 3h18v13H3z M12 16v5 M8 21h8",
  leaf: "M20 3C8 1 1 8 6 16c5 8 17 2 14-13Z M4 21 16 9",
  coffee: "M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8 M16 8h2a3 3 0 0 1 0 6h-2 M7 2v2 M12 2v2",
} satisfies Record<string, string>;
export type IconName = keyof typeof paths;
export function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return <span className="brand-logo"><svg width="32" height="34" viewBox="0 0 32 34" fill="none" aria-hidden="true"><path d="m7 4 9 0-7 12H0L7 4Z" fill="#B9A3FF" /><path d="m16 4 9 0-15 26H1L16 4Z" fill="#8B5CF6" /><path d="m24 12 8 0-10 18h-9l11-18Z" fill="#A78BFA" /></svg>{!compact && <span>DAYFLOW<span className="brand-dot">.</span></span>}</span>;
}
export function FallingLeaves() {
  return <div className="falling-leaves" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span className={`falling-leaf leaf-${i + 1}`} key={i}><svg viewBox="0 0 100 100" width={19 + (i % 3) * 4} height={19 + (i % 3) * 4}><path className="maple-blade" d="M50 92c-2-8-4-15-8-21-7 3-13 9-18 14l1-15-15 4 8-14-16-5 19-8-9-10 17 2-2-15 14 10L50 9l9 15 14-10-2 15 17-2-9 10 19 8-16 5 8 14-15-4 1 15c-5-5-11-11-18-14-4 6-6 13-8 21Z"/><path className="maple-vein" d="M50 90 50 14M50 57 27 40M50 67 76 48M50 74 33 68M50 57 70 34M50 75 66 70"/><path className="maple-stem" d="M50 90c1 4 2 7 4 10"/></svg></span>)}</div>;
}

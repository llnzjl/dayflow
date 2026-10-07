"use client";
import { motion, MotionConfig } from "framer-motion";
export const Chip = ({ on, onClick, children }: { on?: boolean; onClick?: () => void; children: React.ReactNode }) => (<button type="button" onClick={onClick} className={`chip ${on ? "chip-on" : ""}`}>{children}</button>);
export const Toggle = ({ on, set, label, hint }: { on: boolean; set: (v: boolean) => void; label: string; hint?: string }) => (
  <button type="button" onClick={() => set(!on)} className="flex w-full items-center justify-between gap-3 py-2 text-left">
    <span><span className="block text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
    <span className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${on ? "bg-brand" : "bg-line"}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`} /></span>
  </button>);
export const Fade = ({ children, k }: { children: React.ReactNode; k?: string }) => (<motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>{children}</motion.div>);
export const Motion = ({ children }: { children: React.ReactNode }) => <MotionConfig reducedMotion="user">{children}</MotionConfig>;
export const Badge = ({ tone = "muted", children }: { tone?: "ok" | "warn" | "bad" | "muted" | "brand"; children: React.ReactNode }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${{ ok: "bg-ok/15 text-ok", warn: "bg-warn/15 text-warn", bad: "bg-bad/15 text-bad", muted: "bg-line/60 text-muted", brand: "bg-brand/10 text-brand" }[tone]}`}>{children}</span>);
export const Spinner = () => <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="loading" />;

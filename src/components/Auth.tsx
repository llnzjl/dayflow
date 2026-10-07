"use client";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { api } from "@/lib/client";

export function Auth({ reload }: { reload: () => Promise<void> }) {
  const [mode, setMode] = useState<"welcome" | "signup" | "login" | "forgot" | "reset">("welcome");
  const [f, setF] = useState({ name: "", email: "", pw: "" }); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [token, setToken] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => { const t = new URLSearchParams(location.search).get("reset"); if (t) { setToken(t); setMode("reset"); } }, []);
  async function submit(kind: "signup" | "login" | "forgot" | "reset") {
    setErr(""); setMsg(""); setBusy(true);
    try {
      if (kind === "signup") { if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email) || f.pw.length < 8) throw new Error("Enter a name, a valid email and a password of 8+ characters."); await api("/api/auth/signup", { name: f.name, email: f.email, password: f.pw }); await reload(); }
      if (kind === "login") { await api("/api/auth/login", { email: f.email, password: f.pw }); await reload(); }
      if (kind === "forgot") { const r = await api("/api/auth/forgot", { email: f.email }); setMsg(r.message + (r.devLink ? " (Dev mode — no email server: open " + r.devLink + ")" : "")); }
      if (kind === "reset") { await api("/api/auth/reset", { token, password: f.pw }); history.replaceState({}, "", "/"); setMode("login"); setMsg("Password updated. Log in with your new password."); }
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  if (mode === "welcome") return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-12">
      <div><div className="text-sm font-semibold tracking-widest text-brand">{BRAND.name.toUpperCase()}</div>
        <h1 className="mt-6 text-4xl font-bold leading-tight">I don’t know what to do today.</h1>
        <p className="mt-4 text-lg text-muted">Tell {BRAND.name} a little about yourself. It builds a realistic day — real places, real routes, real costs — and fixes it when things change.</p></div>
      <div className="space-y-3"><button className="btn-primary w-full py-3.5 text-base" onClick={() => setMode("signup")}>✨ Get started</button><button className="btn-ghost w-full py-3.5" onClick={() => setMode("login")}>Log in</button></div>
    </main>);
  const title = { signup: "Create your account", login: "Welcome back", forgot: "Reset password", reset: "Choose a new password", welcome: "" }[mode];
  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-12">
      <button className="text-sm text-muted" onClick={() => { setMode("welcome"); setErr(""); setMsg(""); }}>← Back</button><h2 className="mt-6 text-3xl font-bold">{title}</h2>
      <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); submit(mode as any); }}>
        {mode === "signup" && <input className="input" placeholder="Name" value={f.name} onChange={(e) => set("name", e.target.value)} />}
        {mode !== "reset" && <input className="input" type="email" placeholder="Email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} />}
        {mode !== "forgot" && <input className="input" type="password" placeholder={mode === "reset" ? "New password (8+ characters)" : "Password (8+ characters)"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.pw} onChange={(e) => set("pw", e.target.value)} />}
        {err && <p className="text-sm text-bad">{err}</p>}{msg && <p className="break-all text-sm text-ok">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy}>{{ signup: "Continue", login: "Log in", forgot: "Send reset link", reset: "Update password", welcome: "" }[mode]}</button>
        {mode === "login" && <button type="button" className="w-full text-sm text-muted" onClick={() => setMode("forgot")}>Forgot password?</button>}
      </form></main>);
}

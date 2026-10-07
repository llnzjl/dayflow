"use client";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Profile } from "@/lib/types";
import { Chip, Fade, Toggle } from "./ui";

const INTERESTS = ["food", "coffee", "nature", "photography", "shopping", "art", "museums", "games", "scenic", "quiet", "history", "culture", "night", "entertainment"];
const DISLIKES = ["Too much walking", "Crowded places", "Expensive places", "Loud places", "Outdoor activities", "Long transportation", "Multiple transfers", "Stairs"];
const BUDGETS = [null, 50000, 100000, 150000, 200000];
export function Onboarding({ profile, done }: { profile: Profile; done: (p: Profile) => void }) {
  const [p, setP] = useState<Profile>(profile); const [step, setStep] = useState(0); const [custom, setCustom] = useState("");
  const tog = (k: "interests" | "dislikes", v: string) => setP((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((i) => i !== v) : [...x[k], v] }));
  const d = (k: keyof Profile["diet"], v: boolean) => setP((x) => ({ ...x, diet: { ...x.diet, [k]: v } }));
  const mode = p.diet.muslim ? "halal" : p.diet.vegan ? "vegan" : p.diet.vegetarian ? "veg" : "none";
  const setMode = (m: string) => setP((x) => ({ ...x, prayerAware: m === "halal" ? x.prayerAware : false, diet: { ...x.diet, muslim: m === "halal", vegan: m === "vegan", vegetarian: m === "veg", noPork: m === "halal" ? true : x.diet.noPork, noAlcohol: m === "halal" ? true : x.diet.noAlcohol } }));
  const steps = [
    <><h2 className="text-2xl font-bold">Let’s set you up</h2><p className="mt-1 text-muted">Hi {p.name.split(" ")[0]} — which language and currency?</p>
      <div className="mt-6 flex gap-2">{(["en", "ko"] as const).map((l) => <Chip key={l} on={p.lang === l} onClick={() => setP({ ...p, lang: l })}>{l === "en" ? "English" : "한국어"}</Chip>)}<Chip on>₩ KRW</Chip></div></>,
    <><h2 className="text-2xl font-bold">What should we consider when planning your day?</h2>
      <div className="mt-5 flex flex-wrap gap-2">{[["none", "No restriction"], ["halal", "Muslim / Halal"], ["veg", "Vegetarian"], ["vegan", "Vegan"]].map(([k, l]) => <Chip key={k} on={mode === k} onClick={() => setMode(k)}>{l}</Chip>)}</div>
      {mode === "halal" && <p className="mt-3 rounded-xl bg-brand/10 p-3 text-sm">Muslim mode also uses halal markets, mosques/prayer spaces and (optionally) prayer times. We never label a place halal unless a source says so.</p>}
      <div className="mt-5 flex flex-wrap gap-2">{([["noPork", "No pork"], ["noAlcohol", "No alcohol"]] as const).map(([k, l]) => <Chip key={k} on={p.diet[k]} onClick={() => d(k, !p.diet[k])}>{l}</Chip>)}</div>
      <input className="input mt-4" placeholder="Allergies / other (comma separated)" value={p.diet.allergies.join(", ")} onChange={(e) => setP({ ...p, diet: { ...p.diet, allergies: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } })} /></>,
    <><h2 className="text-2xl font-bold">What do you enjoy?</h2><div className="mt-4 flex flex-wrap gap-2">{INTERESTS.map((i) => <Chip key={i} on={p.interests.includes(i)} onClick={() => tog("interests", i)}>{i}</Chip>)}</div>
      <h3 className="mt-6 font-semibold">What do you dislike?</h3><div className="mt-3 flex flex-wrap gap-2">{DISLIKES.map((i) => <Chip key={i} on={p.dislikes.includes(i)} onClick={() => tog("dislikes", i)}>{i}</Chip>)}</div></>,
    <><h2 className="text-2xl font-bold">Getting around</h2>
      <div className="mt-4 flex flex-wrap gap-2">{([["normal", "Normal walking"], ["less", "Less walking"], ["avoid_long", "Avoid long walks"], ["wheelchair", "Wheelchair accessible"]] as const).map(([k, l]) => <Chip key={k} on={p.mobility === k} onClick={() => setP({ ...p, mobility: k })}>{l}</Chip>)}</div>
      <div className="mt-5 flex flex-wrap gap-2">{([["transit", "Public transport"], ["taxi", "Taxi"], ["walk", "Walking"], ["car", "Car"]] as const).map(([k, l]) => <Chip key={k} on={p.transport === k} onClick={() => setP({ ...p, transport: k })}>{l}</Chip>)}</div>
      <h3 className="mt-6 font-semibold">Schedule pace</h3><div className="mt-2 flex gap-2">{(["fast", "normal", "relaxed"] as const).map((k) => <Chip key={k} on={p.pace === k} onClick={() => setP({ ...p, pace: k })}>{k}</Chip>)}</div></>,
    <><h2 className="text-2xl font-bold">Default budget</h2><p className="mt-1 text-muted">Total for the whole day. You can change it per plan.</p>
      <div className="mt-4 flex flex-wrap gap-2">{BUDGETS.map((b) => <Chip key={String(b)} on={p.defaultBudget === b && !custom} onClick={() => { setCustom(""); setP({ ...p, defaultBudget: b }); }}>{b ? `₩${b.toLocaleString()}` : "No budget"}</Chip>)}</div>
      <input className="input mt-4" inputMode="numeric" placeholder="Custom amount (₩)" value={custom} onChange={(e) => { setCustom(e.target.value); const n = Number(e.target.value.replace(/\D/g, "")); if (n) setP({ ...p, defaultBudget: n }); }} /></>,
    <><h2 className="text-2xl font-bold">Privacy & permissions</h2>
      <div className="mt-4 divide-y divide-line">
        <Toggle on={p.consentSensitive} set={(v) => setP({ ...p, consentSensitive: v })} label="Save dietary / religious settings to my profile" hint="Encrypted on our server. If off, they apply to this session only and you will need to set them again next time. You can delete them any time." />
        {p.diet.muslim && <Toggle on={p.prayerAware} set={(v) => setP({ ...p, prayerAware: v })} label="Prayer-aware planning" hint="Adds prayer stops near Dhuhr/Asr and finds prayer spaces." />}
        <Toggle on={p.notifications} set={(v) => setP({ ...p, notifications: v })} label="Useful notifications only" hint="Leave-now, delays, rain on outdoor stops." /></div>
      <p className="mt-3 text-xs text-muted">Location is only requested when you use “near me”, never shared with others without your explicit permission.</p></>,
  ];
  const finish = () => done(p.consentSensitive ? p : { ...p, diet: { ...p.diet }, });
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <div className="flex gap-1.5">{steps.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />)}</div>
      <div className="flex-1 pt-8"><AnimatePresence mode="wait"><Fade k={String(step)}>{steps[step]}</Fade></AnimatePresence></div>
      <div className="flex gap-3 pt-6">{step > 0 && <button className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
        <button className="btn-primary flex-1" onClick={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}>{step === steps.length - 1 ? "Finish" : "Continue"}</button></div>
    </main>);
}

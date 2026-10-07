import type { Profile } from "../types";
import type { PlanRequest } from "./generate";
import { toMin } from "../time";
import { AREAS } from "../providers/demo-data";

export interface Intent {
  date?: string; area?: string; city?: string; meetingPoint?: string; endPoint?: string;
  party?: number; budget?: number | null; vibes: string[]; interests: string[];
  halal?: boolean; vegan?: boolean; vegetarian?: boolean; lessWalking?: boolean;
  surprise?: boolean; startTime?: number; endTime?: number;
}
const VIBES = ["romantic", "relaxing", "fun", "fancy", "creative", "adventurous", "photography", "nature", "night", "budget"];
const INTERESTS: Record<string, string[]> = { food: ["food", "eat", "restaurant", "맛집"], coffee: ["coffee", "cafe", "caffe", "커피", "카페"], nature: ["nature", "park"], photography: ["photo", "picture", "pictures", "사진"], shopping: ["shop"], art: ["art"], museums: ["museum"], games: ["game", "arcade"], scenic: ["scenic", "view", "sunset"], quiet: ["quiet", "calm"], history: ["history"], culture: ["culture"], night: ["night"], entertainment: ["entertain"] };
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function ruleIntent(text: string, now = new Date()): Intent {
  const t = text.toLowerCase(); const out: Intent = { vibes: [], interests: [] };
  const m = t.match(/\d{4}-\d{2}-\d{2}/);
  if (m) out.date = m[0];
  else if (/tomorrow|내일/.test(t)) out.date = iso(new Date(now.getTime() + 864e5));
  else if (/today|tonight|오늘/.test(t)) out.date = iso(now);
  else { const di = DAYS.findIndex((d) => t.includes(d)); if (di >= 0) { const add = ((di - now.getDay() + 7) % 7) || 7; out.date = iso(new Date(now.getTime() + add * 864e5)); } }

  if (/cheongju|청주/.test(t)) out.city = "cheongju";
  else if (/suwon|seouwon|수원/.test(t)) out.city = "suwon";
  else if (/busan|부산/.test(t)) out.city = "busan";
  else if (/incheon|인천/.test(t)) out.city = "incheon";
  else if (/jeju|제주/.test(t)) out.city = "jeju";
  else if (/daegu|대구/.test(t)) out.city = "daegu";
  else if (/daejeon|대전/.test(t)) out.city = "daejeon";
  else if (/jeonju|전주/.test(t)) out.city = "jeonju";
  else if (/gangneung|강릉/.test(t)) out.city = "gangneung";
  else if (/gyeongju|경주/.test(t)) out.city = "gyeongju";
  else if (/sokcho|속초/.test(t)) out.city = "sokcho";
  else if (/chuncheon|춘천/.test(t)) out.city = "chuncheon";
  else if (/yeosu|여수/.test(t)) out.city = "yeosu";
  else if (/gwangju|광주/.test(t)) out.city = "gwangju";
  else if (/pohang|포항/.test(t)) out.city = "pohang";
  else if (/ulsan|울산/.test(t)) out.city = "ulsan";
  else if (/andong|안동/.test(t)) out.city = "andong";
  else if (/tongyeong|통영/.test(t)) out.city = "tongyeong";
  else if (/suncheon|순천/.test(t)) out.city = "suncheon";
  else if (/changwon|창원/.test(t)) out.city = "changwon";
  else if (/cheonan|천안/.test(t)) out.city = "cheonan";
  else if (/seoul|서울/.test(t)) out.city = "seoul";
  else {
    const cityMatch = t.match(/(?:in|at|도시|지역)\s+([a-zA-Z가-힣]+)/);
    if (cityMatch && !["the", "a", "morning", "afternoon", "evening", "night", "hotel", "cafe", "restaurant"].includes(cityMatch[1])) {
      out.city = cityMatch[1];
    }
  }

  const meet = text.match(/(?:meet(?:ing)? at|start(?:ing)? (?:at|from)|만남(?:\:|장소)?)\s+([^,.]+)/i);
  if (meet) out.meetingPoint = meet[1].trim();
  const end = text.match(/(?:end(?:ing)? at|finish(?:ing)? at|끝(?:\:|장소)?)\s+([^,.]+)/i);
  if (end) out.endPoint = end[1].trim();

  for (const a of AREAS) if (t.includes(a.replace("-", " ")) || t.includes(a)) out.area = a;
  if (/gangnam|강남/.test(t)) out.area = "gangnam"; if (/hongdae|홍대/.test(t)) out.area = "hongdae"; if (/itaewon|이태원/.test(t)) out.area = "itaewon"; if (/seongsu|성수/.test(t)) out.area = "seongsu";
  if (/suwon station|수원역/.test(t)) { out.area = "suwon-station"; out.city = "suwon"; }
  if (/hwaseong|행궁|haenggung/.test(t)) { out.area = "haenggung"; out.city = "suwon"; }
  const won = t.match(/₩\s?([\d,]+)/) || t.match(/([\d,]{5,})\s?(?:won|krw|원)/); const k = t.match(/(\d+)\s?k\b/); const man = t.match(/(\d+)\s?만\s?원?/);
  if (won) out.budget = Number(won[1].replace(/,/g, "")); else if (k) out.budget = Number(k[1]) * 1000; else if (man) out.budget = Number(man[1]) * 10000;
  if (/for two|couple|date|romantic|둘이|커플/.test(t)) out.party = 2;
  const pn = t.match(/(\d+)\s?(?:people|persons|of us|friends|명)/); if (pn) out.party = Number(pn[1]);
  out.vibes = VIBES.filter((v) => t.includes(v) || (v === "photography" && /photo|picture/.test(t)) || (v === "night" && /tonight|night/.test(t)));
  for (const [k2, ws] of Object.entries(INTERESTS)) if (ws.some((w) => t.includes(w))) out.interests.push(k2);
  if (/halal|muslim|할랄/.test(t)) out.halal = true; if (/vegan|비건/.test(t)) out.vegan = true; if (/vegetarian/.test(t)) out.vegetarian = true;
  if (/less walking|not much walking|little walking|too much walking|걷기 싫|tired/.test(t)) out.lessWalking = true;
  if (/surprise|no idea|something different|놀라/.test(t)) out.surprise = true;
  const st = t.match(/(?:from|start(?:ing)? at|at)\s(\d{1,2})(?::(\d{2}))?\s?(am|pm)?/);
  if (st) { let h = Number(st[1]); if (st[3] === "pm" && h < 12) h += 12; out.startTime = h * 60 + Number(st[2] || 0); }
  return out;
}
/** Optional LLM extraction (intent only — never places, prices or arithmetic). Falls back to rules on any failure. */
export async function extractIntent(text: string): Promise<Intent> {
  const base = ruleIntent(text);
  const key = process.env.OPENAI_API_KEY; if (!key) return base;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", response_format: { type: "json_object" }, messages: [
        { role: "system", content: `Extract a date-planning request as JSON: {"date":"YYYY-MM-DD"|null,"city":string|null,"meetingPoint":string|null,"endPoint":string|null,"area":one of ${AREAS.join("|")}|null,"party":number|null,"budget":KRW number|null,"vibes":string[],"interests":string[],"halal":bool,"vegan":bool,"vegetarian":bool,"lessWalking":bool,"surprise":bool}. Today is ${new Date().toISOString().slice(0, 10)}. Output JSON only. Do NOT invent places.` },
        { role: "user", content: text }] }) });
    if (!r.ok) return base;
    const j = JSON.parse((await r.json()).choices[0].message.content);
    const clean = Object.fromEntries(Object.entries(j).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length)));
    return { ...base, ...clean, vibes: [...new Set([...base.vibes, ...(j.vibes ?? [])])], interests: [...new Set([...base.interests, ...(j.interests ?? [])])] } as Intent;
  } catch { return base; }
}
export function intentToRequest(i: Intent, profile: Profile, o: Partial<PlanRequest> & { history: string[] }): PlanRequest {
  const today = iso(new Date());
  return { date: i.date ?? o.date ?? today, startTime: o.startTime ?? i.startTime ?? toMin("10:00"), endTime: o.endTime ?? i.endTime ?? toMin("20:30"),
    party: o.party ?? i.party ?? 2, budget: o.budget !== undefined ? o.budget : i.budget !== undefined ? i.budget : profile.defaultBudget,
    vibes: [...new Set([...(o.vibes ?? []), ...i.vibes])], interests: [...new Set([...profile.interests, ...i.interests])], area: i.area ?? o.area,
    city: o.city ?? i.city ?? "seoul", meetingPoint: o.meetingPoint ?? i.meetingPoint, endPoint: o.endPoint ?? i.endPoint,
    surprise: i.surprise || o.surprise, lessWalking: !!i.lessWalking || profile.mobility !== "normal", pace: o.pace ?? profile.pace ?? "relaxed",
    transport: profile.transport, title: o.title, history: o.history, prayerAware: profile.diet.muslim && profile.prayerAware };
}

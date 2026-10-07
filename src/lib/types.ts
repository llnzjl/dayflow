export type Category = "meetup" | "cafe" | "restaurant" | "activity" | "park" | "shop" | "museum" | "prayer" | "market" | "night";
export type HalalStatus = "halal_verified" | "halal_friendly" | "muslim_friendly" | "user_reported" | "unverified";
export type Mode = "walk" | "subway" | "bus" | "taxi";
export type Pace = "fast" | "normal" | "relaxed";

export interface Place {
  id: string; name: string; nameKo: string; category: Category; area: string;
  lat: number; lng: number; address: string;
  priceMin: number; priceMax: number; /* per person, KRW */
  stay: number; open: string; close: string; indoor: boolean; tags: string[];
  halal: HalalStatus; vegan: "full" | "options" | "none"; alcohol: boolean;
  accessible: boolean; rating?: number; source: string; updated: string;
}
export interface Diet { muslim: boolean; vegetarian: boolean; vegan: boolean; noPork: boolean; noAlcohol: boolean; allergies: string[] }
export interface Profile {
  name: string; email: string; lang: "en" | "ko"; currency: "KRW"; diet: Diet;
  interests: string[]; dislikes: string[];
  mobility: "normal" | "less" | "avoid_long" | "wheelchair";
  transport: "transit" | "taxi" | "walk" | "car";
  defaultBudget: number | null; prayerAware: boolean; pace: Pace;
  consentSensitive: boolean; notifications: boolean;
}
export interface RouteOption {
  mode: Mode; walkMin: number; rideMin: number; transferMin: number;
  fare: number; fareMax?: number; perPerson: boolean; source: string; live: boolean;
}
export interface PlanItem {
  uid: string; place: Place; duration: number; minDuration: number;
  reservedAt?: number; reserved?: boolean; reservationCode?: string; reservationDemo?: boolean; routeMode?: Mode; userPrice?: number;
}
export interface LegAlt { mode: Mode; totalMin: number; cost: number; costMax?: number; walkMin: number }
export interface Leg {
  mode: Mode; walkMin: number; rideMin: number; transferMin: number; bufferMin: number; moveMin: number;
  departAt: number; expectedArrival: number; slack: number; cost: number;
  alternatives: LegAlt[]; live: boolean; liveNote: string; source: string; distanceKm: number;
}
export interface Stop {
  uid: string; place: Place; arrive: number; leave: number; duration: number; cost: number;
  costBasis: "estimated" | "range" | "user" | "free"; costRange?: [number, number];
  leg?: Leg; reserved: boolean; reservedAt?: number; lateBy: number; warnings: string[]; item: PlanItem;
}
export interface Weather {
  summary: string; tempC: number | null; source: string; live: boolean;
  hours: { h: number; precip: number }[];
}
export interface ItinInput {
  id: string; title: string; date: string; startTime: number; endTime: number; party: number;
  budget: number | null; pace: Pace; transport: Profile["transport"]; lessWalking: boolean;
  vibes: string[]; area?: string; city?: string; meetingPoint?: string; endPoint?: string; items: PlanItem[];
  status?: "upcoming" | "active" | "past";
}
export type Role = "owner" | "organizer" | "editor" | "viewer";
export interface LiveStatus { updatedAt: number; state: "green" | "yellow" | "red"; current?: string; next?: string; etaMin?: number }
export interface Check { key: string; label: string; status: "ok" | "warn" | "fail" }
export interface Itinerary extends ItinInput {
  role?: Role; ownerName?: string; live?: LiveStatus | null; updatedAt?: number;
  stops: Stop[];
  totals: { food: number; transport: number; activities: number; shopping: number; other: number; total: number; perPerson: number };
  budgetState: { limit: number | null; planned: number; remaining: number | null; over: number };
  health: { score: number; state: "green" | "yellow" | "red"; checks: Check[];
    stars: { romance: number; travel: number; budget: number; schedule: number } };
  gaps: { afterIndex: number; minutes: number; from: number; to: number }[];
  stats: { totalMin: number; km: number; avgBuffer: number };
}
export interface PrayerTimes { Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string; source: string; live: boolean }

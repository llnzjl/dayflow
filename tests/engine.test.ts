import { describe, it, expect } from "vitest";
import { bufferFor, openOK, toMin, fmt } from "@/lib/time";
import { perPerson, budgetState, sum } from "@/lib/money";
import { dietaryOK } from "@/lib/diet";
import { DEMO_PLACES } from "@/lib/providers/demo-data";
import { MockTransitProvider, MockPlaceProvider, estimateOptions } from "@/lib/providers/mock";
import { compute, mkItem, chooseOption, stripDerived } from "@/lib/engine/compute";
import { generate } from "@/lib/engine/generate";
import { optimizeBudget } from "@/lib/engine/optimize";
import { replan } from "@/lib/engine/replan";
import { editItinerary } from "@/lib/engine/edit";
import { ruleIntent } from "@/lib/engine/intent";
import type { Diet } from "@/lib/types";

const diet = (o: Partial<Diet> = {}): Diet => ({ muslim: false, vegetarian: false, vegan: false, noPork: false, noAlcohol: false, allergies: [], ...o });
const ctx = (d = diet()) => ({ transit: new MockTransitProvider(), diet: d, weather: null, candidates: DEMO_PLACES });
const P = (id: string) => DEMO_PLACES.find((p) => p.id === id)!;
const req = (o = {}) => ({ date: "2026-10-17", startTime: toMin("10:00"), endTime: toMin("20:30"), party: 2, budget: 100000, vibes: ["romantic"], interests: ["food", "photography"],
  lessWalking: false, pace: "relaxed" as const, transport: "transit" as const, history: [], ...o });

describe("unit: time / money", () => {
  it("formats and parses", () => { expect(fmt(toMin("09:30"))).toBe("09:30"); });
  it("buffer = pace + 3 when walking", () => { expect(bufferFor("relaxed", 6)).toBe(13); expect(bufferFor("fast", 0)).toBe(2); });
  it("handles after-midnight closing", () => { expect(openOK("12:00", "02:00", toMin("23:00"), 60)).toBe(true); expect(openOK("10:00", "18:00", toMin("17:30"), 60)).toBe(false); });
  it("budget math is exact", () => { expect(perPerson(95400, 2)).toBe(47700); expect(budgetState(100000, 82400)).toMatchObject({ remaining: 17600, over: 0 }); expect(budgetState(100000, 118000).over).toBe(18000); expect(sum([1, 2, 3])).toBe(6); });
});
describe("unit: dietary filtering", () => {
  it("muslim excludes unverified food, keeps verified", () => { expect(dietaryOK(P("d-rest-steak"), diet({ muslim: true }))).toBe(false); expect(dietaryOK(P("d-rest-halal-bbq"), diet({ muslim: true }))).toBe(true); });
  it("vegan excludes none", () => { expect(dietaryOK(P("d-rest-halal-bbq"), diet({ vegan: true }))).toBe(false); expect(dietaryOK(P("d-rest-vegan"), diet({ vegan: true }))).toBe(true); });
});
describe("unit: routes", () => {
  it("transit/walk/taxi options exist and taxi is a range", () => { const o = estimateOptions(P("d-meet-seoul"), P("d-cafe-maru"), "x"); expect(o.map((x) => x.mode)).toContain("taxi"); expect(o.find((x) => x.mode === "taxi")!.fareMax).toBeGreaterThan(o.find((x) => x.mode === "taxi")!.fare); expect(o.every((x) => !x.live)).toBe(true); });
  it("less walking avoids long-walk options", () => { const o = estimateOptions(P("d-meet-seoul"), P("d-cafe-maru"), "x"); expect(chooseOption(o, { transport: "transit", lessWalking: true }).walkMin).toBeLessThanOrEqual(12); });
});
describe("itinerary engine", () => {
  it("schedule is chronological with buffers and cost totals add up", async () => {
    const it = await compute({ id: "1", title: "t", date: "2026-10-17", startTime: 600, endTime: 1200, party: 2, budget: 100000, pace: "relaxed", transport: "transit", lessWalking: false, vibes: [], items: [mkItem(P("d-cafe-maru")), mkItem(P("d-rest-vegan"))] }, ctx());
    expect(it.stops[1].arrive).toBeGreaterThan(it.stops[0].leave);
    expect(it.stops[1].leg!.bufferMin).toBeGreaterThanOrEqual(10);
    expect(it.totals.total).toBe(it.totals.food + it.totals.transport + it.totals.activities + it.totals.shopping + it.totals.other);
    expect(it.totals.perPerson).toBe(Math.round(it.totals.total / 2));
  });
  it("Muslim plan only has halal-compatible food, passes health", async () => {
    const d = diet({ muslim: true }); const { itin } = await generate(req(), { ...ctx(d), candidates: DEMO_PLACES });
    for (const s of itin.stops) expect(dietaryOK(s.place, d)).toBe(true);
    expect(itin.stops.some((s) => s.place.category === "restaurant")).toBe(true);
    expect(itin.health.checks.find((c) => c.key === "diet")!.status).toBe("ok");
  });
  it("only uses places from the provider (no invented venues)", async () => {
    const { itin } = await generate(req(), { ...ctx(), candidates: DEMO_PLACES });
    for (const s of itin.stops) expect(DEMO_PLACES.map((p) => p.id)).toContain(s.place.id);
  });
  it("optimizer reduces cost while keeping diet", async () => {
    const d = diet({ muslim: true });
    const base = await compute({ id: "2", title: "x", date: "2026-10-17", startTime: 600, endTime: 1200, party: 2, budget: 30000, pace: "relaxed", transport: "transit", lessWalking: false, vibes: [], items: [mkItem(P("d-cafe-maru")), mkItem(P("d-rest-halal-bbq"))] }, ctx(d));
    const r = await optimizeBudget(base, ctx(d), DEMO_PLACES, true);
    expect(r.itin.totals.total).toBeLessThan(base.totals.total); for (const s of r.itin.stops) expect(dietaryOK(s.place, d)).toBe(true);
  });
  it("conversational edit removes a stop and recalculates", async () => {
    const { itin } = await generate(req(), { ...ctx(), candidates: DEMO_PLACES });
    const museum = itin.stops.find((s) => s.place.category === "park") ?? itin.stops[2];
    const r = await editItinerary(itin, `remove the ${museum.place.category}`, ctx(), DEMO_PLACES);
    expect(r.itin.stops.length).toBe(itin.stops.length - 1);
  });
  it("replanning protects a reservation", async () => {
    const items = [mkItem(P("d-cafe-maru"), 90), mkItem(P("d-act-photo"), 60), { ...mkItem(P("d-rest-vegan")), reserved: true, reservedAt: toMin("13:00") }];
    const it = await compute({ id: "3", title: "r", date: "2026-10-17", startTime: 600, endTime: 1200, party: 2, budget: null, pace: "relaxed", transport: "transit", lessWalking: false, vibes: [], items }, ctx());
    const r = await replan(it, 0, 25, ctx());
    expect(r.itin.stops.find((s) => s.reserved)!.lateBy).toBeLessThanOrEqual(it.stops[2].lateBy + 25);
    expect(r.messages.length).toBeGreaterThan(0);
  });
});
describe("intent", () => {
  it("extracts budget, halal, party, area", () => { const i = ruleIntent("Romantic date in Hongdae for two, ₩100,000, I'm Muslim, halal please, we like food and photography"); expect(i.budget).toBe(100000); expect(i.halal).toBe(true); expect(i.party).toBe(2); expect(i.area).toBe("hongdae"); expect(i.interests).toContain("photography"); });
  it("parses 10만원 and surprise", () => { const i = ruleIntent("surprise me, 10만원"); expect(i.budget).toBe(100000); expect(i.surprise).toBe(true); });
  it("parses Suwon/seouwon, meeting point, and ending point across Korea", () => {
    const i = ruleIntent("Date in seouwon, meet at Suwon Station Exit 4, end at Banghwasuryujeong");
    expect(i.city).toBe("suwon");
    expect(i.meetingPoint).toBe("Suwon Station Exit 4");
    expect(i.endPoint).toBe("Banghwasuryujeong");
  });
  it("parses Korean city names and meeting places", () => {
    const i = ruleIntent("수원에서 데이트, 만남: 화성행궁 광장, 끝: 수원역 환승센터");
    expect(i.city).toBe("suwon");
    expect(i.meetingPoint).toBe("화성행궁 광장");
    expect(i.endPoint).toBe("수원역 환승센터");
  });
});
describe("date planning across Korea with meeting & ending spots", () => {
  it("generates a date in Suwon starting at meeting point and ending at chosen end spot", async () => {
    const suwonReq = req({
      city: "suwon",
      meetingPoint: "Suwon Station Meeting Plaza",
      endPoint: "Banghwasuryujeong Night View Pavilion",
      vibes: ["romantic"],
    });
    const { itin } = await generate(suwonReq, { ...ctx(), candidates: DEMO_PLACES });
    expect(itin.stops.length).toBeGreaterThanOrEqual(3);
    // Stop 1 is meeting point
    expect(itin.stops[0].place.name).toContain("Suwon Station");
    expect(itin.stops[0].place.category).toBe("meetup");
    // Final stop is ending point
    expect(itin.stops[itin.stops.length - 1].place.name).toContain("Banghwasuryujeong");
    // Intermediate stops take place in Suwon
    expect(itin.stops.some((s) => s.place.area.includes("suwon") || s.place.area === "haenggung" || s.place.area === "gwanggyo")).toBe(true);
    expect(itin.city).toBe("suwon");
  });
  it("generates date with custom meeting and ending spot", async () => {
    const customReq = req({
      city: "suwon",
      meetingPoint: "Suwon Station Exit 4 Clock",
      endPoint: "Drop-off at Hwaseong Gate",
    });
    const { itin } = await generate(customReq, { ...ctx(), candidates: DEMO_PLACES });
    expect(itin.stops[0].place.name).toBe("Suwon Station Exit 4 Clock");
    expect(itin.stops[itin.stops.length - 1].place.name).toBe("Drop-off at Hwaseong Gate");
  });
  it("enforces 2-week cooldown: previously selected places are not picked again", async () => {
    // Generate first date in Seoul
    const firstReq = req({ city: "seoul", vibes: ["romantic"] });
    const { itin: itin1 } = await generate(firstReq, { ...ctx(), candidates: DEMO_PLACES });
    const venueStops1 = itin1.stops.filter((s) => s.place.category !== "meetup").map((s) => s.place.id);
    expect(venueStops1.length).toBeGreaterThan(0);

    // Plan second date within 2-week cooldown period with cooldownPlaceIds set
    const secondReq = req({
      city: "seoul",
      vibes: ["romantic"],
      cooldownPlaceIds: venueStops1,
    });
    const { itin: itin2 } = await generate(secondReq, { ...ctx(), candidates: DEMO_PLACES });
    const venueStops2 = itin2.stops.filter((s) => s.place.category !== "meetup").map((s) => s.place.id);

    // Ensure none of the venues from date 1 were reselected in date 2
    for (const v of venueStops2) {
      expect(venueStops1).not.toContain(v);
    }
  });
  it("randomizes date itineraries across multiple requests", async () => {
    const r1 = req({ city: "seoul", seed: 101 });
    const r2 = req({ city: "seoul", seed: 999999 });
    const { itin: itinA } = await generate(r1, { ...ctx(), candidates: DEMO_PLACES });
    const { itin: itinB } = await generate(r2, { ...ctx(), candidates: DEMO_PLACES });
    const placesA = itinA.stops.filter((s) => s.place.category !== "meetup").map((s) => s.place.id);
    const placesB = itinB.stops.filter((s) => s.place.category !== "meetup").map((s) => s.place.id);
    // At least one venue differs due to randomized rotation
    const hasDifference = placesA.some((p) => !placesB.includes(p)) || placesB.some((p) => !placesA.includes(p));
    expect(hasDifference).toBe(true);
  });
});
describe("e2e (engine level): Muslim ₩100k journey", () => {
  it("plan → modify restaurant → budget recalculated → delay → replan", async () => {
    const d = diet({ muslim: true }); const c = ctx(d);
    const { itin } = await generate(req(), { ...c, candidates: DEMO_PLACES });
    const meal = itin.stops.find((s) => s.place.category === "restaurant")!;
    const alt = DEMO_PLACES.find((p) => p.id === "d-rest-halal-ko")!;
    const base = stripDerived(itin); base.items[itin.stops.indexOf(meal)] = { ...mkItem(alt), uid: meal.uid };
    const changed = await compute(base, c);
    expect(changed.totals.total).not.toBe(itin.totals.total);
    const r = await replan(changed, 1, 15, c);
    expect(r.itin.stops.length).toBeGreaterThan(0);
  });
});

describe("all Korea cities & candidate search", () => {
  it("generates date in Busan with all stops within Busan", async () => {
    const busanReq = req({ city: "busan", vibes: ["romantic"] });
    const { itin } = await generate(busanReq, ctx());
    expect(itin.city).toBe("busan");
    expect(itin.stops.length).toBeGreaterThanOrEqual(3);
    // Meeting point should be Busan
    expect(itin.stops[0].place.name.toLowerCase()).toMatch(/busan|seomyeon/);
    // Every stop's address or area should belong to Busan
    for (const s of itin.stops) {
      expect(
        s.place.area.toLowerCase().includes("busan") ||
        s.place.area.toLowerCase().includes("haeundae") ||
        s.place.area.toLowerCase().includes("gwangalli") ||
        s.place.area.toLowerCase().includes("seomyeon") ||
        s.place.address.toLowerCase().includes("busan") ||
        s.place.address.includes("부산")
      ).toBe(true);
    }
  });

  it("generates date for custom city across Korea (e.g. Gyeongju)", async () => {
    const gyeongjuReq = req({ city: "gyeongju", vibes: ["culture"] });
    const { itin } = await generate(gyeongjuReq, ctx());
    expect(itin.city).toBe("gyeongju");
    expect(itin.stops.length).toBeGreaterThanOrEqual(2);
    // Stops should be located in Gyeongju
    for (const s of itin.stops) {
      expect(
        s.place.area.toLowerCase().includes("gyeongju") ||
        s.place.address.toLowerCase().includes("gyeongju") ||
        s.place.address.includes("경주")
      ).toBe(true);
    }
  });

  it("MockPlaceProvider searches by city correctly", async () => {
    const provider = new MockPlaceProvider();
    const busanPlaces = await provider.search({ city: "busan" });
    expect(busanPlaces.length).toBeGreaterThan(0);
    for (const p of busanPlaces) {
      expect(
        p.area.toLowerCase().includes("busan") ||
        p.area.toLowerCase().includes("haeundae") ||
        p.area.toLowerCase().includes("gwangalli") ||
        p.area.toLowerCase().includes("seomyeon") ||
        p.address.toLowerCase().includes("busan") ||
        p.address.includes("부산")
      ).toBe(true);
    }
  });

  it("detects city intent from freeform text across Korea", () => {
    expect(ruleIntent("romantic date in busan tomorrow").city).toBe("busan");
    expect(ruleIntent("we want to explore cafes in suwon").city).toBe("suwon");
    expect(ruleIntent("fun activities in jeju").city).toBe("jeju");
    expect(ruleIntent("historical trip in gyeongju").city).toBe("gyeongju");
    expect(ruleIntent("beach dinner in sokcho").city).toBe("sokcho");
    expect(ruleIntent("date in cheongju, cafe and dinner").city).toBe("cheongju");
    expect(ruleIntent("청주에서 예쁜 카페 가자").city).toBe("cheongju");
  });

  it("handles 'caffe' spelling in interest extraction", () => {
    const res = ruleIntent("cozy caffe date in cheongju");
    expect(res.city).toBe("cheongju");
    expect(res.interests).toContain("coffee");
  });
});

describe("Cheongju & Google/Naver Maps navigation", () => {
  it("generates authentic Cheongju places with valid Korean addresses", async () => {
    const provider = new MockPlaceProvider();
    const places = await provider.search({ city: "cheongju", category: "cafe" });
    expect(places.length).toBeGreaterThan(0);
    const fullmoon = places.find((p) => p.name.includes("Fullmoon") || p.nameKo.includes("풀문"));
    expect(fullmoon).toBeDefined();
    expect(fullmoon?.address).toContain("청주시");
    const { getGoogleMapsUrl } = await import("@/lib/maps");
    expect(getGoogleMapsUrl(fullmoon!, "cheongju")).not.toContain("demo");
  });

  it("generates clean, resolvable Google Maps and Naver Map URLs", async () => {
    const { getGoogleMapsUrl, getNaverMapUrl } = await import("@/lib/maps");
    const testPlace = {
      id: "test-cj",
      name: "Cafe Fullmoon",
      nameKo: "풀문 수암골 본점",
      category: "cafe" as const,
      area: "suamgol",
      lat: 36.6395,
      lng: 127.4982,
      priceMin: 6000,
      priceMax: 12000,
      open: "10:00",
      close: "23:00",
      rating: 4.6,
      accessible: true,
      vegan: "none" as const,
      halal: "unverified" as const,
      address: "충북 청주시 상당구 수암로 36번길 21-4",
      source: "verified" as const,
      updated: "2026-03-01",
    };

    const gUrl = getGoogleMapsUrl(testPlace, "cheongju");
    expect(gUrl).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(decodeURIComponent(gUrl)).toContain("풀문");
    expect(decodeURIComponent(gUrl)).not.toContain("demo address");

    const nUrl = getNaverMapUrl(testPlace);
    expect(nUrl).toContain("https://map.naver.com/p/search/");
    expect(decodeURIComponent(nUrl)).toContain("풀문");
  });
});


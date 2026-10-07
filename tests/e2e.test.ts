// Server-side end-to-end: real route handlers + real SQLite (in-memory) + real auth cookies, mock data providers.
process.env.DATABASE_FILE = ":memory:"; process.env.ADMIN_EMAILS = "admin@x.com";
import { describe, it, expect } from "vitest";
import * as auth from "@/app/api/auth/[action]/route";
import * as state from "@/app/api/state/route";
import * as plan from "@/app/api/plan/route";
import * as plans from "@/app/api/plans/route";
import * as share from "@/app/api/plans/[id]/share/route";
import * as eta from "@/app/api/plans/[id]/eta/route";
import * as edit from "@/app/api/edit/route";
import * as replan from "@/app/api/replan/route";
import * as reserve from "@/app/api/reservations/route";
import * as notif from "@/app/api/notifications/route";
import * as reports from "@/app/api/reports/route";
import * as stats from "@/app/api/admin/stats/route";
import * as places from "@/app/api/places/route";
import { defaultProfile } from "@/lib/client";

type Fn = (r: Request, c?: any) => Promise<Response>;
async function call(fn: Fn, method: string, body?: unknown, cookie = "", params: any = {}, url = "http://x/api") {
  const res = await fn(new Request(url, { method, headers: { "content-type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined }), { params });
  const sc = res.headers.get("set-cookie"); return { status: res.status, data: await res.json(), cookie: sc ? sc.split(";")[0] : cookie };
}
const signup = async (name: string, email: string) => (await call(auth.POST as Fn, "POST", { name, email, password: "password123" }, "", { action: "signup" })).cookie;

describe("auth", () => {
  it("rejects weak input, duplicates and wrong passwords; logout kills session", async () => {
    expect((await call(auth.POST as Fn, "POST", { name: "a", email: "bad", password: "x" }, "", { action: "signup" })).status).toBe(400);
    const c = await signup("Dup", "dup@x.com");
    expect((await call(auth.POST as Fn, "POST", { name: "a", email: "dup@x.com", password: "password123" }, "", { action: "signup" })).status).toBe(409);
    expect((await call(auth.POST as Fn, "POST", { email: "dup@x.com", password: "wrongwrong" }, "", { action: "login" })).status).toBe(401);
    expect((await call(auth.GET as Fn, "GET", undefined, c, { action: "me" })).data.user.email).toBe("dup@x.com");
    await call(auth.POST as Fn, "POST", {}, c, { action: "logout" });
    expect((await call(auth.GET as Fn, "GET", undefined, c, { action: "me" })).data.user).toBeNull();
  });
  it("password reset flow", async () => {
    await signup("R", "r@x.com");
    const f = await call(auth.POST as Fn, "POST", { email: "r@x.com" }, "", { action: "forgot" }); const token = f.data.devLink.split("reset=")[1];
    expect((await call(auth.POST as Fn, "POST", { token, password: "newpassword1" }, "", { action: "reset" })).status).toBe(200);
    expect((await call(auth.POST as Fn, "POST", { email: "r@x.com", password: "newpassword1" }, "", { action: "login" })).status).toBe(200);
    expect((await call(auth.POST as Fn, "POST", { token, password: "again12345" }, "", { action: "reset" })).status).toBe(400);
  });
  it("requires login for private endpoints", async () => {
    expect((await call(plans.GET as Fn, "GET")).status).toBe(401); expect((await call(plan.POST as Fn, "POST", { text: "x" })).status).toBe(401);
  });
});

describe("E2E journey: Muslim user, ₩100,000", () => {
  it("signup → profile → AI plan → edit restaurant → budget recalculated → start → reserve → late → notify → share → report → admin", async () => {
    const c = await signup("Aisha", "aisha@x.com");
    const profile = { ...defaultProfile("Aisha", "aisha@x.com"), diet: { muslim: true, vegetarian: false, vegan: false, noPork: true, noAlcohol: true, allergies: [] }, prayerAware: true, defaultBudget: 100000, consentSensitive: true, interests: ["food", "photography"] };
    await call(state.PUT as Fn, "PUT", { profile, history: [], savedPlaces: [], feedback: {}, memories: [], onboarded: true }, c);
    expect((await call(state.GET as Fn, "GET", undefined, c)).data.profile.diet.muslim).toBe(true);

    const gen = await call(plan.POST as Fn, "POST", { text: "Romantic date tomorrow in Seoul, we like food and photography. Halal please.", profile, overrides: {}, history: [] }, c);
    expect(gen.status).toBe(200); let it = gen.data.itinerary;
    expect(it.stops.length).toBeGreaterThan(3); expect(it.totals.total).toBeLessThanOrEqual(100000);
    expect(it.health.checks.find((x: any) => x.key === "diet").status).toBe("ok");

    // save → server revalidates and stores
    const put = await call(plans.PUT as Fn, "PUT", { itinerary: it }, c); expect(put.status).toBe(200); it = put.data.itinerary;
    expect((await call(plans.GET as Fn, "GET", undefined, c)).data.plans).toHaveLength(1);
    // fake places are rejected
    const bad = structuredClone(it); bad.items[0].place = { ...bad.items[0].place, id: "invented-1", name: "Invented Cafe" };
    expect((await call(plans.PUT as Fn, "PUT", { itinerary: bad }, c)).status).toBe(422);

    // modify: cheaper → total goes down, dietary still ok
    const ed = await call(edit.POST as Fn, "POST", { itinerary: it, profile, command: "cheaper" }, c);
    if (ed.data.changed) { expect(ed.data.itinerary.totals.total).toBeLessThan(it.totals.total); it = ed.data.itinerary; }
    const add = await call(edit.POST as Fn, "POST", { itinerary: it, profile, command: "add a halal restaurant" }, c);
    if (add.data.changed) { expect(add.data.itinerary.totals.total).toBeGreaterThanOrEqual(it.totals.total); it = add.data.itinerary; }
    await call(plans.PUT as Fn, "PUT", { itinerary: it }, c);

    // reservations: availability from provider, booking marks stop reserved (demo-labelled)
    const meal = it.stops.find((s: any) => s.place.category === "restaurant");
    const sl = await call(reserve.POST as Fn, "POST", { action: "slots", itineraryId: it.id, stopUid: meal.uid }, c);
    const slot = sl.data.slots.find((s: any) => s.available); expect(sl.data.demo).toBe(true);
    const bk = await call(reserve.POST as Fn, "POST", { action: "book", itineraryId: it.id, stopUid: meal.uid, time: slot.time }, c);
    expect(bk.status).toBe(200); const booked = bk.data.itinerary.stops.find((s: any) => s.uid === meal.uid);
    expect(booked.reserved).toBe(true); expect(booked.item.reservationCode).toMatch(/^DEMO-/);
    expect((await call(reserve.POST as Fn, "POST", { action: "book", itineraryId: it.id, stopUid: meal.uid, time: "03:00" }, c)).status).toBe(409);
    it = bk.data.itinerary;

    // running late → replan
    const rp = await call(replan.POST as Fn, "POST", { itinerary: it, profile, currentIndex: 1, delayMin: 14 }, c);
    expect(rp.data.messages.length).toBeGreaterThan(0);

    // notifications dedupe
    const first = it.stops[1]; const now = first.leg.departAt - 10;
    const n1 = await call(notif.POST as Fn, "POST", { itineraryId: it.id, now }, c); expect(n1.data.created.some((n: any) => n.kind === "leave")).toBe(true);
    const n2 = await call(notif.POST as Fn, "POST", { itineraryId: it.id, now }, c); expect(n2.data.created).toHaveLength(0);
    expect((await call(notif.GET as Fn, "GET", undefined, c)).data.notifications.length).toBeGreaterThan(0);

    // sharing with roles
    const v = await signup("Viewer", "viewer@x.com"), e = await signup("Editor", "editor@x.com");
    expect((await call(share.POST as Fn, "POST", { email: "viewer@x.com", role: "viewer", etaSharing: false }, c, { id: it.id })).status).toBe(200);
    await call(share.POST as Fn, "POST", { email: "editor@x.com", role: "editor", etaSharing: true }, c, { id: it.id });
    await call(eta.POST as Fn, "POST", { state: "yellow", current: "Cafe", next: "Lunch", etaMin: 720 }, c, { id: it.id });
    const vp = (await call(plans.GET as Fn, "GET", undefined, v)).data.plans[0]; expect(vp.role).toBe("viewer"); expect(vp.live).toBeNull(); // viewer didn't get ETA sharing
    const ep = (await call(plans.GET as Fn, "GET", undefined, e)).data.plans[0]; expect(ep.live.next).toBe("Lunch"); expect(JSON.stringify(ep.live)).not.toMatch(/lat|lng/);
    expect((await call(plans.PUT as Fn, "PUT", { itinerary: vp }, v)).status).toBe(403); // viewer can't edit
    expect((await call(plans.PUT as Fn, "PUT", { itinerary: { ...ep, title: "Edited by editor" } }, e)).status).toBe(200);
    expect((await call(plans.GET as Fn, "GET", undefined, c)).data.plans[0].title).toBe("Edited by editor");
    expect((await call(share.POST as Fn, "POST", { email: "x@y.com", role: "viewer" }, e, { id: it.id })).status).toBe(403); // editor can't manage sharing
    expect((await call(plans.DELETE as Fn, "DELETE", undefined, e, {}, `http://x/api/plans?id=${it.id}`)).status).toBe(403);

    // report outdated halal info → admin overrides status → places API reflects it
    const pid = meal.place.id;
    expect((await call(reports.POST as Fn, "POST", { placeId: pid, type: "halal", note: "Not halal anymore" }, v)).status).toBe(200);
    expect((await call(reports.POST as Fn, "POST", { placeId: pid, type: "halal" }, v)).status).toBe(409);
    expect((await call(reports.GET as Fn, "GET", undefined, v)).status).toBe(403);
    const admin = await signup("Admin", "admin@x.com");
    const list = (await call(reports.GET as Fn, "GET", undefined, admin)).data.reports; expect(list).toHaveLength(1);
    expect((await call(reports.PATCH as Fn, "PATCH", { id: list[0].id, status: "resolved", halalOverride: "unverified", resolution: "Certificate expired" }, admin)).status).toBe(200);
    const st = (await call(stats.GET as Fn, "GET", undefined, admin)).data; expect(st.users).toBeGreaterThan(3); expect(st.overrides).toHaveLength(1);
    const pl = (await (await (places.GET as any)(new Request(`http://x/api/places?category=restaurant&halal=1`))).json()).places;
    expect(pl.find((p: any) => p.id === pid)).toBeUndefined();

    // privacy: export + delete
    const ex = await call(auth.GET as Fn, "GET", undefined, c, { action: "export" }); expect(ex.data.plans.length).toBe(1);
    expect((await call(auth.POST as Fn, "POST", {}, c, { action: "delete" })).status).toBe(200);
    expect((await call(plans.GET as Fn, "GET", undefined, e)).data.plans).toHaveLength(0); // shared plan is gone with the owner
  });
});

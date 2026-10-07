process.env.DATABASE_FILE = ":memory:"; process.env.SMTP_URL = "json";
import { describe, it, expect } from "vitest";
import { compute, mkItem } from "@/lib/engine/compute";
import { checkNextLeg, delayNotice } from "@/lib/engine/delay";
import { DEMO_PLACES } from "@/lib/providers/demo-data";
import { MockTransitProvider, estimateOptions } from "@/lib/providers/mock";
import type { TransitProvider } from "@/lib/providers/types";
import { outbox, sendMail } from "@/lib/mail";
import * as auth from "@/app/api/auth/[action]/route";

const P = (id: string) => DEMO_PLACES.find((p) => p.id === id)!;
const diet = { muslim: false, vegetarian: false, vegan: false, noPork: false, noAlcohol: false, allergies: [] };
const base = { id: "d1", title: "t", date: "2026-10-17", startTime: 600, endTime: 1200, party: 2, budget: null, pace: "relaxed" as const, transport: "transit" as const, lessWalking: false, vibes: [] };
/** Stub live provider: same routes as the estimator but flagged live and `extra` min slower. */
const live = (extra: number): TransitProvider => ({ name: "stub-live", demo: false, getOptions: async (a, b) => estimateOptions(a, b, "stub-live").map((o) => ({ ...o, rideMin: o.rideMin + extra, live: true })) });

describe("live delay detection", () => {
  const build = (resAt?: number) => compute({ ...base, items: [mkItem(P("d-cafe-maru")), { ...mkItem(P("d-rest-vegan")), ...(resAt ? { reserved: true, reservedAt: resAt } : {}) }] }, { transit: new MockTransitProvider(), diet });
  it("estimates are never reported as delays", async () => {
    const it = await build(); const r = await checkNextLeg(it, it.stops[1].leg!.departAt, new MockTransitProvider());
    expect(r.live).toBe(false); expect((r as any).message).toMatch(/Live ETA unavailable/);
  });
  it("small differences are ignored; big ones notify", async () => {
    const it = await build(); const t = it.stops[1].leg!.departAt;
    const small = await checkNextLeg(it, t, live(0)); expect(small.live && small.report!.severity).toBe("none");
    const big = await checkNextLeg(it, t, live(9)); expect(big.live && big.report!.delayMin).toBe(9); expect(delayNotice((big as any).report).title).toMatch(/delayed by 9 min/);
  });
  it("flags lateness when ETA passes a reservation", async () => {
    const probe = await build(); const exp = probe.stops[1].leg!.expectedArrival; const it = await build(exp + 2);
    const r = await checkNextLeg(it, it.stops[1].leg!.departAt, live(12)); expect(r.live && r.report!.severity).toBe("late"); expect((r as any).report.wouldBeLate).toBe(true);
  });
  it("provider failure degrades gracefully", async () => {
    const it = await build(); const bad: TransitProvider = { name: "x", demo: false, getOptions: async () => { throw new Error("down"); } };
    const r = await checkNextLeg(it, it.stops[1].leg!.departAt, bad); expect(r.live).toBe(false); expect((r as any).message).toMatch(/temporarily unavailable/);
  });
});
describe("password reset email", () => {
  it("sends the reset link by SMTP and hides it from the API response", async () => {
    await auth.POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "M", email: "mail@x.com", password: "password123" }) }), { params: { action: "signup" } });
    const res = await (await auth.POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "mail@x.com" }) }), { params: { action: "forgot" } })).json();
    expect(res.devLink).toBeUndefined(); const m = outbox().at(-1); expect(m.to[0].address).toBe("mail@x.com"); expect(m.text).toMatch(/\?reset=[a-f0-9]{48}/);
  });
  it("without SMTP only logs", async () => { delete process.env.SMTP_URL; expect((await sendMail("a@b.c", "s", "t")).sent).toBe(false); });
});

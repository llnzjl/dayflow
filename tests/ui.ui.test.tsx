// UI integration test: renders the real <App/> in jsdom; fetch() is routed straight into the real Next route handlers (real SQLite, real cookies).
process.env.DATABASE_FILE = ":memory:";
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, waitFor, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as auth from "@/app/api/auth/[action]/route";
import * as state from "@/app/api/state/route";
import * as plan from "@/app/api/plan/route";
import * as plans from "@/app/api/plans/route";
import * as plansId from "@/app/api/plans/[id]/share/route";
import * as eta from "@/app/api/plans/[id]/eta/route";
import * as edit from "@/app/api/edit/route";
import * as replan from "@/app/api/replan/route";
import * as recompute from "@/app/api/recompute/route";
import * as optimize from "@/app/api/optimize/route";
import * as places from "@/app/api/places/route";
import * as context from "@/app/api/context/route";
import * as notif from "@/app/api/notifications/route";
import * as events from "@/app/api/events/route";
import * as reserve from "@/app/api/reservations/route";
import * as reports from "@/app/api/reports/route";
import { App } from "@/components/App";

let jar = "";
const R: Record<string, any> = { "/api/state": state, "/api/plan": plan, "/api/plans": plans, "/api/edit": edit, "/api/replan": replan, "/api/recompute": recompute, "/api/optimize": optimize, "/api/places": places, "/api/context": context, "/api/notifications": notif, "/api/events": events, "/api/reservations": reserve, "/api/reports": reports };
beforeAll(() => {
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, "http://localhost"); const method = (init.method || "GET").toUpperCase(); let mod: any, params: any = {};
    const am = url.pathname.match(/^\/api\/auth\/(\w+)$/); const sm = url.pathname.match(/^\/api\/plans\/([^/]+)\/(share|eta)$/);
    if (am) { mod = auth; params = { action: am[1] }; } else if (sm) { mod = sm[2] === "share" ? plansId : eta; params = { id: sm[1] }; } else mod = R[url.pathname];
    if (!mod) return new Response(JSON.stringify({ error: "no route " + url.pathname }), { status: 404 });
    const req = new Request(url, { method, headers: { "content-type": "application/json", cookie: jar }, body: init.body });
    const res: Response = await mod[method](req, { params }); const sc = res.headers.get("set-cookie"); if (sc) jar = sc.split(";")[0].endsWith("=") ? "" : sc.split(";")[0]; return res;
  }) as any;
  (navigator as any).clipboard = { writeText: async () => {} };
});

describe("UI journey", () => {
  it("signup → onboarding (Muslim, ₩100k) → AI plan → timeline, budget, halal → edit → start day", async () => {
    const u = userEvent.setup(); render(<App />);
    await u.click(await screen.findByText(/Get started/)); await u.type(screen.getByPlaceholderText("Name"), "Aisha"); await u.type(screen.getByPlaceholderText("Email"), "ui@x.com"); await u.type(screen.getByPlaceholderText(/Password/), "password123");
    await u.click(screen.getByRole("button", { name: "Continue" }));
    // onboarding
    await screen.findByText(/Let’s set you up/); await u.click(screen.getByText("Continue"));
    await u.click(await screen.findByText("Muslim / Halal")); await u.click(screen.getByText("Continue"));
    await u.click(await screen.findByText("food")); await u.click(screen.getByText("photography")); await u.click(screen.getByText("Continue"));
    await screen.findByText("Getting around"); await u.click(screen.getByText("Continue"));
    await screen.findByText("Default budget"); await u.click(screen.getByText("₩100,000")); await u.click(screen.getByText("Continue"));
    await screen.findByText(/Privacy & permissions/); await u.click(screen.getByText(/Save dietary/)); await u.click(screen.getByText("Finish"));
    // home
    expect(await screen.findByText(/What are you doing today\?/)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "✨ Plan my day" }));
    const ta = await screen.findByPlaceholderText(/romantic date tomorrow/); await u.type(ta, "Romantic date, we like food and photography. Halal.");
    await u.click(screen.getByText("Build my day"));
    // plan view
    await screen.findByText(/Date health/, {}, { timeout: 15000 });
    expect(screen.getAllByText(/Halal verified|Halal-friendly|Muslim-friendly/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Dietary requirements satisfied/)).toBeInTheDocument();
    expect(screen.getByText(/Budget & cost/)).toBeInTheDocument();
    const totalBefore = screen.getAllByText(/^₩[\d,]+$/)[0].textContent;
    // conversational edit
    await u.click(screen.getByText("Less walking")); await waitFor(() => expect(screen.getByText(/avoiding long walks/)).toBeInTheDocument(), { timeout: 10000 });
    // remove a stop through the UI → totals recalculate
    const stopsBefore = screen.getAllByText(/^\d\d:\d\d$/).length;
    await u.click(screen.getAllByText(/^(☕|🎯|🌳|🛍|🎨|🌙)/)[0]);
    await u.click(await screen.findByText("Remove")); await waitFor(() => expect(screen.getAllByText(/^\d\d:\d\d$/).length).toBeLessThan(stopsBefore), { timeout: 10000 });
    expect(totalBefore).toBeTruthy();
    // start day → live mode
    await u.click(screen.getByText("▶ Start day")); expect(await screen.findByText("NOW")).toBeInTheDocument();
    await u.click(screen.getByText(/I’m running late/)); await u.click(screen.getByText("Find solution"));
    expect(await screen.findByText(/Your plan needs an update/, {}, { timeout: 10000 })).toBeInTheDocument();
    await u.click(screen.getByText("Apply changes"));
    // persisted server-side
    await waitFor(async () => { const r = await (await fetch("/api/plans")).json(); expect(r.plans).toHaveLength(1); expect(r.plans[0].status).toBe("active"); }, { timeout: 5000 });
  }, 60000);
  it("explore search honours halal filter and login persists across a fresh render", async () => {
    cleanup(); const u = userEvent.setup(); render(<App />);
    expect(await screen.findByText(/What are you doing today\?/)).toBeInTheDocument(); // session cookie restored profile+onboarding from server
    await u.click(screen.getAllByText("Explore")[0]); await screen.findByText(/Demo data — fictional venues/);
    await waitFor(() => expect(screen.queryAllByText("Unverified").length).toBe(0));
  }, 30000);
  it("date menu asks where to meet, where to end, and city across Korea (e.g. Suwon)", async () => {
    cleanup(); const u = userEvent.setup(); render(<App />);
    expect(await screen.findByText(/What are you doing today\?/)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "✨ Plan my day" }));

    // Menu questions are present
    expect(await screen.findByText(/Where do you want the date\?/)).toBeInTheDocument();
    expect(screen.getByText(/Where do you want to meet\?/)).toBeInTheDocument();
    expect(screen.getByText(/Where would you want to end the date\?/)).toBeInTheDocument();

    // Select Suwon
    await u.click(screen.getByText(/Suwon/));
    expect(screen.getByText("Suwon Station Meeting Plaza")).toBeInTheDocument();
    expect(screen.getByText("Banghwasuryujeong Night View Pavilion")).toBeInTheDocument();

    // Pick meeting point and end point
    await u.click(screen.getByText("Suwon Station Meeting Plaza"));
    await u.click(screen.getByText("Banghwasuryujeong Night View Pavilion"));

    // Build the date
    await u.click(screen.getByText("Build my day"));

    // Itinerary is generated with Suwon and designated meeting & ending locations
    await screen.findByText(/Date health/, {}, { timeout: 15000 });
    expect(screen.getByText(/SUWON/)).toBeInTheDocument();
    expect(screen.getAllByText(/Suwon Station Meeting Plaza/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Banghwasuryujeong Night View Pavilion/).length).toBeGreaterThan(0);

    // Save to previous plans
    await u.click(screen.getByText("✓ Save to previous plans"));
    expect(await screen.findByText("✓ Previous plan")).toBeInTheDocument();

    // Go back to Plans tab and check Previous plans
    await u.click(screen.getByText("← Plans"));
    expect(await screen.findByText("Previous plans")).toBeInTheDocument();
    await u.click(screen.getByText("Previous plans"));
    expect(screen.getByText("✓ Previous plan")).toBeInTheDocument();
    expect(screen.getByText(/SUWON/)).toBeInTheDocument();
  }, 45000);
});


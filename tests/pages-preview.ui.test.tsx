import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { previewApi } from "@/lib/pages-preview";

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_PAGES_PREVIEW", "true");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Static preview must not call a server"); }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

test("creates, edits and persists a plan without a backend or credentials", async () => {
  expect((await previewApi("/api/auth/me")).user).toBeNull();
  await previewApi("/api/auth/preview", {});
  const state = await previewApi("/api/state");
  const profile = state.profile;
  const result = await previewApi("/api/plan", {
    text: "A relaxing day in Seoul", profile,
    overrides: { date: "2026-11-10", budget: 100000, startTime: 600, endTime: 1230, party: 2 },
  });
  expect(result.itinerary.stops.length).toBeGreaterThan(1);
  expect(result.itinerary.totals.total).toBeLessThanOrEqual(100000);
  const edited = await previewApi("/api/edit", { itinerary: result.itinerary, profile, command: "less walking" });
  expect(edited.itinerary.lessWalking).toBe(true);
  await Promise.all([
    previewApi("/api/plans", { itinerary: edited.itinerary }, "PUT"),
    previewApi("/api/plans", { itinerary: { ...edited.itinerary, id: "second-plan" } }, "PUT"),
  ]);
  expect((await previewApi("/api/plans")).plans).toHaveLength(2);
  await previewApi("/api/auth/logout", {});
  expect((await previewApi("/api/auth/me")).user).toBeNull();
  await previewApi("/api/auth/preview", {});
  expect((await previewApi("/api/plans")).plans).toHaveLength(2);
  await previewApi(`/api/plans?id=${edited.itinerary.id}`, undefined, "DELETE");
  expect((await previewApi("/api/plans")).plans).toHaveLength(1);
  expect(fetch).not.toHaveBeenCalled();
});

test("does not pretend sharing or online bookings succeeded; clears local data", async () => {
  await previewApi("/api/auth/preview", {});
  await expect(previewApi("/api/plans/demo/share", { email: "friend@example.com" })).rejects.toThrow("hosted app");
  expect((await previewApi("/api/reservations", { action: "slots" })).slots).toBeNull();
  await previewApi("/api/auth/delete", {});
  expect((await previewApi("/api/auth/me")).user).toBeNull();
  expect(localStorage.length).toBe(0);
});

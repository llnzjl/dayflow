import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium, expect } from "@playwright/test";

const root = resolve("out");
const basePath = process.env.PAGES_BASE_PATH ?? "/dayflow";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain" };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (!path.startsWith(`${basePath}/`)) throw new Error("Outside base path");
    const file = resolve(root, `.${path.slice(basePath.length)}${path.endsWith("/") ? "index.html" : ""}`);
    if (!file.startsWith(root + sep)) throw new Error("Outside export");
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("Not found"); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on("request", (request) => { if (new URL(request.url()).pathname.includes("/api/")) errors.push(`Unexpected API request: ${request.url()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}${basePath}/`);
  console.log("Loaded exported app.");
  await page.getByRole("button", { name: "Open planner", exact: true }).click();
  for (const heading of ["Let’s set you up", "What should we consider when planning your day?", "What do you enjoy?", "Getting around", "Default budget"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Privacy & permissions" })).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  console.log("Completed onboarding.");
  await page.getByRole("button", { name: /Plan my day/ }).click();
  await page.getByRole("button", { name: "Build my day", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Date health", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("dateflow:pages-preview:v1")).plans.length)).toBe(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Upcoming", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("dateflow:pages-preview:v1")).plans[0].stops.length)).toBeGreaterThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /Plan my day/ })).toBeVisible();
  expect(errors).toEqual([]);
  console.log("Pages browser check passed: subpath assets, onboarding, planning, persistence, mobile view, no API requests or runtime errors.");
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}

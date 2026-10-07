import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getDb, id } from "./db";

export interface User { id: string; email: string; name: string; isAdmin: boolean }
const COOKIE = "df_session"; const DAY = 864e5;
export const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function hashPassword(pw: string, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString("hex") };
}
export function verifyPassword(pw: string, salt: string, hash: string) {
  const a = Buffer.from(crypto.scryptSync(pw, salt, 64).toString("hex")), b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  getDb().prepare("INSERT INTO sessions VALUES (?,?,?)").run(sha(token), userId, Date.now() + 30 * DAY);
  return token;
}
export const cookieHeader = (token: string | null) =>
  `${COOKIE}=${token ?? ""}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${token ? 30 * 86400 : 0}${process.env.COOKIE_SECURE === "1" ? "; Secure" : ""}`;
export function userFrom(req: Request): User | null {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`${COOKIE}=([a-f0-9]+)`)); if (!m) return null;
  const db = getDb();
  const r = db.prepare("SELECT u.id, u.email, u.name, u.is_admin, s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?").get(sha(m[1])) as any;
  if (!r || r.expires_at < Date.now()) return null;
  return { id: r.id, email: r.email, name: r.name, isAdmin: !!r.is_admin };
}
export const tokenFrom = (req: Request) => (req.headers.get("cookie") || "").match(new RegExp(`${COOKIE}=([a-f0-9]+)`))?.[1] ?? null;
export const isAdminEmail = (email: string) => (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean).includes(email.toLowerCase());

// ---- AES-256-GCM for sensitive profile data (dietary / religious settings) ----
function key() {
  let secret = process.env.APP_SECRET;
  if (!secret) {
    if (process.env.DATABASE_FILE === ":memory:") secret = "test-secret";
    else { const f = path.join(process.cwd(), "data", ".dev-secret"); fs.mkdirSync(path.dirname(f), { recursive: true }); if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString("hex")); secret = fs.readFileSync(f, "utf8"); }
  }
  return crypto.createHash("sha256").update(secret).digest();
}
export function encrypt(text: string) {
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
export function decrypt(blob: string) {
  const [iv, tag, enc] = blob.split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
const hits = new Map<string, number[]>();
/** Tiny in-memory rate limiter (per process). Use Redis in multi-instance deployments. */
export function rateLimit(k: string, max: number, windowMs: number) {
  const now = Date.now(); const a = (hits.get(k) ?? []).filter((t) => now - t < windowMs); a.push(now); hits.set(k, a); return a.length > max;
}
export { id };

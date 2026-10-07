import crypto from "crypto";
import { getDb, id } from "@/lib/db";
import { cookieHeader, createSession, hashPassword, isAdminEmail, rateLimit, sha, tokenFrom, userFrom, verifyPassword } from "@/lib/auth";
import { getState, listPlans } from "@/lib/repo";
import { json } from "@/lib/http";
import { sendMail } from "@/lib/mail";

const ip = (r: Request) => r.headers.get("x-forwarded-for") || "local";
export async function GET(req: Request, { params }: { params: { action: string } }) {
  const u = userFrom(req);
  if (params.action === "me") return json({ user: u });
  if (params.action === "export") {
    if (!u) return json({ error: "Please log in." }, 401);
    const db = getDb();
    return json({ account: { name: u.name, email: u.email }, state: getState(u.id), plans: listPlans(u).filter((p) => p.role === "owner"),
      notifications: db.prepare("SELECT kind,title,body,created_at FROM notifications WHERE user_id=?").all(u.id), reports: db.prepare("SELECT place_id,type,note,status,created_at FROM reports WHERE user_id=?").all(u.id) });
  }
  return json({ error: "Not found" }, 404);
}
export async function POST(req: Request, { params }: { params: { action: string } }) {
  const db = getDb(); const b = await req.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  switch (params.action) {
    case "signup": {
      if (rateLimit("signup:" + ip(req), 20, 36e5)) return json({ error: "Too many attempts. Try later." }, 429);
      if (!String(b.name || "").trim() || !/^\S+@\S+\.\S+$/.test(email) || String(b.password || "").length < 8) return json({ error: "Enter a name, a valid email and a password of 8+ characters." }, 400);
      if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) return json({ error: "An account with this email already exists." }, 409);
      const uid = id(); const { salt, hash } = hashPassword(b.password);
      db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?)").run(uid, email, String(b.name).trim(), salt, hash, isAdminEmail(email) ? 1 : 0, Date.now());
      return json({ ok: true }, 200, { "Set-Cookie": cookieHeader(createSession(uid)) });
    }
    case "login": {
      if (rateLimit("login:" + email + ip(req), 8, 10 * 60e3)) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);
      const r = db.prepare("SELECT * FROM users WHERE email=?").get(email) as any;
      if (!r || !verifyPassword(String(b.password || ""), r.pw_salt, r.pw_hash)) return json({ error: "Email or password is incorrect." }, 401);
      if (isAdminEmail(email) && !r.is_admin) db.prepare("UPDATE users SET is_admin=1 WHERE id=?").run(r.id);
      return json({ ok: true }, 200, { "Set-Cookie": cookieHeader(createSession(r.id)) });
    }
    case "logout": { const t = tokenFrom(req); if (t) db.prepare("DELETE FROM sessions WHERE token_hash=?").run(sha(t)); return json({ ok: true }, 200, { "Set-Cookie": cookieHeader(null) }); }
    case "forgot": {
      if (rateLimit("forgot:" + ip(req), 5, 36e5)) return json({ error: "Too many requests." }, 429);
      const r = db.prepare("SELECT id FROM users WHERE email=?").get(email) as any; let devLink: string | undefined;
      if (r) { const t = crypto.randomBytes(24).toString("hex"); db.prepare("INSERT INTO reset_tokens VALUES (?,?,?)").run(sha(t), r.id, Date.now() + 36e5);
        const link = `${process.env.APP_URL || new URL(req.url).origin}/?reset=${t}`;
        const m = await sendMail(email, "Reset your DateFlow password", `Open this link within 1 hour to choose a new password:\n\n${link}\n\nIf you didn't ask for this, ignore this email.`);
        if (!m.sent && process.env.NODE_ENV !== "production") devLink = link; /* dev only: shown on screen when no SMTP is configured */ }
      return json({ ok: true, message: "If that email exists, a reset link has been created.", devLink });
    }
    case "reset": {
      const t = db.prepare("SELECT * FROM reset_tokens WHERE token_hash=?").get(sha(String(b.token || ""))) as any;
      if (!t || t.expires_at < Date.now()) return json({ error: "This reset link is invalid or expired." }, 400);
      if (String(b.password || "").length < 8) return json({ error: "Password must be 8+ characters." }, 400);
      const { salt, hash } = hashPassword(b.password);
      db.prepare("UPDATE users SET pw_salt=?, pw_hash=? WHERE id=?").run(salt, hash, t.user_id);
      db.prepare("DELETE FROM reset_tokens WHERE user_id=?").run(t.user_id); db.prepare("DELETE FROM sessions WHERE user_id=?").run(t.user_id);
      return json({ ok: true });
    }
    case "delete": {
      const u = userFrom(req); if (!u) return json({ error: "Please log in." }, 401);
      db.prepare("DELETE FROM shares WHERE email=?").run(u.email); db.prepare("DELETE FROM users WHERE id=?").run(u.id);
      return json({ ok: true }, 200, { "Set-Cookie": cookieHeader(null) });
    }
  }
  return json({ error: "Not found" }, 404);
}

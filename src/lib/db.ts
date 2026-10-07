import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, pw_salt TEXT NOT NULL, pw_hash TEXT NOT NULL, is_admin INTEGER DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS user_state (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, profile_enc TEXT, data TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS itineraries (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, json TEXT NOT NULL, status TEXT DEFAULT 'upcoming', live_json TEXT, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_it_owner ON itineraries(owner_id);
CREATE TABLE IF NOT EXISTS shares (itinerary_id TEXT NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE, email TEXT NOT NULL, role TEXT NOT NULL, eta_sharing INTEGER DEFAULT 0, created_at INTEGER NOT NULL, PRIMARY KEY (itinerary_id, email));
CREATE INDEX IF NOT EXISTS idx_share_email ON shares(email);
CREATE TABLE IF NOT EXISTS places (id TEXT PRIMARY KEY, json TEXT NOT NULL, source TEXT, lat REAL, lng REAL, fetched_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_places_geo ON places(lat, lng);
CREATE TABLE IF NOT EXISTS place_overrides (place_id TEXT PRIMARY KEY, halal TEXT, note TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE, stop_uid TEXT, place_id TEXT, date TEXT, time TEXT, party INTEGER, status TEXT, provider TEXT, code TEXT, demo INTEGER, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, key TEXT NOT NULL, kind TEXT, title TEXT, body TEXT, created_at INTEGER NOT NULL, read INTEGER DEFAULT 0, UNIQUE(user_id, key));
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL, place_id TEXT, place_name TEXT, type TEXT, note TEXT, status TEXT DEFAULT 'open', resolution TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE TABLE IF NOT EXISTS transport_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, itinerary_id TEXT NOT NULL, stop_uid TEXT NOT NULL, planned_min INTEGER, live_min INTEGER, delay_min INTEGER, source TEXT, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_snap ON transport_snapshots(itinerary_id, stop_uid, at);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS ai_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, kind TEXT, input TEXT, summary TEXT, at INTEGER NOT NULL);
`;
const g = globalThis as unknown as { __dfdb?: Database.Database };
export function getDb(): Database.Database {
  if (g.__dfdb) return g.__dfdb;
  const file = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "dateflow.db");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file); db.pragma("journal_mode = WAL"); db.pragma("foreign_keys = ON"); db.exec(SCHEMA);
  g.__dfdb = db; return db;
}
export const id = () => crypto.randomUUID();

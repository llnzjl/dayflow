-- PRODUCTION REFERENCE SCHEMA (PostgreSQL + PostGIS).
-- NOT wired into the app: the app currently runs on SQLite (src/lib/db.ts) with the same entities.
-- To migrate, port src/lib/db.ts + src/lib/repo.ts to a Postgres client (pg / Drizzle / Prisma) using this schema.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE users (id uuid PRIMARY KEY, email citext UNIQUE NOT NULL, name text NOT NULL, pw_salt text NOT NULL, pw_hash text NOT NULL, is_admin boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE TABLE profiles (user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE, lang text, currency text DEFAULT 'KRW', default_budget int, mobility text, transport text, pace text, notifications boolean DEFAULT true);
CREATE TABLE dietary_preferences (user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE, encrypted_blob bytea NOT NULL, consent_at timestamptz);   -- app-level AES-GCM
CREATE TABLE preferences (user_id uuid REFERENCES users ON DELETE CASCADE, kind text CHECK (kind IN ('interest','dislike')), value text, PRIMARY KEY (user_id, kind, value));
CREATE TABLE places (id text PRIMARY KEY, name text, name_ko text, category text, address text, geom geography(Point,4326), price_min int, price_max int, stay_min int, open_time time, close_time time, indoor boolean, accessible boolean, rating numeric(2,1), source text, fetched_at timestamptz);
CREATE INDEX places_geom_gix ON places USING gist (geom);
CREATE TABLE place_sources (place_id text REFERENCES places ON DELETE CASCADE, field text, source text, fetched_at timestamptz);
CREATE TABLE place_dietary_metadata (place_id text PRIMARY KEY REFERENCES places ON DELETE CASCADE, halal text CHECK (halal IN ('halal_verified','halal_friendly','muslim_friendly','user_reported','unverified')), vegan text, alcohol boolean, source text, updated_at timestamptz);
CREATE TABLE prices (place_id text REFERENCES places ON DELETE CASCADE, min int, max int, basis text, source text, fetched_at timestamptz);
CREATE TABLE itineraries (id uuid PRIMARY KEY, owner_id uuid REFERENCES users ON DELETE CASCADE, title text, date date, party int, budget int, status text, doc jsonb NOT NULL, live jsonb, updated_at timestamptz DEFAULT now());
CREATE INDEX itineraries_owner_idx ON itineraries (owner_id, date);
CREATE TABLE itinerary_stops (id uuid PRIMARY KEY, itinerary_id uuid REFERENCES itineraries ON DELETE CASCADE, position int, place_id text REFERENCES places, duration_min int, reserved boolean, reserved_at int, user_price int);
CREATE TABLE routes (id uuid PRIMARY KEY, itinerary_id uuid REFERENCES itineraries ON DELETE CASCADE, from_stop uuid, to_stop uuid, mode text, total_min int, fare int, source text, live boolean);
CREATE TABLE shared_itineraries (itinerary_id uuid REFERENCES itineraries ON DELETE CASCADE, email citext, role text CHECK (role IN ('viewer','editor','organizer')), eta_sharing boolean DEFAULT false, PRIMARY KEY (itinerary_id, email));
CREATE TABLE reservations (id uuid PRIMARY KEY, itinerary_id uuid REFERENCES itineraries ON DELETE CASCADE, stop_id uuid, place_id text, date date, time time, party int, status text, provider text, code text, demo boolean);
CREATE TABLE transport_snapshots (id bigserial PRIMARY KEY, route_id uuid, taken_at timestamptz, eta_min int, delay_min int, source text);
CREATE TABLE weather_snapshots (id bigserial PRIMARY KEY, date date, taken_at timestamptz, payload jsonb, source text);
CREATE TABLE saved_places (user_id uuid REFERENCES users ON DELETE CASCADE, place_id text REFERENCES places, PRIMARY KEY (user_id, place_id));
CREATE TABLE notifications (id uuid PRIMARY KEY, user_id uuid REFERENCES users ON DELETE CASCADE, key text, kind text, title text, body text, created_at timestamptz DEFAULT now(), read boolean DEFAULT false, UNIQUE (user_id, key));
CREATE TABLE ai_conversations (id uuid PRIMARY KEY, user_id uuid REFERENCES users ON DELETE CASCADE, itinerary_id uuid, created_at timestamptz DEFAULT now());
CREATE TABLE ai_actions (id bigserial PRIMARY KEY, conversation_id uuid, user_id uuid, kind text, input text, summary text, at timestamptz DEFAULT now());
CREATE TABLE user_feedback (user_id uuid REFERENCES users ON DELETE CASCADE, place_id text, rating text, accuracy jsonb, at timestamptz DEFAULT now());
CREATE TABLE reports (id uuid PRIMARY KEY, user_id uuid REFERENCES users ON DELETE SET NULL, place_id text, type text, note text, status text DEFAULT 'open', resolution text, created_at timestamptz DEFAULT now());
CREATE TABLE place_overrides (place_id text PRIMARY KEY, halal text, note text, updated_at timestamptz);
CREATE TABLE events (id bigserial PRIMARY KEY, name text NOT NULL, at timestamptz DEFAULT now());

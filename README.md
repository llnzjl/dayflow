# DateFlow — AI smart itinerary & day planner

> Status: under development
> This project is not finished and is not intended for production or public use yet. It is a development preview only.

Next.js 14 · TypeScript · Tailwind · Framer Motion · SQLite (better-sqlite3). Brand name/colors live in `src/lib/brand.ts`.

## Run locally (VS Code)
1. Install **Node.js 18.18+**.
2. Open this folder in VS Code → terminal (Ctrl+`).
3. `npm install`
4. `cp .env.example .env.local` (Windows: `copy .env.example .env.local`)
5. `npm run dev` → http://localhost:3000
6. Sign up → onboarding → **✨ Plan my day**.

Other commands: `npm test` · `npm run typecheck` · `npm run build && npm start`.
The SQLite database is created automatically at `./data/dateflow.db` (delete `data/` to reset everything).
If `npm install` fails building `better-sqlite3` on Windows/ARM, install the "Desktop development with C++" build tools (or Python + Xcode CLT on macOS) and retry.

## What is real vs demo
| Area | Status |  
|---|---|
| Auth (scrypt passwords, httpOnly session cookie, rate limits, password reset, export, delete) | Real, stored in SQLite |
| Dietary/religious profile | Real, AES-256-GCM encrypted with `APP_SECRET`; saved only with consent |
| Itinerary engine: timing, buffers, opening hours, costs, budget, health, gaps, replanning, optimizer, edit commands | Real code (backend arithmetic, unit-tested) |
| Place validation: stops must come from the PlaceProvider; server rejects unknown places and recalculates every saved plan | Real |
| Sharing (viewer/editor/organizer), live ETA sharing without location | Real, permission-checked and tested |
| Notifications (leave-now, reservation soon, tight, rain), deduplicated | Real in-app + browser Notification API (no push when the tab is closed) |
| Reports + admin (`/admin`): resolve, halal-status override, stats | Real |
| Places, prices, hours, halal data | **Demo data** (fictional venues) until a real provider is connected |
| Transit routes | **Estimates**, labelled "Live ETA unavailable". TAGO bus-arrival helper exists but is not wired to live routing |
| Reservations | **Demo provider** (deterministic slots, codes `DEMO-…`). No free public Korean booking API exists; implement `ReservationProvider` with a partner API. "I booked elsewhere" is a manual marker |
| AI | Optional OpenAI for *intent extraction only*; without a key a rule-based parser is used. The LLM never creates places, prices or math |

## Provider switches (`.env.local`)
`MAP_PROVIDER`, `PLACE_PROVIDER`, `TRANSIT_PROVIDER`, `WEATHER_PROVIDER`, `PRAYER_PROVIDER`, `RESERVATION_PROVIDER`. Default is `mock`.
- **Weather / prayer (no keys):** `WEATHER_PROVIDER=openmeteo`, `PRAYER_PROVIDER=aladhan`.
- **NAVER:** create an app in NAVER Cloud Platform (Application Services → Maps: Dynamic Map, Geocoding, Reverse Geocoding, Directions) → `NAVER_NCP_KEY_ID`, `NAVER_NCP_KEY`, and `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` (register your site URL e.g. http://localhost:3000). For place search create an app at developers.naver.com with the *Search* API → `NAVER_SEARCH_CLIENT_ID/SECRET`. Then `MAP_PROVIDER=naver`, `PLACE_PROVIDER=naver`. NAVER Local Search has **no halal, price or hours data**, so those places stay "Unverified". Check endpoints against your console — NCP has changed API hosts before.
- **Transit:** `TRANSIT_PROVIDER=korean`, `TAGO_SERVICE_KEY` (data.go.kr → 국토교통부 TAGO 버스도착정보), `SEOUL_OPEN_DATA_KEY` (data.seoul.go.kr). Route options remain estimates until you add a routing source.
- **AI:** `OPENAI_API_KEY` (+ `OPENAI_MODEL`).
- **Admin:** `ADMIN_EMAILS=you@example.com`, sign up/log in with it, open `/admin`.
- **Security:** set a long random `APP_SECRET` (changing it makes stored profiles unreadable), `COOKIE_SECURE=1` behind HTTPS.

Adding a provider: implement the interface in `src/lib/providers/types.ts`, register it in `src/lib/providers/index.ts`.

## Tests
`npm test` runs 21 tests: engine units (buffers, budget, diet filtering, routes, optimizer, replanning, intent) and a server-side end-to-end journey over the real route handlers with real SQLite and cookies (signup → Muslim profile → ₩100k AI plan → edits → budget recalculation → reservation → running late → notifications → sharing & permissions → report → admin override → export/delete).
Browser (Playwright) tests are **not** included; the UI has been type-checked and built but not click-tested by automation.

## Deploy
SQLite needs a persistent disk, so use a VPS/container (Fly.io volume, Railway volume, Docker) rather than serverless:
1. `npm ci && npm run build`, set env vars, mount a volume for `DATABASE_FILE` (e.g. `/data/dateflow.db`).
2. `npm start` behind HTTPS (Caddy/nginx), `COOKIE_SECURE=1`.
3. For serverless (Vercel) or multiple instances, migrate storage to PostgreSQL using `db/schema.postgres.sql` (reference schema; port `src/lib/db.ts` and `repo.ts`), and replace the in-memory rate limiter/cache with Redis.
4. Password-reset emails: the link is only printed to the server log (and returned in dev). Add an email sender in `src/app/api/auth/[action]/route.ts` before going public.

## Known gaps
No Redis/queue workers (live refresh is client-driven every minute while a plan is active); no web-push when the app is closed; no live bus/subway delay detection; PostgreSQL/PostGIS is a reference schema only; Korean/English UI strings are English-only so far (`lang` is stored but not yet used for translation).

## Added in the latest build
- Password-reset email via SMTP (`SMTP_URL`, `MAIL_FROM`, `APP_URL`).
- Live delay monitor (`/api/monitor`): only trips flagged `live:true` by a transit provider count as delays. The bundled providers return estimates, so you'll see "Live ETA unavailable" until a live source is connected.
- UI integration tests (jsdom) in `tests/ui.ui.test.tsx`. Playwright is installed but no browser tests are written yet.
- Kakao Mobility (car ETA) is NOT wired in yet. Kakao has no public-transit routing API.

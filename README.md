# Job OS: field-service template

A small, working starting point for a field-service business app. A trade business starts from it and builds the rest of
its own way of working on Emergent. It covers
heating, plumbing, electrical, appliance repair, cleaning, lawn and pest, and similar trades. One job record runs from
the first call to the next visit:

**Lead → Quote (good / better / best) → Schedule → Technician on site → Invoice & payment → Review → Next visit (plans)**

It is built from what 73 paying field-service builders on Emergent actually built and struggled with
(`product-requirements/template-strategy/field-service-findings` and `field-service-template`).

## Run it (2 minutes, nothing to install but Python and Node)
```
./scripts/dev.sh
```
- **Web app:** http://localhost:3000. Use the **Owner / Office / Technician** demo buttons on the sign-in page.
- **API docs:** http://127.0.0.1:8010/docs.
- **Demo data:** the demo business, "Summit Heating & Plumbing", loads automatically. It runs on an in-memory database and resets on restart.

With a real MongoDB: `docker compose up --build`. Or set `MONGO_URL` in `backend/.env` (see `.env.example`).

## Run it on Emergent
Emergent apps are **one React app** (`/app/frontend`, port 3000) plus a **FastAPI backend** (`/app/backend`, port 8001,
every route under `/api`) and MongoDB. This template already has that shape:
- `backend/server.py` (one file) → `uvicorn server:app --host 0.0.0.0 --port 8001` (reads `MONGO_URL`, `DB_NAME`; set `JWT_SECRET`).
- `frontend` → `yarn start` / `npm start` on :3000; the API base comes from `REACT_APP_BACKEND_URL` (or same origin `/api`).
- Office app, technician app (`/tech`, installable PWA) and customer pages (`/q`, `/pay`, `/portal`, `/track`, `/book`) are
  all routes of the same single React app.

## What's in it (the base)
1. **Leads:** missed calls get an automatic text back.
2. **Customers:** customers, sites and equipment.
3. **Price book and quotes:** quotes with options from the price book, which the customer approves by link.
4. **Schedule:** a board that blocks double booking.
5. **Technician app** (`/tech`): on my way, checklist, photos and signature before a job can finish.
6. **Invoices and payments:** a demo checkout; plans and memberships; a simple owner home and reports.
7. **Messages:** two-way texting with customers through Twilio; replies come in on a webhook.
8. **Ask about your business:** on every page; knows the page and the record you're on.
9. **AI visibility:** checks whether ChatGPT, Claude, Gemini or Perplexity recommend the business for its trade and town.

Connect text messaging and AI by adding keys (see `backend/.env.example` and `docs/INTEGRATIONS.md`); Settings → Connections shows what's connected.

## What owners build next (on Emergent)
The **Build next** page in the app lists what field-service owners ask for most, each with a ready-to-paste prompt:
- certificates, change orders, maintenance contracts and van stock;
- an AI receptionist, map and routes, financing, reviews, commission;
- roles, a resell-it mode, and the payment, SMS and accounting connections;
- country packs.

The research behind it is in `docs/research/` and `docs/WHITE_LABEL_PLAN.md`.

## Where things are
| Area | Where |
|---|---|
| API (one file) | `backend/server.py` |
| Demo data | `backend/seed.py` |
| Tests (the core journey) | `backend/tests/` |
| Web app, tech app, customer pages | `frontend/src/pages/` |
| What to build next (with prompts) | `frontend/src/pages/BuildNext.jsx` |
| What the agent reads first | `AGENTS.md` |

## Tests
```
./scripts/test.sh      # backend journey tests + frontend build
```

# Decisions (append-only)

## 1. Field service first, built from what paying builders made *(1 Oct 2026)*
- **What:** the first template is field service (HVAC, plumbing, electrical and similar).
- **Why:** it has the highest power-user rate on Emergent (13.8 per 1,000 builders) and 73 paying builders whose builds we studied.
- **Revisit if:** another category shows stronger demand.

## 2. The template is a small starting point, not a finished product *(2 Oct 2026, owner's call)*
- **What:** the core journey works end to end; everything else is a prompt on the "Build next" page.
- **Why:** if the template ships everything, there's nothing left for users to build on Emergent. Dealer OS follows the same idea.
- **Gave up:** nine feature modules that were built and then removed (kept locally in `job-os-extras/`, not in the repo): change orders, financing, certificates, contracts, stock, roles, AI assistant, map, reviews.

## 3. Emergent's shape: one React app + one backend file *(2 Oct 2026)*
- **What:** `backend/server.py` (FastAPI + MongoDB) and one React app holding the office screens, the technician PWA and the customer pages.
- **Why:** it's what Emergent runs and what its agent extends best. A single readable file beats a framework for a template.
- **Gave up:** the rules engine, trade/country packs, hooks and the plugin system (about 3,300 lines down to about 940).

## 4. Keep a real backend (not browser-only like Dealer OS) *(2 Oct 2026)*
- **What:** data lives on the server (MongoDB). Demo mode uses an in-memory database.
- **Why:** a buyer needs office ↔ technician phone sync and saved data from day one.
- **Revisit if:** we want a no-network sales demo; then add a browser demo mode.

## 5. Third parties are simulated in the template *(2 Oct 2026)*
- **What:** payments, SMS and email are logged or demo-only.
- **Why:** no keys are needed to run, and nothing is sent by accident. `INTEGRATIONS.md` says how to connect each one.

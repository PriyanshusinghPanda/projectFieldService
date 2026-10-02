# Job OS: rules for everyone who builds on it

## What this is
A small field-service template that a business finishes on Emergent. Keep the core small and correct; add features as needed, using `docs/BACKLOG.md` and the in-app "Build next" prompts.

## Layout (the same shape as every Emergent app)
| Path | What |
|---|---|
| `backend/server.py` | The whole API: FastAPI and MongoDB (Motor). Every route is under `/api`. It reads `MONGO_URL`, `DB_NAME` and `JWT_SECRET`; without `MONGO_URL` it uses an in-memory database with demo data. |
| `backend/seed.py` | Demo business "Summit Heating & Plumbing" (fictional). |
| `backend/tests/` | Journey tests; extend them for every rule you add. |
| `frontend/src/pages/` | The one React app: office screens, `tech/` (the technician PWA at `/tech`), `public/` (customer pages: `/q`, `/pay`, `/portal`, `/track`, `/book`). |
| `frontend/src/components/ui.jsx`, `styles.css` | The design system. Use it; don't add CSS frameworks. |
| `frontend/src/pages/BuildNext.jsx` | The "what to build next" page with prompts. |

## The non-negotiables
1. **Scope:** every query is scoped by `org_id` (use the helpers `find`, `get`, `insert` and `update` in server.py).
2. **Money:** integer cents. Totals come from `totals()`, the same function for quotes, jobs and invoices.
3. **Quotes:** an approved quote is locked. Changes after approval are new records, such as change orders when you build them.
4. **Scheduling:** no double booking a technician.
5. **Finishing a job:** a job can't finish without its required checklist items and a customer signature.
6. **Technicians:** they never see costs or margins.
7. **Customer links:** customers use token links. Public endpoints never return costs or internal notes.
8. **Demo data:** fictional names and numbers only.

## How to add a feature
1. Add its records and endpoints to `server.py`, in a section with a comment header. Split into modules only when the file gets hard to read.
2. Add or extend a page in `frontend/src/pages`, a route in `App.jsx`, and a sidebar entry in `components/Layout.jsx`.
3. Add demo data in `seed.py` so the feature shows something on first load.
4. Add a test in `backend/tests/`.
5. Mark it done in `docs/BACKLOG.md` and remove its card from `BuildNext.jsx`.

## Definition of done
- `./scripts/test.sh` passes (backend tests + frontend build).
- The screen works with the demo data as owner, office and technician, has loading, empty and error states, and looks finished.

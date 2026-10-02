# Agent guide: read this first

This is the **Job OS field-service template**: a deliberately small starting point. A business bought it and will ask
you to shape it to their trade. Most features are meant to be **added by you** on top of this base. The in-app
"Build next" page (`frontend/src/pages/BuildNext.jsx`) lists the features owners ask for most, with a prompt for each.

## Shape (the same as every Emergent app)
- **Backend:** `backend/server.py`, one FastAPI file with MongoDB via Motor (`MONGO_URL`, `DB_NAME`); every route is under `/api`. `backend/seed.py` holds the demo data.
- **Frontend:** one React app (`frontend/`, Vite, port 3000). Office screens are in `src/pages`, the technician app is in `src/pages/tech` (`/tech`), and customer pages are in `src/pages/public` (`/q`, `/pay`, `/portal`, `/track`, `/book`). The design system is in `src/styles.css` and `src/components/ui.jsx`.

## Keep these working
- One job record: quote (options) → approve by link → job → schedule (no double booking) → tech on site (checklist and signature before finishing) → invoice → payment.
- Money is integer cents. Approved quotes are locked. Techs don't see costs. Every query is scoped by `org_id`.
- Tests: `cd backend && .venv/bin/python -m pytest -q`. Add a test for each rule you add. The frontend must build: `cd frontend && npx vite build`.

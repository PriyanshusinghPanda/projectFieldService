# Frontend brief (for anyone building screens)

**Product:** Job OS, a field-service template we sell to trade businesses (HVAC, plumbing, electrical…).
The demo business is "Summit Heating & Plumbing" (fictional). Every screen must look finished and real in a sales demo:
- real data from the API, no lorem ipsum;
- clear empty and loading states;
- errors shown with `<ErrorBox>` or a toast.

## Stack and rules
- **Stack:** React 18 + Vite (plain JS/JSX) + react-router-dom v6. No other npm packages, no CSS frameworks.
- **Styling:**
  - Use the classes in `src/styles.css`: `card`, `tile`, `btn`, `pill`, `t` (table), `row`, `col`, `grid g2/g3/g4`, `tabs`, `phone`, `callout`.
  - Use the components in `src/components/ui.jsx`: `Button`, `Card`, `Tile`, `PageHead`, `Field`, `Tabs`, `Modal`, `Money`, `Status`, `Pill`, `Empty`, `Loading`, `ErrorBox`, `useToast`, `Avatar`.
  - Page-specific styles go inline (`style={{}}`) or in a `<style>` tag inside your page file. **Do not edit shared files** (`styles.css`, `ui.jsx`, `api.js`, `App.jsx`, `Layout.jsx`, `format.js`, `auth.jsx`, `useApi.js`).
  - If you need a helper, define it inside your own page file.
- **Data:**
  - Load with `const { data, loading, error, reload } = useApi("/api/...")`.
  - Write with `api.post / api.patch` (from `src/lib/api.js`).
  - The technician app writes with `api.techWrite(path, body)`. It works offline, and a queued result returns `{queued: true}`.
- **Money:** always integer cents from the API. Display it with `<Money cents={...}/>` or `money()` from `src/lib/format.js`. Convert input with `toCents()`.
- **Dates:** scheduled times are local ISO strings without a timezone (`2026-10-01T09:00:00`). Helpers: `time()`, `day()`, `ago()`, `localISODate()`.
- **Status labels and colours:** `<Status s={job.status}/>` (map in `format.js`).
- **Office pages:**
  - render inside `Layout` (sidebar already there);
  - wrap content in `<div className="page">` and start with `<PageHead title=... sub=...>actions</PageHead>`.
- **Phone pages** (tech app, customer links): use `phone`, `phone-head`, `phone-body` and `phone-foot`.
- **Done means:** `npx vite build` passes (run it in `frontend/`), and the screen works against the running API.

## Running API
- **Address:** `http://127.0.0.1:8010` (in-memory demo data, reloads on restart).
- **Get a token:**
  ```
  T=$(curl -s -XPOST 127.0.0.1:8010/api/auth/demo/owner | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
  curl -s 127.0.0.1:8010/api/home -H "Authorization: Bearer $T"
  ```
  Roles are `owner`, `office` and `tech` (the tech is Marco Diaz). Explore real response shapes with curl before you build.
- **Endpoint source:** `backend/app/routers/*.py`. The read-only interactive docs are at http://127.0.0.1:8010/docs.

## Endpoints
All in `backend/server.py` (one file); open http://127.0.0.1:8010/docs for the live list.

// "Build next on Emergent": static list of the features owners in the trade ask for, each with a ready-to-paste prompt.
// No API calls. Edit FEATURES to add or reword ideas.
import { useState } from "react";
import { Award, Bot, Boxes, Building2, Coins, CreditCard, FilePlus2, FileSignature, Globe2, Map as MapIcon, Plug, ShieldCheck, Star } from "lucide-react";
import { Button, PageHead, useToast } from "../components/ui";

const STACK = "This app is a field-service template: backend is a single FastAPI file backend/server.py using MongoDB (keep every route under /api and scoped to the signed-in org), frontend is React + Vite with one page per file in frontend/src/pages, shared UI in frontend/src/components/ui.jsx, routes in frontend/src/App.jsx and sidebar nav in frontend/src/components/Layout.jsx. Money is stored in integer cents. Reuse the existing design system (styles.css + ui.jsx) and keep the existing pages working.";

const FEATURES = [
  {
    name: "Certificates & service reports",
    icon: Award,
    why: "Compliance work lives or dies on the paperwork, and next-due dates are repeat revenue.",
    does: [
      "Report or certificate templates per job type, filled in on the tech app and locked once signed",
      "Numbered PDF sent to the customer and kept on the site/equipment history",
      "Next-due date with an automatic reminder and a one-click follow-up job",
    ],
    prompt: `Add certificates and service reports.
- Backend (backend/server.py): add a "report_templates" collection (name, job_type, fields: [{key, label, type: text|number|pass_fail|date}], validity_months) with CRUD under /api/report-templates, and a "reports" collection linked to job_id, site_id and equipment_id. Add POST /api/jobs/{id}/report to save field values, and POST /api/reports/{id}/issue that assigns the next sequential number, sets issued_on and next_due_on (issued_on + validity_months), locks it from further edits and stores the customer signature from the job.
- Add GET /api/reports?due_before=YYYY-MM-DD for upcoming renewals, and a printable public page /r/:token (like the existing public quote page) the customer can open.
- Frontend: a "Report" section in frontend/src/pages/tech/TechJob.jsx and frontend/src/pages/JobDetail.jsx to fill the template, a new page frontend/src/pages/Certificates.jsx (add to App.jsx and the Records group in Layout.jsx) listing issued and due-soon reports with a "Book follow-up" button that creates a job, and a template editor in Settings.`,
  },
  {
    name: "Change orders",
    icon: FilePlus2,
    why: "The approved quote is the contract; extra work needs its own signed yes before it hits the invoice.",
    does: [
      "Add, remove or change lines on an approved quote as a separate change order",
      "Customer approves the change by link, with signature",
      "Approved changes roll into the job and the final invoice automatically",
    ],
    prompt: `Add change orders to approved quotes.
- Backend (backend/server.py): add a "change_orders" collection linked to quote_id and job_id with lines (same shape as quote lines), a reason, status (draft|sent|approved|declined), totals and a public token. Endpoints: POST /api/quotes/{id}/change-orders, PATCH /api/change-orders/{id}, POST /api/change-orders/{id}/send, and public GET/POST /api/public/change-orders/{token} to view and approve with a typed name + signature.
- When a change order is approved, append its lines to the job's parts/lines so the existing invoice creation includes them, and record it on the job timeline.
- Frontend: a "Change orders" card in frontend/src/pages/QuoteBuilder.jsx (approved quotes only) and frontend/src/pages/JobDetail.jsx, plus a public approval page frontend/src/pages/public/ChangeOrderApprove.jsx at route /co/:token modelled on public/QuoteApprove.jsx.`,
  },
  {
    name: "Maintenance contracts",
    icon: FileSignature,
    why: "Contracts (AMC/PPM) are the steadiest revenue a service business has, if renewals don't slip.",
    does: [
      "Contract with visit cycles (monthly, quarterly, custom) per site and asset",
      "Response-time SLA tracked on every job raised under the contract",
      "Renewal reminders and a renewal quote generated before expiry",
    ],
    prompt: `Extend plans into maintenance contracts (AMC/PPM).
- Backend (backend/server.py): add a "contracts" collection: customer_id, site_ids, equipment_ids, start_on, end_on, cycle (monthly|quarterly|half_yearly|yearly|custom days), visits_per_cycle, price_cents, billing (upfront|per_cycle), sla_response_hours, status. CRUD under /api/contracts.
- POST /api/contracts/{id}/generate creates the planned visit jobs for the contract period (unscheduled, so they show in the Schedule page's unscheduled list) and tags them with contract_id.
- Store sla_due_at on jobs created under a contract and expose breached/at-risk counts on GET /api/contracts/{id}.
- GET /api/contracts?expiring_within=60 for renewals, and POST /api/contracts/{id}/renew that copies it forward and creates a renewal quote.
- Frontend: new page frontend/src/pages/Contracts.jsx (list, detail drawer, SLA pills, renew button), add it to App.jsx and the "Win & get paid" group in Layout.jsx.`,
  },
  {
    name: "Van stock & parts",
    icon: Boxes,
    why: "Owners lose money on parts nobody billed and on trips back to the supplier.",
    does: [
      "Stock levels per location (warehouse and each van) for price-book parts",
      "Parts used on a job are deducted from the tech's van on completion",
      "Low-stock list and simple purchase orders to restock",
    ],
    prompt: `Add van stock and parts inventory.
- Backend (backend/server.py): add "stock_locations" (name, type: warehouse|van, tech_id) and "stock_levels" (location_id, pricebook_item_id, qty, min_qty) collections. Endpoints: CRUD for locations, GET /api/stock?location_id=, POST /api/stock/adjust, POST /api/stock/transfer.
- When a job is marked completed, deduct each part line from the assigned tech's van location (allow negative, flag it).
- Add "purchase_orders" (supplier, lines, status: draft|ordered|received) and POST /api/purchase-orders/{id}/receive that adds qty to a location.
- Frontend: new page frontend/src/pages/Stock.jsx with a location switcher, low-stock filter and PO list; show "on my van: N" next to parts in the tech app's add-part search (frontend/src/pages/tech/TechJob.jsx). Add Stock to the Records group in Layout.jsx.`,
  },
  {
    name: "AI receptionist",
    icon: Bot,
    why: "Every missed call is a job going to the next company on Google.",
    does: [
      "Missed call gets an instant text back that offers real free slots",
      "Customer picks a slot by reply and a job is booked on the schedule",
      "Conversation and outcome shown on the lead in the Inbox",
    ],
    prompt: `Add an AI receptionist for missed calls.
- Backend (backend/server.py): add a helper that computes free slots for the next 3 days from existing scheduled jobs and team working hours (techs with the right skill for the trade).
- Add POST /api/public/calls/missed/{slug} (Twilio voice status callback) that creates a lead with channel "missed_call", then texts 3 real free slots with the existing log_message() (it already sends through Twilio).
- Replies already arrive at POST /api/public/sms/inbound/{slug}. After storing the message there, if the sender is an open lead, use the AI provider (the existing complete() helper) to understand the reply ("the second one", "Tuesday morning"), book the job with the existing schedule logic and confirm by text.
- Frontend: on frontend/src/pages/Inbox.jsx show a "Booked by assistant" pill on the lead and link to its conversation in Messages.`,
  },
  {
    name: "Map view & route optimisation",
    icon: MapIcon,
    why: "Dispatchers want to see where everyone is and stop vans crossing town twice.",
    does: [
      "Map of the day's jobs per tech, coloured by tech",
      "\"Optimise route\" re-orders a tech's day by drive time",
      "Rain-day reschedule: move all outdoor jobs for a day and notify customers in one action",
    ],
    prompt: `Add a map view and route optimisation to the schedule.
- Backend (backend/server.py): geocode site addresses on save (store lat/lng on the site) using Google Geocoding or Nominatim. Add POST /api/schedule/optimise {date, tech_id} that orders that tech's jobs by drive time (OSRM table API or Google Routes), keeps durations, and re-times them from the start of day. Add POST /api/schedule/reschedule-day {date, to_date, filter: {outdoor: true}} that moves matching jobs and texts each customer.
- Mark job types as outdoor in the price book or job_type list, and fetch the forecast from Open-Meteo for the schedule date (GET /api/weather?date=).
- Frontend: add a "Map" toggle to frontend/src/pages/Schedule.jsx that renders Leaflet (OpenStreetMap tiles) with one coloured route per tech, an "Optimise route" button per tech lane, and a rain warning banner with "Reschedule outdoor jobs".`,
  },
  {
    name: "Financing on quotes",
    icon: Coins,
    why: "\"From $89/month\" closes the big replacement jobs that a lump sum scares off.",
    does: [
      "Monthly payment shown on each quote option",
      "Customer can apply from the quote page",
      "Approval status visible on the quote",
    ],
    prompt: `Add financing to quotes.
- Backend (backend/server.py): add org settings for financing (provider, enabled, apr_percent, term_months options, min_amount_cents). Add a helper that returns the monthly payment for an amount, and include "financing": {monthly_cents, term_months, apr_percent} on each option in the quote and public quote responses when the option total is above the minimum.
- Add POST /api/public/quotes/{token}/financing that records an application (simulated approve/decline now; leave a clear function to swap in Wisetack or another provider's API) and stores the status on the quote.
- Frontend: show "or from X/mo" under each option total in frontend/src/pages/public/QuoteApprove.jsx and frontend/src/pages/QuoteBuilder.jsx, an "Apply for financing" button on the public page, and the financing status pill on the quote.`,
  },
  {
    name: "Reviews & referrals",
    icon: Star,
    why: "Reviews are free marketing, and happy customers will send friends if you ask at the right moment.",
    does: [
      "After payment, ask the customer how it went",
      "Happy customers are sent to your Google review link; unhappy ones reach the owner privately",
      "Personal referral link with a reward tracked per customer",
    ],
    prompt: `Add reviews and referrals.
- Backend (backend/server.py): add review_link and referral_reward_cents to org settings. When an invoice is fully paid, create a "feedback_request" with a public token and send the customer a link (SMS/email stub).
- Public GET/POST /api/public/feedback/{token}: 1–5 rating + comment. 4–5 stars returns the Google review link; 1–3 stars notifies the owner and creates a follow-up task.
- Give each customer a referral code; public /book/:slug accepts ?ref=CODE and the new lead stores referred_by. When that referral's first invoice is paid, record the reward on the referrer.
- Frontend: public page frontend/src/pages/public/Feedback.jsx at /f/:token, a "Reviews & referrals" page with ratings and referral leaderboard, and the two new fields in frontend/src/pages/Settings.jsx.`,
  },
  {
    name: "Commission & payroll",
    icon: CreditCard,
    why: "Techs want to see what they earned; owners want pay worked out without a spreadsheet.",
    does: [
      "Commission rules per job type or line category, earned on paid invoices",
      "Hours from job start/finish times per tech per week",
      "Pay period summary with export to CSV",
    ],
    prompt: `Add commission and payroll.
- Backend (backend/server.py): add pay settings on each team member (hourly_cents, commission rules: [{category, percent}]). When an invoice is fully paid, create "commission" records per tech per line category with period YYYY-MM and status pending|paid.
- Compute hours per tech from job status history (in_progress to completed) and expose GET /api/payroll?period=YYYY-MM returning hours, hourly pay, commission and total per tech, plus POST /api/payroll/{period}/mark-paid and a CSV export.
- Owners see everyone; techs only see their own (GET /api/me/earnings).
- Frontend: add commission and pay columns to frontend/src/pages/Team.jsx for owners, a new frontend/src/pages/Payroll.jsx, and a "My earnings" card in frontend/src/pages/tech/TechToday.jsx.`,
  },
  {
    name: "Roles & permissions",
    icon: ShieldCheck,
    why: "Owners need to hide costs and margins from techs and limit what office staff can change.",
    does: [
      "Permission matrix per role (view/edit per area: quotes, invoices, costs, settings…)",
      "Custom roles beyond owner/office/tech",
      "Enforced on the server and reflected in the UI",
    ],
    prompt: `Add a roles and permissions matrix.
- Backend (backend/server.py): add a "roles" collection per org with a permissions map like {"quotes": "edit", "invoices": "view", "costs": "none", "settings": "none", "team": "view"}. Seed owner/office/tech defaults that match today's behaviour. Add a require(perm, level) dependency and apply it to every existing route; strip cost_cents and margin fields from responses when costs is "none".
- Return the effective permissions in /api/auth/me.
- Frontend: a matrix editor (areas x roles with none/view/edit) in frontend/src/pages/Settings.jsx, a role picker on team members in frontend/src/pages/Team.jsx, and hide nav items in frontend/src/components/Layout.jsx and buttons the user can't use.`,
  },
  {
    name: "Resell as SaaS",
    icon: Building2,
    why: "Founders who build this for one trade want to sell it to many businesses.",
    does: [
      "Self-serve sign-up creates a new business (tenant) with its own data",
      "Plan tiers with limits and a free trial",
      "Platform admin to see tenants, plans and usage",
    ],
    prompt: `Turn this into a multi-tenant SaaS.
- Backend (backend/server.py): every collection is already scoped by org_id; add public POST /api/signup that creates an org + owner user with sample data and a 14-day trial. Add "plans" for the platform (name, price_cents, limits: {users, jobs_per_month}) and subscription fields on the org (plan_id, status: trialing|active|past_due|cancelled, trial_ends_on). Enforce limits on create endpoints and show a clear error.
- Add Stripe Billing checkout + webhook to move orgs from trial to active.
- Add a platform admin role with GET /api/admin/tenants (usage counts, plan, status) and the ability to extend trials or switch plans.
- Frontend: a public sign-up page, a "Billing" section in frontend/src/pages/Settings.jsx, a trial banner in frontend/src/components/Layout.jsx, and an admin page frontend/src/pages/Admin.jsx.`,
  },
  {
    name: "Payments, SMS/WhatsApp & accounting",
    icon: Plug,
    why: "Getting paid by card, texting customers and syncing the books are what make it real.",
    does: [
      "Stripe payment links, card on file and deposits on quote approval",
      "WhatsApp alongside the built-in SMS (Twilio) for confirmations and reminders",
      "Invoices and payments synced to QuickBooks or Xero",
    ],
    prompt: `Connect real payments, messaging and accounting.
- Backend (backend/server.py): add an "integrations" section to org settings storing API keys/OAuth tokens per provider (never return secrets to the frontend).
- Stripe: create a Checkout/Payment Link for the public pay page and quote deposits; add POST /api/webhooks/stripe that records the payment against the invoice using the existing payments logic.
- WhatsApp Cloud API: SMS already goes through send_sms() in backend/server.py and replies arrive at /api/public/sms/inbound/{slug}. Add a WhatsApp branch to send_sms() (per customer preference) and accept WhatsApp webhooks on the same inbound route with channel "whatsapp".
- QuickBooks/Xero: OAuth connect, then push customers, invoices and payments when they are created/paid; keep a sync log with retry.
- Frontend: an "Integrations" card in frontend/src/pages/Settings.jsx with connect/disconnect and status for each provider, and a sync status pill on frontend/src/pages/InvoiceDetail.jsx.`,
  },
  {
    name: "Country packs",
    icon: Globe2,
    why: "Tax, invoice format and compliance differ by country; local owners expect them out of the box.",
    does: [
      "UK: gas safety / EICR style certificates and VAT invoices",
      "India: GST invoices (GSTIN, HSN/SAC, CGST/SGST/IGST) and AMC contracts",
      "EU: VAT-compliant invoices and e-invoice export (Peppol/UBL)",
    ],
    prompt: `Add country packs.
- Backend (backend/server.py): add org.country with a packs dict defining currency, date format, tax model and invoice fields per country (US, UK, IN, EU). Replace the single tax_rate_bp with tax rules from the pack: UK VAT rates + VAT number; India GST with GSTIN, HSN/SAC on price-book items, CGST+SGST for same-state and IGST for inter-state based on customer state; EU VAT with reverse charge for B2B.
- Number invoices per country rules and add the required fields to invoice responses. Add GET /api/invoices/{id}/ubl that returns a Peppol BIS UBL XML file for EU orgs, and a GST-compliant invoice layout for India.
- Frontend: a country picker in frontend/src/pages/Settings.jsx that shows the extra fields it needs (VAT number, GSTIN, state), the new tax breakdown on frontend/src/pages/InvoiceDetail.jsx and frontend/src/pages/public/PayInvoice.jsx, and HSN/SAC on price-book items.`,
  },
];

function FeatureCard({ f }) {
  const toast = useToast();
  const Icon = f.icon;
  const text = `${f.prompt}\n\n${STACK}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast(`Prompt for "${f.name}" copied — paste it into Emergent`); }
    catch { toast("Couldn't copy — select the text and copy it manually", true); }
  };
  return (
    <div className="card bn-card">
      <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
        <span className="bn-ico"><Icon size={18} strokeWidth={1.75} /></span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>{f.name}</h2>
          <div className="muted small" style={{ marginTop: 3 }}>{f.why}</div>
        </div>
      </div>
      <ul className="bn-does">{f.does.map((d) => <li key={d}>{d}</li>)}</ul>
      <div className="row between" style={{ alignItems: "center" }}>
        <div className="small" style={{ fontWeight: 600, color: "var(--ink-2)" }}>Prompt for Emergent</div>
        <Button size="sm" variant="primary" onClick={copy}>Copy prompt</Button>
      </div>
      <textarea className="bn-prompt" readOnly value={text} onFocus={(e) => e.target.select()} aria-label={`Prompt for ${f.name}`} />
    </div>
  );
}

export default function BuildNext() {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const shown = s ? FEATURES.filter((f) => `${f.name} ${f.why} ${f.does.join(" ")}`.toLowerCase().includes(s)) : FEATURES;
  return (
    <div className="page">
      <style>{`
        .bn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 14px; }
        .bn-card { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
        .bn-ico { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); flex: none; }
        .bn-does { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: 13.5px; color: var(--ink-2); flex: 1; }
        .bn-prompt { width: 100%; min-height: 150px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.5; background: var(--surface-2); }
      `}</style>
      <PageHead title="Build next on Emergent"
        sub="This template is the starting point. Owners in this trade asked for these; ask Emergent's agent to add the ones your business needs.">
        <input placeholder="Search features" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} aria-label="Search features" />
      </PageHead>
      <div className="callout" style={{ marginBottom: 16 }}>
        <b>How to use this page.</b> Pick a feature, copy its prompt and paste it into Emergent. Each prompt names the files to change in this
        codebase (<code>backend/server.py</code> and <code>frontend/src/pages</code>). Build one feature at a time and test it before the next.
      </div>
      {shown.length ? (
        <div className="bn-grid">{shown.map((f) => <FeatureCard key={f.name} f={f} />)}</div>
      ) : <div className="empty">No feature matches “{q}”.</div>}
    </div>
  );
}

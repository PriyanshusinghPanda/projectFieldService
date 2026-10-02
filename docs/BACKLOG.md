# Backlog: what to add, in order

The full list of what field-service builders made, against what Job OS has, is in `research/feature-inventory.md`.

This file tracks what's built and what to add next. The order comes from evidence:
- **Int:** our 73 paying field-service builders, `research/internal-findings.md`.
- **Ext:** owners' public wants, `research/external-wants.md` (provisional).

Each item has its own card with a ready prompt on the in-app "Build next" page. When one lands, move it to Done and remove its card.

## Done (the template base)
| Area | What's there |
|---|---|
| Leads | Inbox of leads; a missed call gets an automatic text back; convert a lead to a customer |
| Customers | Customers, sites, equipment; customer detail with jobs, quotes, invoices |
| Price book & quotes | Options from the price book, tax, deposit on quotes ≥ $1,000; send by link; the customer approves and signs; the quote locks and becomes a job |
| Schedule | Board by technician; double booking blocked |
| Technician app | Today's jobs; on my way → on site → working → finish; checklist; photos; parts; signature; finishing is blocked until the checklist and signature are done |
| Invoices & payments | Invoice from the job; deposit applied; pay by link (demo checkout) or record a payment; reminders |
| Plans | Plans and memberships; selling a plan books its first visit |
| Owner | Home (brief, tiles, today), simple reports, settings (name, brand, tax, deposit), team list |

## Next, in order
| # | Feature | Why (evidence) | Done when |
|---|---|---|---|
| 1 | **AI receptionist**: missed call → text conversation → booked into a real free slot | Top external want; Jobber charges extra for it. Int: 11 builders built AI intake | Offers only truly free slots for the right trade; quotes only price-book prices; every action logged and undoable |
| 2 | **Maintenance contracts** (AMC/PPM cycles, SLA, renewals) | Int: 15 builders; Ext: plans that book and bill themselves | Visits generated N weeks ahead, idempotent; SLA met/breached per month; renewal quote one click |
| 3 | **Certificates & service reports** with next-due | Int: 18 builders (UK gas safety, fire, lifts, AMC) | Numbered, locked once issued; corrections supersede; next-due reminder; customer sees them in the portal |
| 4 | **Change orders** on approved quotes | Int: 17 builders | Above a threshold the customer approves by link or signature; approved lines land on the invoice exactly once |
| 5 | **Map view & route order**; rain-day reschedule | Ext: owners switch tools for map scheduling. Int: 29 builders built dispatch or GPS | Optimising never double-books; moves notify customers; undo |
| 6 | **Financing on quotes** ("from $X/mo") | Ext: higher close rate on big tickets | Correct amortisation in cents; provider per country; simulated until a partner is signed |
| 7 | **Reviews & referrals** | Ext: every incumbent sells it as an add-on | Only 4–5★ go to Google, 1–3★ go privately to the owner; referral attribution |
| 8 | **Van stock & parts** | Int: 15 builders | Parts deducted once on completion; no negative stock; low-stock list → purchase order |
| 9 | **Commission & payroll export** | Int: 18 builders | Rules by category; pay period locked after export |
| 10 | **Roles & permissions matrix** | Int: 23 builders (the most-asked core need) | Per-role switches enforced by the API, not just hidden in the UI |
| 11 | **Payments, SMS/WhatsApp & accounting connections** | Needed to go live | Stripe Connect, Twilio/WhatsApp, QuickBooks/Xero behind a live/simulated switch; see `INTEGRATIONS.md` |
| 12 | **Resell as SaaS** (tenants, plans, trials) | Int: 22 builders, $201k paid (founders) | Tenant admin, plan limits, trials; isolation tested |
| 13 | **Country packs** (UK certificates, India GST/AMC/WhatsApp, EU e-invoice) | Int: 13 builders (regional) | Pack switches tax, numbering, documents and adapters; the core unchanged |

## Put off (on purpose)
- **No offline write queue guarantees beyond the client queue:** add idempotency keys on the server when a customer needs it.
- **No native app:** the technician app is a PWA. Tap to Pay needs a native wrapper later.
- **No rules engine or plugin system:** the earlier, heavier version was cut to keep the template small (`DECISIONS.md` #2).

## To decide
- **One repo or two:** does Job OS move into `emergentbase/whitelabel_tools` as `field-services/`, next to Dealer OS, so the integration plans are shared?
- **Second demo business:** UK gas and heating, or India AC/AMC?
- **Pricing:** what to charge for the template; flat, no per-seat fees, is what owners ask for.

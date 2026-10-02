# External wants: what field-service owners want from their software

*Job OS research · written 2026-10-02 · **status: fast pass, partial evidence***

**Read this first.** The user asked for speed, so this was written after a short research window. Five deeper
research passes (US service-call reviews, recurring-route trades, installs and compliance, regions, vendor launches
2025–26) were started, but their results are **not in this file**. Treat the rankings below as provisional until a
follow-up pass merges them.

How to read the evidence:
- **[V]** means I fetched the source, or read a search snippet of it, on 2026-10-02.
- **[L]** means a lead. The quote and URL come from an earlier scout document (`~/Desktop/whitelabel-research/scout-home-property.md`) written without our context. I have **not verified** it, so do not quote it to customers until it is checked.
- **[I]** means an internal source: our PRD, or the 73 field-service builders on Emergent summarised in `docs/CUSTOMIZE.md`. These are real requests from paying builders, but they are not public web evidence.
- **Inferred** marks reasoning that no source states directly.

---

## 1. Method and sources

**Method.** We follow PLAYBOOK §2:
- A **WANT** is backed by a wish, a switch, a paid upgrade or a DIY workaround, and no incumbent does it well at small-shop prices.
- A **NEED** is something every serious incumbent ships, and owners ask "does it do X?"
- A **DELIGHTER** is a want that a viewer can see work on screen in 60 seconds or less.

Demand strength counts the **independent sources** (V + L + I) behind each row:
- **H** = 4 or more sources, or 1 source with a quoted money cost plus a paid upgrade.
- **M** = 2–3 sources.
- **L** = 1 source, or inference only.

Pure price complaints are left out. Complaints about how pricing is structured are kept, as a pricing-model want.

**Sources**

| ID | Source | Date | Type |
|---|---|---|---|
| S1 | Signpost, "How much revenue do home services businesses lose from missed calls", https://www.signpost.com/blog/how-much-revenue-do-home-services-businesses-lose-from-missed-calls | 2026-04-15 | [V] direct. Note: the stats carry no third-party attribution |
| S2 | Pipelineon, "Jobber vs Housecall Pro", https://pipelineon.com/blog/jobber-vs-housecall-pro/ | 2026-06-05 | [V] direct |
| S3 | Jobber Community, "Maintenance contract feature", https://community.getjobber.com/discussions/spring-feature-announcement/maintenance-contract-feature/2406 | undated (2025–26) | [V] search snippet; direct fetch returned 403 |
| S4 | Jobber Community, "Maintenance contract questions", https://community.getjobber.com/discussions/insights-reporting/maintenance-contract-questions/1548 | undated | [V] snippet |
| S5 | FieldPromax, "The field service mobile app, from an operator's bench", https://www.fieldpromax.com/blog/the-field-service-mobile-app-from-an-operators-bench | 2025–26 | [V] snippet (vendor blog) |
| S6 | Capterra, mHelpDesk reviews p4, https://www.capterra.com/p/77264/mHelpDesk/reviews/?page=4 | – | [V] snippet |
| S7 | Capterra, Jobber reviews (p3/p4), https://www.capterra.com/p/127994/Jobber/reviews/?page=3 | 2025–26 | [V] snippet |
| S8 | Gartner Peer Insights, Salesforce Field Service, https://www.gartner.com/reviews/market/field-service-management/vendor/salesforce | – | [V] snippet (enterprise; supporting only) |
| S9 | Job OS PRD, `product-requirements/template-strategy/field-services/PRD.md` | 2026 | [I] |
| S10 | Requests from 73 field-service builders on Emergent, `job-os-template/docs/CUSTOMIZE.md` | 2026 | [I] |
| L1 | Capterra, Jobber reviews, https://www.capterra.com/p/127994/Jobber/reviews/ | Oct 2025–Jul 2026 | [L] |
| L2 | Capterra, ServiceTitan reviews, https://www.capterra.com/p/150053/ServiceTitan/reviews/ | – | [L] |
| L3 | Capterra, Housecall Pro reviews, https://www.capterra.com/p/140363/Housecall-Pro/reviews/ | – | [L] |
| L4 | Capterra, ZenMaid reviews, https://www.capterra.com/p/133875/ZenMaid-Software/reviews/ | – | [L] |
| L5 | Capterra, Maidily reviews, https://www.capterra.com/p/201538/Maidily/reviews/ | 2022– | [L] |
| L6 | Capterra, Aspire reviews, https://www.capterra.com/p/161544/Aspire/reviews/ | Oct 2025–Jul 2026 | [L] |
| L7 | OneCrew, "ServiceTitan reviews", https://www.getonecrew.com/post/servicetitan-reviews (cites r/ServiceTitanFAQ) | 2026-02-17 | [L] |
| L8 | Airframe, ServiceTitan analysis, https://www.airframe.ai/product/servicetitan-com/analysis (quotes Reddit) | 2025–26 | [L] |
| L9 | ACCA blog, financing and closing ratios, https://hvac-blog.acca.org/financing-strategies-that-boost-closing-ratios-and-average-job-sizes/ | – | [L] |
| L10 | Zapier, Jobber integrations, https://zapier.com/apps/jobber/integrations | – | [L] (workaround evidence) |
| L11 | Rewiring America API, https://www.rewiringamerica.org/api | – | [L] (supply side only) |

**Not covered in this pass (gaps):**
- Reddit read directly.
- G2 and Trustpilot.
- Reviews of GorillaDesk, ServiceM8, Tradify, Fergus, Commusoft, Joblogic, simPRO, Zuper, Zoho FSM and FieldCircle.
- Vendor changelogs from 2025–26.
- YouTube.
- Every regional source.

All of these are **not verified**.

---

## 2. Top 20 wanted features (all shapes)

Shapes:
- **SC** = service calls and plans
- **RR** = recurring routes
- **IP** = installs and projects
- **PM** = planned maintenance and compliance

| # | Feature (plain words) | Tag | Shapes | Demand (sources) | Evidence | Best / worst incumbent |
|---|---|---|---|---|---|---|
| 1 | **No lead lost.** A missed call gets a text back, and an assistant books the job into a slot that is really free | WANT (DELIGHTER on screen) | all, strongest in SC | H (3: S1, S2, S9) | Small firms miss 22–40% of calls, and up to 85% of those callers never call back (S1). Jobber sells an AI Receptionist as a **$99/mo add-on**: owners pay extra for it (S2) | Best: ServiceTitan, Jobber, Workiz (paid add-ons, per S2 and vendor marketing, *not verified*). Worst: tools with no phone layer |
| 2 | **Maintenance plans that run themselves.** Visits are booked ahead, billing is automatic, renewals are flagged, and equipment is linked | WANT | SC, PM, RR | H (4: S3, S4, S10, S9) | Called "the most frustrating part of jobber" and "brutal" (S3). Owners fake plans with client **tags** (workaround, S3). Builders ask for quarterly fire/alarm visits generated 3 months ahead, and AMC cycles by customer group (S10) | Best: ServiceTitan, Housecall Pro (*L, not verified*). Worst: Jobber (S3, S4) |
| 3 | **Pricing with no add-on creep and no lock-in.** No per-module upsells, no 12-month contracts, no surprise per-tech fees | WANT (pricing model) | all | H (3: S2, L7, L8) | HCP charges for proposals (+$40), the price book (+$149) and GPS ($20 per van), so shops "land 30–50% above sticker" (S2). ServiceTitan users report contract lock-in and cost they "couldn't justify" (L7, L8) | Worst: ServiceTitan (contracts), HCP (add-ons) |
| 4 | **Good / better / best quote from a flat-rate price book, built on the phone and signed on site** | WANT | SC, IP | M (3: S2, S9, L3) | Owners pay +$40 and +$149 a month just to get tiered proposals and a price book (S2). "No way to document when a client accepts your proposal" (L3) | Best: ServiceTitan. Worst: HCP Basic, Jobber Core (*inferred from plan pages*) |
| 5 | **Profit per job, live.** Labour, parts and commission against what the job earned | WANT | all, strongest in IP | M (3: S10, L1, L6) | Builders encode commission and margin rules: 10% commission, +2% if the tech found the lead; techs never see costs (S10). "Reporting feels more fragmented than it should be" (L1). Real-time job costing is praised in Aspire (L6) | Best: Aspire (lawn), ServiceTitan. Worst: Jobber reporting (L1) |
| 6 | **A tech app that never loses work offline.** Photos, notes and signatures sync later | NEED with a want edge (reliability shown on screen) | all | M (3: S5, S6, S8) | About 20% of calls land with little or no signal, and on weak apps "notes, photos, and signatures can silently disappear" (S5). The app "may or may not save… much frustration" (S6) | Worst: mHelpDesk (S6). Others not verified |
| 7 | **Map-view scheduling and route optimisation**, plus remembered routes | WANT | RR, SC | M (2: S7, L1) | A Capterra reviewer left HCP for Jobber over **map-view scheduling**, a switch-level reason (S7). "Add all stops for the day, click optimize" (L1) | Best: Jobber (S7). Worst: HCP (S7) |
| 8 | **Completion gates.** Required checklist items, minimum before/after photos, and readings before a job can close | WANT | all | M (3: S10, L4, S9) | Builders ask for at least 5 before and 5 after photos, and a leak-test reading before a gas job closes (S10). "I would love… checklists… to clock out" (L4) | Best: ZenMaid (cleaning, L4). Others not verified |
| 9 | **"On my way" text with a live arrival time, plus two-way texting on the job record** | WANT | SC, RR | M (2: L2, S9) | It fixes "the biggest complaint customers have with contractors" (L2) | Best: ServiceTitan (L2) |
| 10 | **Deposits and stage payments set by rule** (by quote size or by milestone) | WANT | IP, SC | M (2: S10, S9) | Builders' own rules: "under $1k pay on completion; $1k–10k 50/50; over $10k 60/20/20"; "25% deposit on quotes over $1,000" (S10) | Not verified across incumbents |
| 11 | **Tech pay and commission computed from the job** (per upsell category, after approval) | WANT | SC, RR | M (1 internal with several asks: S10) | "Commission only after payroll approval, per upsell category"; "10% sales commission, +2% if the tech found the lead" (S10) | Best: ServiceTitan (*inferred*). Worst: Jobber, HCP (*not verified*) |
| 12 | **Certificates and inspection reports from the visit**, with next-due date and an automatic reminder | WANT (NEED in UK gas/electrical) | PM, SC (UK) | L–M (2: S9, S10) | The PRD names gas-safety and electrical certificates. Builders ask for fire/alarm schedules (S10). **External evidence not verified** | Not verified (candidates: Commusoft, Joblogic, Uptick) |
| 13 | **Batch invoicing and autopay** for recurring visits (card on file) | NEED with a want edge | RR, PM | M (2: L1, L4) | "Closing out a re-occurring job is a little difficult" (L1). "Bulk invoicing & bulk dispatching would save us so much time" (L4) | Not verified |
| 14 | **Financing shown as "$X/mo" inside the quote** | WANT (US) | SC, IP | M (2: L9, S9) | +12% close rate and +13% ticket size from offering financing (L9) | Best: ServiceTitan, HCP (*not verified*) |
| 15 | **Instant online price and self-booking** (beds/baths, sq ft, frequency) | WANT | RR (cleaning, lawn) | L–M (1: L5) | "Clients love being able to clearly see the price up-front" (L5) | Best: Maidily, BookingKoala (*L*) |
| 16 | **Change orders and several options on one job** | WANT | IP | L (1: L1) | "No way to create a change order" (L1) | Worst: Jobber (L1) |
| 17 | **One place instead of a Zapier chain** (CRM, sheets, marketing, accounting in one record) | WANT (revealed by workaround) | all | M (2: L10, S9) | Zapier carries Jobber → Sheets / HubSpot / Airtable recipes (L10). The PRD's builders run on Calendar + WhatsApp + a spreadsheet + QuickBooks (S9) | – |
| 18 | **Rain-day reschedule.** Shift the day's route in bulk and notify every customer | DELIGHTER | RR (lawn, pool, window), IP (roofing) | L (inferred; vendor pitch only) | **Not verified**: no owner quote found | – |
| 19 | **Rebates and tax credits stacked on a heat-pump or electrification quote** | DELIGHTER (US) | SC, IP | L (1: L11, supply-side) | **Inferred want**: no owner quote | – |
| 20 | **Which lead source pays off** (source → booked → paid) | WANT | all | L (1: S9) | PRD hypothesis; **not verified externally** | – |

**Close to the cut:**
- Double-booking alerts and per-tech blackout dates (NEED). "Jobber allows double booking without alerting me" (L1); builders ask for "no double booking; 7am–7pm" (S10).
- Hiding costs and margins from techs (NEED). Asked for in S10.

---

## 3. Per-shape top 8

*Ranks are provisional. Shape-specific external evidence is thin in this pass.*

**(1) Service calls and maintenance plans** (HVAC, plumbing, electrical, appliance)
1. Missed-call text-back and AI booking (#1)
2. Self-running plans and memberships tied to equipment (#2)
3. Good / better / best price-book quotes on the phone (#4)
4. Financing in the quote (#14, US)
5. "On my way" text with live ETA (#9)
6. Profit per job and commission (#5, #11)
7. Completion gates with readings (gas leak test, S10) (#8)
8. Rebate stacking (#19, US HVAC only)

*Differences by trade:*
- HVAC wants memberships plus the equipment record, and financing and rebates on replacements.
- Plumbing and electrical skew towards emergency call-outs: after-hours fees (S10) and fast quotes.
- Appliance repair cares about parts and warranty claims *(inferred, not verified)*.

**(2) Recurring routes** (cleaning, lawn, pest, pool)
1. Route optimisation and map view (#7)
2. Batch invoicing and autopay (#13)
3. Instant online price and booking (#15, cleaning)
4. Checklists and photo proof before clock-out (#8)
5. GPS clock-in tied to pay (L4, L6)
6. Rain-day reschedule (#18, lawn/pool)
7. Team jobs with pay split (L5, cleaning)
8. Per-property profit (#5, lawn, L6)

*Differences by trade:*
- Cleaning wants booking, checklists and cleaner pay.
- Lawn wants routing, weather and job costing.
- Pest and lawn chemical-application logs, and pool chemical readings, are likely compliance wants (**not verified**).

**(3) Installs and projects in stages** (roofing, solar, remodel, AV)
1. Deposits and stage payments by rule (#10)
2. Change orders (#16)
3. Live job costing against the estimate (#5)
4. Good / better / best proposals with financing (#4, #14)
5. Before/after photo requirements (#8)
6. Customer-visible progress and portal (PRD; **not verified**)
7. Commission on the sale (#11)
8. Weather holds for roofing and exteriors (#18, **not verified**)

*Differences by trade:*
- Roofing likely wants measurement reports.
- Solar likely wants permit and interconnection tracking.
- AV likely wants an equipment bill of materials.

All three are **not verified**.

**(4) Planned maintenance and compliance** (fire and security, lifts, AMC, inspections)
1. Visits generated ahead by contract cycle (#2; S10: quarterly, 3 months ahead; AMC A/B/C month groups)
2. Certificates and reports with next-due dates (#12)
3. An asset register per site (PRD equipment record)
4. A defects found on the visit turned into a remedial quote (**not verified**)
5. Contract billing and renewals (#2)
6. Mandatory readings and checklists (#8)
7. A customer portal to download certificates (**not verified**)
8. Offline forms (#6)

*Differences by trade:* fire and lifts are B2B and multi-site; AMC (India) is contract-cycle and GST-driven (S10). **Externally not verified.**

---

## 4. Region-specific wants

*All rows are from our PRD §8 (S9) and the builder requests (S10). External verification is still pending; regional research did not land in this pass.*

| Region | Specific wants | Status |
|---|---|---|
| US | SMS-first; financing; rebates; sales tax by area; Angi, Thumbtack and Google local ads leads; QuickBooks | S9; financing L9 |
| UK | Gas-safety (CP12) and EICR certificates with landlord renewal reminders; WhatsApp-first; VAT and Making Tax Digital; construction tax scheme (CIS); Xero; Bacs direct debit; Checkatrade leads | S9; **not verified** |
| AU/NZ | Xero-first; GST; compliance certificates; offline use in rural areas; hipages leads | **not verified** (inferred) |
| India | AMC contracts with cycle billing; GST per state (S10); WhatsApp-first; UPI; low-end Android, offline | S10 (GST, AMC); rest **not verified** |
| EU | E-invoicing mandates (XRechnung / Factur-X / Peppol); VAT per line; progress invoices; local-language quotes (devis, Angebot, preventivo); DATEV export; SEPA direct debit | S9; **not verified** |
| LATAM | WhatsApp-first quoting; Pix / Mercado Pago; electronic invoices (CFDI in Mexico, NF-e/NFS-e in Brazil) | **not verified** (inferred) |

---

## 5. Switching reasons and moments of delight

**Top switching reasons** (ranked by evidence in hand):
1. **Cost structure and lock-in.** Add-on creep (S2) and ServiceTitan contracts and implementation (L7, L8).
2. **A missing core workflow.** Maintenance contracts in Jobber (S3, S4); map-view scheduling missing in HCP (S7).
3. **Unreliable mobile app or offline data loss** (S5, S6).
4. **Built for another trade.** Cleaning owners leave general tools for ZenMaid (L4).
5. **Fragmented reporting and job costing** (L1, L6).

**Moments of delight for a demo** (ranked by want strength and whether it shows in 60 seconds or less):
1. A missed call comes in, a text goes back, and the job is booked into a real free slot on the board (#1).
2. A plan is sold on site, and the next 4 visits and invoices appear on their own (#2).
3. A three-tier quote is built from the price book on a phone; the customer signs and pays the deposit (#4, #10).
4. The tech goes offline, takes photos and gets a signature, signal returns, and everything syncs with nothing lost (#6).
5. Job profit updates live as parts and hours are added; the tech's view hides costs (#5, S10).
6. A job can't close until the checklist, photos and reading are done (#8).
7. One click optimises the route and sends "on my way" with the arrival time (#7, #9).
8. Rain day: one action moves the day and notifies everyone (#18, DELIGHTER, unverified).
9. An inspection visit produces a certificate with the next due date already scheduled (#12, PM / UK).

---

## 6. NEED list (table stakes; answer them, don't demo them)

- Customer, site and job records
- Calendar and dispatch board
- Google Calendar sync
- Quotes and invoices as correct PDFs
- E-signature
- Card and online payments
- Payment reminders
- QuickBooks and Xero sync
- Tech mobile app with photos and signature
- Recurring jobs
- Double-booking alerts
- Roles and permissions (techs can't see costs)
- Customer portal
- Review request after payment
- Basic reports
- Import of customers and price list

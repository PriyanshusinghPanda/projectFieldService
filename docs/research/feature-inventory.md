# Feature inventory: what field-service builders made vs what Job OS has

*2 Oct 2026. Same method as Dealer OS's feature inventory: what real users built, with evidence, against what the template ships.*

**Evidence:**
- **Builders:** our 73 paying field-service builders on Emergent ($493k paid). Each was read job by job, and their written requirements were clustered (`internal-findings.md`).
- **Builders column:** how many of the 73 built or asked for it.
- **Paid column:** what those builders paid Emergent in total (lifetime; a builder can count in several rows).
- **Tags:**
  - **NEED:** every field-service tool has it.
  - **WANT:** builders asked for it beyond the basics.
  - **DELIGHTER:** the "wow" in a demo.

**Status in the template:**
- **Yes:** shipped.
- **Partial:** a simple version ships.
- **No:** the business adds it on Emergent; the Backlog # points to `docs/BACKLOG.md` and the in-app Build next page.

## A. Modules they built (30) and what Job OS has

Summary: **11 Yes, 9 Partial, 10 No.** The ten most-built modules are all in the template, fully or in part.

| # | Module | Builders | Paid | Job OS | What's there / where it goes |
|---|---|---|---|---|---|
| 1 | Owner dashboard / reports | 58 | $447k | **Partial** | Home brief, tiles, today's visits; simple reports |
| 2 | Jobs / work orders | 57 | $405k | **Yes** | Jobs list + job page, status flow, timeline |
| 3 | Customers & sites | 53 | $382k | **Yes** | Customers, sites, equipment |
| 4 | Photos & job record | 52 | $356k | **Yes** | Photos on the job (tech app) |
| 5 | Schedule / dispatch board | 51 | $404k | **Yes** | Board by tech, double booking blocked |
| 6 | SMS / email reminders | 51 | $393k | **Partial** | Missed-call text-back, on-my-way, quote/invoice texts — logged, not sent |
| 7 | Technician app | 44 | $343k | **Yes** | PWA at /tech: status steps, checklist, photos, parts, signature |
| 8 | Quotes / estimates | 41 | $328k | **Yes** | Options from price book, approve by link, locked |
| 9 | Invoices | 40 | $301k | **Yes** | Invoice from job, deposit applied, reminders |
| 10 | AI assistant / receptionist | 37 | $284k | **No** | Backlog #1 |
| 11 | Checklists & forms | 34 | $239k | **Partial** | Fixed checklist per job type; no form builder |
| 12 | Timesheets & payroll | 34 | $255k | **No** | Backlog #9 |
| 13 | Leads / inbox / CRM | 33 | $251k | **Yes** | Inbox of leads, convert to customer |
| 14 | Customer portal | 33 | $205k | **Yes** | Portal, quote approval, pay, track pages |
| 15 | Payments & deposits | 30 | $232k | **Partial** | Deposit + pay by link (demo checkout); no real provider |
| 16 | Inventory / parts / POs | 30 | $250k | **No** | Backlog #8 (parts can be added to a job) |
| 17 | Multi-tenant SaaS admin | 30 | $269k | **No** | Backlog #12 (data already scoped by org) |
| 18 | Website / SEO | 29 | $240k | **Partial** | Online booking page only |
| 19 | Routes & maps | 27 | $174k | **No** | Backlog #5 |
| 20 | Equipment / asset history | 26 | $176k | **Partial** | Equipment per site; no QR/asset history |
| 21 | Service plans / recurring | 26 | $117k | **Partial** | Plans + selling books first visit; no cycles |
| 22 | Reviews | 22 | $106k | **No** | Backlog #7 |
| 23 | Online booking | 21 | $133k | **Yes** | /book/summit |
| 24 | Proposals & e-sign | 20 | $160k | **Partial** | Typed-name signature on quote; no contract PDF |
| 25 | Job costing | 20 | $144k | **Partial** | Price vs parts cost on job page |
| 26 | Price book | 20 | $140k | **Yes** | Price book with cost and tax code |
| 27 | Certificates & permits | 18 | $144k | **No** | Backlog #3 |
| 28 | AI estimating | 16 | $151k | **No** | Build next (estimating) |
| 29 | Subcontractors / vendors | 14 | $139k | **No** | Not in backlog yet |
| 30 | Accounting sync | 14 | $129k | **No** | Backlog #11 |

## B. Features inside those modules (42 clusters from their own requirements)

Summary: **4 Yes, 15 Partial, 23 No.** The template ships the core journey and its guard rails. Most wants are deliberately left to build on Emergent (DECISIONS #2).

| # | Feature | Tag | Builders | Paid | Job OS | What's there now | Backlog |
|---|---|---|---|---|---|---|---|
| 1 | Granular role/permission matrix | NEED | 23 | $205k | **Partial** | 3 fixed roles; techs never see costs | #10 |
| 2 | Resell as a platform: tenants, plan tiers, trials, lead fees | WANT | 22 | $201k | **No** | Data scoped by org, no tenant admin | #12 |
| 3 | Certificates & service reports with next-due, locked, numbered | WANT | 18 | $164k | **No** | — | #3 |
| 4 | Signed quote = locked truth; change orders with re-approval | WANT | 17 | $129k | **Partial** | Quote locks on approval; no change orders | #4 |
| 5 | Audit trail, MFA, log of every send | NEED | 16 | $132k | **Partial** | Job timeline + message log; no audit/MFA | — |
| 6 | Inventory & parts: reserve, deduct, POs, truck stock | WANT | 15 | $136k | **No** | Parts can be added to a job | #8 |
| 7 | Customer portal / no-login links | NEED | 16 | $119k | **Yes** | Quote, pay, portal, track links | — |
| 8 | Completion gates (photos/checklist/signature/OTP) | WANT | 13 | $129k | **Yes** | Checklist + signature required; no OTP | — |
| 9 | Offline tech app with durable sync | WANT | 14 | $115k | **Partial** | Client queue only; no server idempotency | — |
| 10 | Payment rails: surcharge, Connect, SEPA/QRIS, cash ledger | WANT | 13 | $116k | **No** | Demo checkout + record cash/check | #11 |
| 11 | Price-book tiers, membership pricing, contract rates | WANT | 16 | $92k | **Partial** | Price book with cost; no tiers | — |
| 12 | Deposits & staged payment schedules | WANT | 13 | $107k | **Partial** | Deposit % on quotes ≥ $1k; no stages | — |
| 13 | Country tax & e-invoicing packs | WANT | 13 | $106k | **Partial** | One tax rate setting | #13 |
| 14 | AMC/PPM visit generation by contract cycle | WANT | 15 | $82k | **No** | Plan sale books one visit | #2 |
| 15 | Subcontractor/vendor portal & compliance | WANT | 10 | $122k | **No** | — | — |
| 16 | Collections: AR aging, dunning, credit hold | WANT | 8 | $147k | **Partial** | Aging view + manual reminders | — |
| 17 | Multi-stage projects: Gantt, stages, daily logs | WANT | 10 | $114k | **No** | — | — |
| 18 | Configurable statuses + office review loop | WANT | 14 | $81k | **No** | Fixed job status flow | — |
| 19 | Invisible correctness: timezone, rounding, test vs live | WANT | 11 | $96k | **Partial** | Integer cents; demo/test mode | — |
| 20 | Accounting sync (QuickBooks, Xero, Zoho) | NEED | 11 | $95k | **No** | — | #11 |
| 21 | Bilingual crews & customer docs | WANT | 10 | $98k | **No** | — | — |
| 22 | Two-way messaging with consent, WhatsApp | WANT | 10 | $94k | **No** | One-way texts, logged | #11 |
| 23 | Site hierarchy: account → sites/branches, access notes | WANT | 13 | $70k | **Partial** | Customer → sites with access notes | — |
| 24 | Equipment register: QR, history, serial as key | WANT | 12 | $74k | **Partial** | Equipment per site | — |
| 25 | On-call rotation & emergency fast lane | WANT | 10 | $88k | **No** | — | — |
| 26 | Estimating engines (takeoff, load calc, price range) | DELIGHTER | 10 | $66k | **No** | — | Build next |
| 27 | AI with human in the loop (voice-to-report, receptionist) | DELIGHTER | 11 | $56k | **No** | — | #1 |
| 28 | Payroll-ready timesheets & pay rules | WANT | 10 | $61k | **No** | — | #9 |
| 29 | Dispatch board with double-booking & capacity | NEED | 10 | $59k | **Yes** | Double booking blocked; no capacity % | — |
| 30 | Assignment rules: skills/zones/certificates | WANT | 10 | $52k | **No** | Techs have skills (not enforced) | — |
| 31 | Job costing: planned vs actual, per-site P&L | WANT | 8 | $62k | **Partial** | Price vs parts cost per job | — |
| 32 | Contract lifecycle & recurring billing | WANT | 11 | $43k | **No** | — | #2 |
| 33 | Route building by zone/day | WANT | 6 | $75k | **No** | — | #5 |
| 34 | Role-based money visibility | WANT | 8 | $54k | **Yes** | Techs never see costs/margins | — |
| 35 | Geofenced clock-in / auto-arrive | WANT | 10 | $42k | **No** | — | — |
| 36 | Live tracking & on-my-way ETA | NEED | 7 | $51k | **Partial** | On-my-way text + track page; no live GPS | — |
| 37 | Import from old system (Jobber/CSV) | WANT | 5 | $60k | **No** | — | — |
| 38 | Checklist/form templates per job type | NEED | 7 | $34k | **Partial** | Fixed checklist per job type | — |
| 39 | Financing + good/better/best + e-signed contract | WANT | 6 | $28k | **Partial** | Options + typed signature; no financing | #6 |
| 40 | SLA timers & service KPIs | WANT | 6 | $23k | **No** | — | #2 |
| 41 | Inspection defects → quote → job | DELIGHTER | 4 | $26k | **No** | — | #3 |
| 42 | Technician commission & bonus rules | WANT | 6 | $14k | **No** | — | #9 |

## C. What this means
- **The base already ships the core:** jobs, customers and sites, the dispatch board, the technician app, quotes, invoices, the customer portal, the price book, online booking, completion gates and money hidden from techs.
- **The biggest gaps** (most builders × paid) are the next things to add on Emergent:
  - roles matrix (23 builders)
  - resell-as-platform (22)
  - certificates (18)
  - change orders (17)
  - inventory (15)
  - maintenance-contract cycles (15)
  - payments (13)
  - tax and e-invoicing packs (13)
- **Not in the backlog yet but asked for (10+ builders each):**
  - subcontractor portal
  - multi-stage projects
  - configurable statuses with an office review loop
  - bilingual UI
  - on-call rotation
  - assignment rules
  - geofenced clock-in
  - These suit trade-specific packs: installs for projects, planned maintenance for on-call and SLAs.
- **Not all trades want the same thing:**
  - **Installs and projects:** change orders, stages, retention.
  - **Planned maintenance:** cycles, certificates, SLAs.
  - **Recurring routes:** crew pay and routes.
  - **Service calls:** on-call and emergencies.

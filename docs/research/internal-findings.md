# Job OS: internal findings (what our paying field-service builders wanted)

Dated 2 Oct 2026. Internal evidence file, the field-service counterpart of Dealer OS `internal/FINDINGS.md` (see `whitelabel-research/PLAYBOOK.md` §1.1 row 1, §2).
**Source:** LLM-read profiles (fixed 32-field form) of the field-service jobs and messages of 103 paying Emergent users since 22 Jun 2026, plus per-user metrics (lifetime paid, credits used). Queries: Redash on BigQuery, 1 Oct 2026.
**Sample used below:** the 73 builders whose app is really field service (`is_field_service` = yes 42, partly 31). The other 30 are excluded.
**Privacy:** builders are referred to by the first 8 characters of their user id and business type only. No names, emails, phones or secrets. Requirement text is paraphrased from the profile, not quoted from chat.
**Caveat:** 7aa60b28 and 054ed1be are the same business on two accounts (counted twice in feature counts, once in the DP table). Counts are of builders whose *notable requirements* name the feature; modules they built without calling them out are not counted, so counts are floors.

Shape codes used throughout: **SC** service calls + plans, **RR** recurring routes, **IP** installs & projects in stages, **PM** planned maintenance & compliance (primary shape per builder, from `fs_common.primary_shape`).

## 1. Sample & segments

73 builders · **$492,731 paid** (lifetime) · **$641,154 credits used**. Median paid $4,220. 37 run it in production, 23 have a working MVP, 13 a prototype.

### By shape (primary)

| Group | Builders | Paid $ | Credits $ | Median paid $ |
|---|---|---|---|---|
| Service calls + plans | 33 | 234,016 | 187,576 | 4,101 |
| Installs & projects in stages | 17 | 161,743 | 347,444 | 7,116 |
| Recurring routes | 13 | 50,260 | 53,963 | 3,080 |
| Planned maintenance & compliance | 10 | 46,712 | 52,172 | 3,112 |

### By segment

| Group | Builders | Paid $ | Credits $ | Median paid $ |
|---|---|---|---|---|
| Multi-trade FSM SaaS | 12 | 122,377 | 276,239 | 5,066 |
| Equipment service & AMC | 11 | 99,317 | 84,926 | 6,716 |
| Construction, remodel & handyman | 11 | 68,174 | 73,185 | 4,900 |
| Auto, truck & fleet repair | 8 | 29,538 | 29,520 | 2,896 |
| Facilities & property maintenance | 7 | 55,889 | 31,133 | 3,275 |
| Recurring outdoor & cleaning | 6 | 22,318 | 12,279 | 2,730 |
| HVAC / plumbing / electrical | 6 | 25,405 | 51,510 | 2,395 |
| Security, IT & low-voltage | 4 | 24,845 | 49,507 | 4,948 |
| Home-services marketplace | 4 | 21,515 | 31,280 | 5,090 |
| Other trade ops | 4 | 23,353 | 1,576 | 5,333 |

### By buyer type

| Group | Builders | Paid $ | Credits $ | Median paid $ |
|---|---|---|---|---|
| SaaS founder | 28 | 242,210 | 390,652 | 5,678 |
| Owner-operator | 20 | 75,012 | 102,190 | 3,032 |
| In-house ops team | 11 | 75,720 | 109,713 | 3,275 |
| Unclear | 8 | 33,243 | 1,843 | 2,629 |
| Agency | 6 | 66,546 | 36,757 | 10,681 |

### By region

| Group | Builders | Paid $ | Credits $ | Median paid $ |
|---|---|---|---|---|
| North America | 38 | 253,331 | 266,153 | 4,044 |
| India & Pakistan | 7 | 38,588 | 40,999 | 6,716 |
| EU | 6 | 38,742 | 12,482 | 5,714 |
| Middle East & Africa | 5 | 39,606 | 9,278 | 4,860 |
| Unclear | 5 | 11,512 | 4,035 | 2,280 |
| APAC | 4 | 67,792 | 254,844 | 13,722 |
| LatAm | 4 | 30,054 | 26,043 | 6,335 |
| UK & Ireland | 4 | 13,106 | 27,320 | 2,905 |

### By build depth

| Group | Builders | Paid $ | Credits $ | Median paid $ |
|---|---|---|---|---|
| production-grade/used live | 37 | 315,591 | 494,811 | 7,035 |
| working MVP | 23 | 138,315 | 143,030 | 4,241 |
| prototype | 13 | 38,825 | 3,313 | 2,510 |

Countries: US 34, India 6, Canada 4, UK 3, Australia 2, UAE 2, Germany/Austria 2, unclear 5, and one each in Romania, Brazil, Philippines, France, Ireland, El Salvador, Italy, Hungary, Mexico/Spain, South Africa, Indonesia, Pakistan, Grenada, Zambia, "Arabic markets". **Half the sample is outside North America.**

## 2. What they WANTED (clusters of their own requirements)

627 notable requirements from the 73 builders were clustered into 42 feature clusters (35 WANT/DELIGHTER, 7 NEED) by regex rules over the requirement text, then checked by hand (rules: `scratchpad/fs/clusters.py`, merge and rank: `gen.py`). ~150 one-off requirements matched no cluster (e.g. lien filings, ADAS scans, thermal printers).

Tags: **NEED** = every serious FSM (Jobber, Housecall Pro, ServiceTitan) ships it; build to parity, no demo beat. **WANT** = they asked for or built it beyond the basics, and incumbents do it badly or only at the top tier. **DELIGHTER** = unusual, visible in under 60 s on screen.
**Weight** = builders × paid $ of those builders, indexed so the top row = 100. Paid $ is lifetime spend of the builders in the row (overlaps across rows).

| # | Feature cluster | Tag | Builders | Paid $ | Shapes | Example requirement (top payer) | Builder ids (by paid) | Weight |
|---|---|---|---|---|---|---|---|---|
| 1 | Granular role/permission matrix | NEED | 23 | $205k | IP7 SC7 PM6 RR3 | 7aa60b28: action-level RBAC per module (view/create/edit/approve/send/export) and per-platform permission | 7aa60b28, 3b5de84f, a6550792, 054ed1be, bb29be0d, aa889335, 6815c2d7, 850d6929, 49b2b027, 9f635f69 +13 | 100 |
| 2 | Platform business model: tenants, plan tiers/seats, trials, marketplace lead fees | WANT | 22 | $201k | SC9 IP7 RR3 PM3 | 7aa60b28: multi-tenant subscription tiers with usage allowances and auto-lock on non-payment | 7aa60b28, 054ed1be, bb29be0d, 566ab34a, e0dad5ad, 3b420143, 85a3d07e, 233b109e, ed5ca75f, 50433ce8 +12 | 94 |
| 3 | Certificates & service reports: validity/next-due, locked & numbered, admin-only reopen | WANT | 18 | $164k | SC7 IP5 PM4 RR2 | 7aa60b28: SWMS / compliance hub | 7aa60b28, a6550792, 054ed1be, 3259f1c0, 6815c2d7, c8fa1c86, 20831d92, ed8b3748, 776a5cd3, 2093170b +8 | 63 |
| 4 | Signed quote = locked truth: snapshot on accept, auto-create job, change orders as deltas with re-approval | WANT | 17 | $129k | IP8 SC5 PM3 RR1 | 7aa60b28: deposits, variations, retentions and invoice aging | 7aa60b28, 054ed1be, bb29be0d, 19c99398, 20831d92, aa55e35b, 189f961d, e6b0c9e0, 663ea398, 24d6300f +7 | 47 |
| 5 | Audit trail, MFA, log of every send | NEED | 16 | $132k | SC9 IP5 PM2 | a6550792: MFA for admin roles, device ID/signature hash on submissions, full audit trail | a6550792, 054ed1be, 566ab34a, 3259f1c0, 233b109e, 50433ce8, 850d6929, ed8b3748, 776a5cd3, e6b0c9e0 +6 | 45 |
| 6 | Inventory & parts: reserve on quote, deduct on completion, POs, truck stock | WANT | 15 | $136k | IP7 SC6 RR1 PM1 | 7aa60b28: auto-reorder stock -> draft purchase orders | 7aa60b28, 3b5de84f, bb29be0d, 3259f1c0, 19c99398, 71a2da22, 189f961d, 23da3fc6, 6bd52c01, 253b3362 +5 | 43 |
| 7 | Customer portal / no-login link (approve quote, reports, docs) | NEED | 16 | $119k | SC9 IP3 RR3 PM1 | 7aa60b28: client portal with custom fields surfaced and client self-edit of contact details | 7aa60b28, 3b5de84f, 19c99398, c8fa1c86, 776a5cd3, aa55e35b, 6bd52c01, 369b9efd, c1a95977, f66453d6 +6 | 40 |
| 8 | Completion gates: required photos/checklist/signature/OTP before close | WANT | 13 | $129k | IP6 SC5 RR1 PM1 | 7aa60b28: jobs closeout checklist and AI-generated photo requirements | 7aa60b28, a6550792, aa889335, 3259f1c0, 19c99398, 20831d92, 776a5cd3, 9f635f69, 006de639, 4fd543c7 +3 | 36 |
| 9 | Offline tech app with durable queue & idempotent sync | WANT | 14 | $115k | SC7 IP4 PM3 | a6550792: offline-first capture (before photo persists if app closed) | a6550792, bb29be0d, 566ab34a, 6815c2d7, 9b2dd5d7, 85a3d07e, 9f635f69, 663ea398, 369b9efd, 3d8aa1de +4 | 34 |
| 10 | Payment rails: surcharge/platform fee, Connect, SEPA/QRIS/Zelle, cash ledger | WANT | 13 | $116k | RR6 IP5 SC2 | fc37e15b: platform fee (4.9%) on card payments with optional customer surcharge so contractor keeps 100% | fc37e15b, 054ed1be, aa889335, 19c99398, 850d6929, aa55e35b, 49b2b027, 7946cdbd, 189f961d, 006de639 +3 | 32 |
| 11 | Price-book tiers, membership pricing, customer contract rates & markup rules | WANT | 16 | $92k | SC9 IP5 RR1 PM1 | bb29be0d: supplier catalog with customer-specific pricing and ordering (ABC Supply) | bb29be0d, 3b420143, 85a3d07e, c8fa1c86, 20831d92, ed8b3748, 189f961d, 23da3fc6, 369b9efd, 24d6300f +6 | 31 |
| 12 | Deposits & tiered/staged payment schedules (deposit %, progress, retention, by job value) | WANT | 13 | $107k | IP6 SC4 RR2 PM1 | 7aa60b28: deposits, variations, retentions and invoice aging | 7aa60b28, 054ed1be, 19c99398, 85a3d07e, 20831d92, aa55e35b, e6b0c9e0, 1f257cc4, f66453d6, 37e82baf +3 | 29 |
| 13 | Country tax & e-invoicing packs (GST/HST/VAT, e-Faktur, DTE, multi-state) | WANT | 13 | $106k | IP5 SC4 RR2 PM2 | 3b5de84f: Canadian sales tax (13% HST) on PO lines | 3b5de84f, 054ed1be, 19c99398, 50433ce8, 850d6929, ed8b3748, 776a5cd3, aa55e35b, e6b0c9e0, f66453d6 +3 | 29 |
| 14 | AMC/PPM visit generation by contract cycle (interval, letter group, N months ahead) | WANT | 15 | $82k | RR5 PM5 SC3 IP2 | aa889335: preventive maintenance rules that generate and assign work orders per store | aa889335, 3259f1c0, c8fa1c86, 776a5cd3, aa55e35b, 808ab9c5, 7946cdbd, c2ffed64, bd47152d, 3d8aa1de +5 | 26 |
| 15 | Subcontractor/vendor portal & compliance (own invoices, RFQ, insurance lock) | WANT | 10 | $122k | IP6 SC4 | 7aa60b28: supplier/subcontractor scheduling with double-booking and procurement lead-time warnings | 7aa60b28, a6550792, 054ed1be, e0dad5ad, 19c99398, ed8b3748, 253b3362, f66453d6, 80290e06, 37e82baf | 26 |
| 16 | Collections: AR aging, dunning ladder, credit hold, suspend on non-payment | WANT | 8 | $147k | IP5 SC2 RR1 | 7aa60b28: deposits, variations, retentions and invoice aging | 7aa60b28, fc37e15b, 3b5de84f, 054ed1be, aa889335, 19c99398, 850d6929, 7946cdbd | 25 |
| 17 | Multi-stage projects: Gantt/production board, stages, daily logs | WANT | 10 | $114k | IP8 PM1 SC1 | 7aa60b28: Programs -> Projects -> Jobs hierarchy with Gantt, dependencies/critical path, baselines and de | 7aa60b28, bb29be0d, 3259f1c0, 6815c2d7, 9b2dd5d7, 850d6929, ed8b3748, 189f961d, 663ea398, 37e82baf | 24 |
| 18 | Configurable WO statuses + office review loop (submit -> approve / return for rework) | WANT | 14 | $81k | SC9 IP4 RR1 | a6550792: work order lifecycle with explicit statuses (Unscheduled ... Submitted, Approved, Ready to be P | a6550792, 20831d92, 50433ce8, ed8b3748, 776a5cd3, 808ab9c5, 189f961d, 6bd52c01, c1a95977, 4fd543c7 +4 | 24 |
| 19 | Invisible correctness: business timezone, rounding, no double charge, test vs live | WANT | 11 | $96k | SC5 IP3 RR2 PM1 | 3b5de84f: reporting week Sunday-Saturday in Eastern time | 3b5de84f, e0dad5ad, aa889335, 6815c2d7, 85a3d07e, 189f961d, 6bd52c01, c2ffed64, f66453d6, d517f90b +1 | 22 |
| 20 | Accounting/ERP sync (QuickBooks, Zoho, DATEV) | NEED | 11 | $95k | SC6 RR2 IP2 PM1 | fc37e15b: QuickBooks two-way invoice/payment sync | fc37e15b, 3b5de84f, 85a3d07e, 50433ce8, 49b2b027, 6bd52c01, 4fd543c7, a5c75a08, 37e82baf, 8a525b5c +1 | 22 |
| 21 | Bilingual crews & customer docs (EN/ES, Arabic RTL) | WANT | 10 | $98k | SC5 PM3 IP2 | fc37e15b: bilingual EN/ES UI for crews | fc37e15b, a6550792, 3b420143, 233b109e, 50433ce8, e6b0c9e0, 253b3362, 24d6300f, 4fd543c7, 578a98a6 | 21 |
| 22 | Two-way messaging with consent (SMS YES/HERE/STOP, quiet hours; WhatsApp) | WANT | 10 | $94k | SC5 RR2 IP2 PM1 | 3b5de84f: technician SMS polling/confirmation for on-call | 3b5de84f, a6550792, 233b109e, 850d6929, 2093170b, aa55e35b, 7946cdbd, 1f257cc4, a5c75a08, 37e82baf | 20 |
| 23 | Site hierarchy: account -> sites/branches/units, access notes | WANT | 13 | $70k | SC6 PM3 IP2 RR2 | e0dad5ad: work orders scoped to store number and requesting manager | e0dad5ad, 3259f1c0, c8fa1c86, 50433ce8, 253b3362, 24d6300f, bd47152d, 3d8aa1de, f66453d6, 80290e06 +3 | 19 |
| 24 | Equipment/asset register: QR label -> history, serial/VIN as key | WANT | 12 | $74k | SC6 PM3 IP2 RR1 | 566ab34a: spatial asset registry lookup | 566ab34a, e0dad5ad, 6815c2d7, 776a5cd3, 6bd52c01, 369b9efd, c2ffed64, 3d8aa1de, 4fd543c7, 37e82baf +2 | 19 |
| 25 | On-call rotation & emergency fast-lane | WANT | 10 | $88k | SC9 PM1 | 3b5de84f: full-year technician on-call rotation that respects vacations, statutory holidays and fairness | 3b5de84f, 566ab34a, e0dad5ad, 233b109e, 71a2da22, e6b0c9e0, 80290e06, f0b4793d, b65293b4, 5b7fe7bc | 19 |
| 26 | Estimating engines: takeoff, load calc, instant price-range estimator | DELIGHTER | 10 | $66k | IP5 SC3 PM2 | bb29be0d: roof measurements stored per inspection with revisions; estimate consumes a locked revision; pi | bb29be0d, 3b420143, 19c99398, ed5ca75f, ed8b3748, 9a38a687, 578a98a6, f0b4793d, 2b3c775a, b7f73366 | 14 |
| 27 | AI with a human in the loop: voice-to-report, AI receptionist, drafts to review queue | DELIGHTER | 11 | $56k | SC5 IP3 PM2 RR1 | 3b420143: bilingual EN/ES/Spanglish voice commands for field contractors | 3b420143, 233b109e, ed8b3748, 71a2da22, e6b0c9e0, 23da3fc6, 24d6300f, 37e82baf, 45aa4110, b65293b4 +1 | 13 |
| 28 | Payroll-ready timesheets with pay rules (period, OT, holiday, lock, payslips) | WANT | 10 | $61k | SC4 RR4 PM1 IP1 | fc37e15b: job marked Complete auto-drafts invoice and computes payroll labor hours | fc37e15b, 71a2da22, 49b2b027, 7946cdbd, c2ffed64, 3d8aa1de, 37e82baf, 45aa4110, b7f73366, 7193e1aa | 13 |
| 29 | Dispatch board with double-booking & capacity warnings | NEED | 10 | $59k | SC7 IP2 PM1 | 7aa60b28: supplier/subcontractor scheduling with double-booking and procurement lead-time warnings | 7aa60b28, 2093170b, c1a95977, bd47152d, 37e82baf, b65293b4, b7f73366, 87aaa990, 7193e1aa, c534a8bf | 13 |
| 30 | Assignment rules: skill/zone/certificate matching, block ineligible workers | WANT | 10 | $52k | SC6 IP2 PM1 RR1 | 233b109e: county + trade coverage rules | 233b109e, 20831d92, 71a2da22, c15a4669, 7946cdbd, e6b0c9e0, 23da3fc6, f66453d6, 37e82baf, b65293b4 | 11 |
| 31 | Job costing: planned vs actual margin, per-site/unit P&L | WANT | 8 | $62k | SC3 PM3 IP2 | 3b5de84f: labour vs parts revenue split and per-tech calls/hours | 3b5de84f, 6815c2d7, 19c99398, 23da3fc6, 24d6300f, bd47152d, 5c1fac7a, 112ac56e | 10 |
| 32 | Contract lifecycle & recurring billing (pause/skip, renewals, monthly/rental/MSP invoices) | WANT | 11 | $43k | SC4 RR4 PM2 IP1 | 850d6929: monthly recurring subscriber invoices with automatic isolation (suspend) on non-payment and gra | 850d6929, 776a5cd3, aa55e35b, 6bd52c01, b0611509, c2ffed64, 3d8aa1de, a5c75a08, 112fced6, 45aa4110 +1 | 10 |
| 33 | Route building by zone/day (TSP, multi-day trips, real road km) | WANT | 6 | $75k | IP3 SC2 RR1 | 7aa60b28: weekly runsheet auto-send email + PDF | 7aa60b28, aa889335, 3259f1c0, c8fa1c86, 112fced6, 7193e1aa | 10 |
| 34 | Role-based money visibility (techs/subs never see price, cost, margin) | WANT | 8 | $54k | SC5 PM2 RR1 | a6550792: technician (in-house) vs vendor (3rd-party) roles: technicians see no money, vendors upload the | a6550792, c8fa1c86, 50433ce8, 369b9efd, 1f257cc4, 3d8aa1de, a5c75a08, c534a8bf | 9 |
| 35 | Geofenced clock-in / auto-arrive, with location-privacy rules | WANT | 10 | $42k | SC6 RR2 PM1 IP1 | c8fa1c86: property GPS verification with 100 ft tolerance and confidence score | c8fa1c86, 776a5cd3, 71a2da22, 7946cdbd, 1f257cc4, 3d8aa1de, 37e82baf, 112fced6, b65293b4, 7193e1aa | 9 |
| 36 | Live tracking & 'on my way' ETA | NEED | 7 | $51k | SC3 RR2 PM2 | fc37e15b: live 'on the way / arrived' tech tracking link with pay-invoice CTA | fc37e15b, 49b2b027, 23da3fc6, 006de639, 24d6300f, a5c75a08, 87aaa990 | 8 |
| 37 | Import from old system (Jobber/CSV/Excel) with strict duplicate rules | WANT | 5 | $60k | SC2 PM2 IP1 | fc37e15b: import customers/jobs from Jobber CSV/XLSX | fc37e15b, 3259f1c0, 6815c2d7, 1c540ec6, bd47152d | 6 |
| 38 | Checklist/form templates per job type | NEED | 7 | $34k | RR2 SC2 PM2 IP1 | aa889335: multiple dynamic form templates per work order, filled sequentially by the technician before co | aa889335, 808ab9c5, 23da3fc6, a5c75a08, 578a98a6, 8a525b5c, 62a74456 | 5 |
| 39 | Financing + good/better/best options in the proposal, e-signed contract | WANT | 6 | $28k | SC2 IP2 RR1 PM1 | 85a3d07e: financing plan catalogs per tenant with manufacturer promos, recommended, 0% standard and long- | 85a3d07e, c8fa1c86, 9a38a687, a5c75a08, b7f73366, 5c1fac7a | 4 |
| 40 | SLA timers, escalation & service KPIs (first-time fix, MTTR, repeat faults) | WANT | 6 | $23k | PM3 SC1 RR1 IP1 | 71a2da22: SLA first-response tracking | 71a2da22, e6b0c9e0, c1e76937, bd47152d, 45aa4110, 57b30130 | 3 |
| 41 | Inspection findings/defects -> quote -> job | DELIGHTER | 4 | $26k | PM2 SC1 IP1 | aa889335: ticket resolution can spawn a QMS finding inheriting store, serial, MAC, model | aa889335, e6b0c9e0, bd47152d, 112fced6 | 2 |
| 42 | Technician commission, bonus & revenue-split rules | WANT | 6 | $14k | RR3 SC2 IP1 | c2ffed64: technician cash wallet with cash limit, hand-in to office, approved expenses, salary/advances/i | c2ffed64, 37e82baf, 112fced6, 45aa4110, b7f73366, d517f90b | 2 |

**Reading the table**
- The biggest "wants" are not modules; they are **rules on money and records**: a signed quote that cannot drift (17), deposits and staged schedules (13), certificates/reports that lock and carry a next-due date (18), completion gates (13), office review loops (14), and correctness the user never sees (11: business timezone, rounding, no double charge, test vs live).
- **Platform/reselling** (22 builders, $201k paid) is a want of the SaaS-founder buyer: tenants, plans, seats, trials, module toggles. Job OS is white-label, so these builders are the ones who would resell it.
- NEED rows are still heavily requested (roles 23, audit 16, portal 16). Being table stakes doesn't make them optional: they must work on day one and must not be demo beats.

## 3. What they struggled with → what the template must pre-build

| Theme | Builders | % of 73 | Example (top payer, paraphrased evidence) |
|---|---|---|---|
| Preview vs live, deploys | 40 | 55% | 7aa60b28: GitHub save failures 22/06/26 12:22 & 14:12 (fa4b6e54), 19/07/26 03:35 & 09:18 (269cdd90); asks for new previe |
| Agent on long builds | 26 | 36% | fc37e15b: 13/08 job 7d73ba18: 'wasted nonsense and credit abuse' re API key in .env; 07/09: 'agents all tell lies about  |
| SMS, email & calls | 22 | 30% | 3b5de84f: Graph sendMail 403 blocked (job 88525043); 'production is not sending and receiving emails through on-call' (2 |
| other | 19 | 26% | fc37e15b: SEO/GSC indexing: 25/07 'Why can't we ever get this fixed... google page indexing errors on every single websi |
| Design loops | 17 | 23% | 7aa60b28: Page-by-page aesthetic polish of ~80 pages (msg ~line 164-183), 'canvas still boxed in', 'templates very avera |
| Tenants & roles | 13 | 18% | a6550792: 07/08 'not able to login with 2FA it goes back to login'; 11/08 delete/suspend user with 2FA confirmation; tec |
| Phones & app stores | 11 | 15% | a6550792: 13/08 'deploy this to TestFlight using Expo', 23/08 App Store readiness fixes and EAS |
| Speed & limits | 10 | 14% | 7aa60b28: disk-full 'No space left on device' 22/06/26; handoff warns /app volume fills from webpack cache causing 502s |
| Getting their data in | 9 | 12% | aa889335: Nuclear wipe-and-rebuild of clients_v2/contracts from BSON dumps (handoff 8241fe12); copying prod collections  |
| Money correctness | 8 | 11% | 3b5de84f: AR recovery numbers inaccurate vs QBO (26/06 01:56), financials stopped pulling at 2025 date (26/06 13:45), AR |
| Maps & routes | 8 | 11% | bb29be0d: 27/08 14:07, 15:09 'mobile map images still do not work', 16:57 'why did you remove the maptiler option', 17:3 |
| Scheduling | 8 | 11% | aa889335: Tech can't see assigned OTs, 'today' filter wrong, timezone rollover (04/08-06/08/26, job 8241fe12); FSM date  |
| PDFs | 8 | 11% | 3259f1c0: mass PDF export prints only last day 02/07/26 (ec81a8d2); address fallback on PDFs 02/07/26 (3e1b4918); techni |
| Payments | 8 | 11% | aa889335: Stripe SEPA 'No such customer' / 'unknown parameter add_invoice_items' errors and SEPA cancel-flow crash (hand |

| Struggle | Pre-build in the template so buyers never hit it |
|---|---|
| Preview vs live (55%) | One-click deploy with production DB, secrets and webhooks pre-wired; a preview banner; all customer sends forced to test mode outside production (f66453d6 asked for exactly this) |
| Agent on long builds (36%) | Money and job rules as tested invariants (deposit schedule, CO deltas, cycle generation, commission) so the agent extends, never rewrites; no hard-coded demo results (e0dad5ad) |
| SMS, email & calls (30%) | Twilio A2P/toll-free registration checklist, central messaging service with tenant prefix, consent/STOP/quiet hours built in; verified sending domain with tenant reply-to; WhatsApp adapter for non-US |
| Design loops (23%) | Ship a finished, opinionated UI that already looks like the incumbents they compare to (Jobber/ServiceTitan) so polish rounds aren't needed |
| Tenants & roles (18%) | Tenant scoping, role matrix, money-visibility rules and 2FA in the base; tested with a cross-tenant leak check |
| Phones & app stores (15%) | Installable PWA for techs first; Expo build path with the company owning store accounts and signing keys (1f257cc4) |
| Getting data in (12%) | Import from Jobber/HCP/CSV with strict duplicate keys (serial + certificate number, never description) |
| Money, PDFs, scheduling, maps, payments (11% each) | Server-side money engine (tax on change orders, AR reconciled to accounting), PDF = screen from one template, business timezone everywhere, road distance not straight line, Stripe test/live separation and webhook verification |

## 4. Integrations they used or asked for

Normalised from each builder's `integrations` list (73 builders). "Mocked/pending" = mocked, planned, requested, deferred or blocked in their build.

| Integration (normalised) | Builders | of which mocked/pending | Regions (builders) |
|---|---|---|---|
| LLM (OpenAI/Claude/Gemini via Emergent key) | 41 | 2 | North America 25, India & Pakistan 4, Middle East & Africa 4, LatAm 3, APAC 2, EU 1, UK & Ireland 1, Unclear 1 |
| Stripe (payments/billing) | 25 | 3 | North America 15, APAC 3, UK & Ireland 2, Middle East & Africa 1, Unclear 1, LatAm 1, EU 1, India & Pakistan 1 |
| Twilio SMS/voice | 22 | 5 | North America 18, APAC 2, Middle East & Africa 1, Unclear 1 |
| Object storage (Emergent/S3/R2) | 22 | 0 | North America 11, LatAm 3, Middle East & Africa 3, India & Pakistan 2, APAC 1, UK & Ireland 1, Unclear 1 |
| Resend | 21 | 2 | North America 13, India & Pakistan 2, LatAm 2, APAC 1, Middle East & Africa 1, UK & Ireland 1, EU 1 |
| Expo/EAS/Capacitor mobile | 20 | 4 | North America 10, India & Pakistan 3, APAC 2, Unclear 1, LatAm 1, EU 1, Middle East & Africa 1, UK & Ireland 1 |
| GitHub / external hosting | 17 | 2 | North America 7, APAC 3, EU 3, LatAm 3, India & Pakistan 1 |
| SMTP/Gmail/Graph mail | 15 | 0 | North America 6, India & Pakistan 3, EU 2, LatAm 1, APAC 1, Middle East & Africa 1, Unclear 1 |
| Google Maps/Routes | 13 | 0 | North America 6, LatAm 3, EU 2, APAC 1, India & Pakistan 1 |
| Google reviews/SEO/Analytics | 9 | 3 | North America 7, APAC 1, Unclear 1 |
| QuickBooks Online | 9 | 2 | North America 7, APAC 1, Unclear 1 |
| Push notifications (FCM/PWA) | 7 | 0 | India & Pakistan 3, LatAm 1, APAC 1, North America 1, UK & Ireland 1 |
| WhatsApp (Cloud API/OTP) | 7 | 1 | India & Pakistan 3, LatAm 2, UK & Ireland 1, APAC 1 |
| SendGrid | 6 | 2 | North America 3, APAC 2, EU 1 |
| Stripe Connect | 5 | 0 | North America 5 |
| Voice AI (Whisper, ElevenLabs, Retell, Bolna) | 5 | 0 | North America 2, APAC 1, India & Pakistan 1, LatAm 1 |
| Open maps (Mapbox, Leaflet/OSM, OSRM, MapLibre) | 5 | 0 | North America 2, EU 1, India & Pakistan 1, Middle East & Africa 1 |
| Razorpay / GCash / Helcim | 5 | 3 | India & Pakistan 2, APAC 1, North America 1, Middle East & Africa 1 |
| Other SMS (Telnyx, Globe) | 3 | 0 | North America 2, APAC 1 |
| Xero / MYOB / Zoho | 3 | 1 | APAC 1, North America 1, India & Pakistan 1 |
| Google Calendar / Workspace | 3 | 0 | APAC 1, India & Pakistan 1, North America 1 |
| E-sign / e-notary | 2 | 1 | North America 2 |
| Fleet GPS / telematics | 2 | 0 | North America 2 |

**By region:** North America = Stripe + Twilio + QuickBooks + Google reviews; Stripe Connect and QuickBooks are US/Canada only in this sample. India/LatAm/APAC = WhatsApp, push notifications, Razorpay/GCash/QRIS and local e-invoicing (GST/Zoho Books, e-Faktur, DTE) instead of SMS and QuickBooks. EU = SEPA, DATEV/fiscal signing, Számlázz.hu/Billingo. Email (Resend/SMTP) and LLM via the Emergent key are universal. Ship ports with a US default and region packs: payments (Stripe | Razorpay | SEPA | QRIS), messaging (Twilio | WhatsApp), accounting (QBO | Xero/MYOB | Zoho | DATEV).

## 5. Design partners (fit 4–5)

32 builders scored 4–5 (15 at 5). Ordered by fit, then paid. "Validates" = the WANT clusters in their own requirements.

| DP# | Id | Fit | Segment | Country | Shape | Paid $ | Builds live? | What they'd validate (their WANT clusters) |
|---|---|---|---|---|---|---|---|---|
| DP#1 | 054ed1be | 5 | Multi-trade FSM SaaS | Australia | Installs & projects in stages | 20,000 | production-grade | Platform business model; Certificates & service reports; Signed quote = locked truth; Payment rails |
| DP#2 | 3259f1c0 | 5 | Security, IT & low-voltage | Romania | Installs & projects in stages | 13,205 | production-grade | Certificates & service reports; Inventory & parts; Completion gates; AMC/PPM visit generation by contract c |
| DP#3 | c8fa1c86 | 5 | Recurring outdoor & cleaning | US | Recurring routes | 8,425 | working MVP | Certificates & service reports; Price-book tiers, membership pricing, ; AMC/PPM visit generation by contract c; Site hierarchy |
| DP#4 | 776a5cd3 | 5 | HVAC / plumbing / electrical | Brazil | Service calls + plans | 7,035 | production-grade | Certificates & service reports; Completion gates; Country tax & e-invoicing packs; AMC/PPM visit generation by contract c |
| DP#5 | aa55e35b | 5 | Multi-trade FSM SaaS | US | Recurring routes | 6,431 | production-grade | Platform business model; Signed quote = locked truth; Payment rails; Deposits & tiered/staged payment sched |
| DP#6 | 49b2b027 | 5 | Multi-trade FSM SaaS | Canada | Recurring routes | 5,720 | production-grade | Platform business model; Payment rails; Payroll-ready timesheets with pay rule |
| DP#7 | 23da3fc6 | 5 | Multi-trade FSM SaaS | US | Service calls + plans | 4,411 | production-grade | Platform business model; Inventory & parts; Price-book tiers, membership pricing, ; AI with a human in the loop |
| DP#8 | 1f257cc4 | 5 | Construction, remodel & handyman | US | Service calls + plans | 3,105 | production-grade | Deposits & tiered/staged payment sched; Two-way messaging with consent; Role-based money visibility; Geofenced clock-in / auto-arrive, with |
| DP#9 | c2ffed64 | 5 | Equipment service & AMC | India | Recurring routes | 3,042 | production-grade | Payment rails; AMC/PPM visit generation by contract c; Invisible correctness; Equipment/asset register |
| DP#10 | 3d8aa1de | 5 | Equipment service & AMC | India | Planned maintenance & compliance | 2,865 | production-grade | Offline tech app with durable queue & ; AMC/PPM visit generation by contract c; Site hierarchy; Equipment/asset register |
| DP#11 | a5c75a08 | 5 | Equipment service & AMC | India | Planned maintenance & compliance | 2,751 | production-grade | Signed quote = locked truth; Country tax & e-invoicing packs; AMC/PPM visit generation by contract c; Two-way messaging with consent |
| DP#12 | 37e82baf | 5 | Multi-trade FSM SaaS | US | Installs & projects in stages | 2,636 | production-grade | Signed quote = locked truth; Inventory & parts; Offline tech app with durable queue & ; Deposits & tiered/staged payment sched |
| DP#13 | 112fced6 | 5 | Auto, truck & fleet repair | US | Service calls + plans | 2,500 | working MVP | Certificates & service reports; Offline tech app with durable queue & ; Price-book tiers, membership pricing, ; AMC/PPM visit generation by contract c |
| DP#14 | b7f73366 | 5 | HVAC / plumbing / electrical | US | Service calls + plans | 2,150 | production-grade | Signed quote = locked truth; Price-book tiers, membership pricing, ; Estimating engines; Payroll-ready timesheets with pay rule |
| DP#15 | 112ac56e | 5 | Multi-trade FSM SaaS | Hungary | Service calls + plans | 1,421 | working MVP | Certificates & service reports; Signed quote = locked truth; Country tax & e-invoicing packs; Job costing |
| DP#16 | fc37e15b | 4 | Multi-trade FSM SaaS | US | Service calls + plans | 28,970 | production-grade | Payment rails; Collections; Bilingual crews & customer docs; Payroll-ready timesheets with pay rule |
| DP#17 | 3b5de84f | 4 | Equipment service & AMC | Canada | Service calls + plans | 26,319 | production-grade | Inventory & parts; Country tax & e-invoicing packs; Collections; Invisible correctness |
| DP#18 | a6550792 | 4 | Facilities & property maintenance | US | Service calls + plans | 23,952 | production-grade | Certificates & service reports; Completion gates; Offline tech app with durable queue & ; Subcontractor/vendor portal & complian |
| DP#19 | 19c99398 | 4 | Auto, truck & fleet repair | US | Installs & projects in stages | 9,675 | production-grade | Signed quote = locked truth; Inventory & parts; Completion gates; Payment rails |
| DP#20 | 85a3d07e | 4 | HVAC / plumbing / electrical | US | Service calls + plans | 9,250 | production-grade | Platform business model; Offline tech app with durable queue & ; Price-book tiers, membership pricing, ; Deposits & tiered/staged payment sched |
| DP#21 | 20831d92 | 4 | Equipment service & AMC | India | Service calls + plans | 8,144 | production-grade | Certificates & service reports; Signed quote = locked truth; Completion gates; Price-book tiers, membership pricing,  |
| DP#22 | e6b0c9e0 | 4 | Facilities & property maintenance | UAE | Planned maintenance & compliance | 4,860 | working MVP | Certificates & service reports; Signed quote = locked truth; Deposits & tiered/staged payment sched; Country tax & e-invoicing packs |
| DP#23 | 006de639 | 4 | Home-services marketplace | US | Recurring routes | 3,988 | production-grade | Completion gates; Payment rails |
| DP#24 | 24d6300f | 4 | Facilities & property maintenance | US | Planned maintenance & compliance | 3,275 | production-grade | Signed quote = locked truth; Price-book tiers, membership pricing, ; Bilingual crews & customer docs; Site hierarchy |
| DP#25 | 1c540ec6 | 4 | Multi-trade FSM SaaS | US | Service calls + plans | 3,240 | working MVP | Payment rails; Import from old system |
| DP#26 | bd47152d | 4 | Multi-trade FSM SaaS | Ireland | Planned maintenance & compliance | 2,950 | working MVP | Platform business model; Certificates & service reports; AMC/PPM visit generation by contract c; Site hierarchy |
| DP#27 | f66453d6 | 4 | Facilities & property maintenance | UK | Installs & projects in stages | 2,860 | production-grade | Platform business model; Certificates & service reports; Deposits & tiered/staged payment sched; Country tax & e-invoicing packs |
| DP#28 | 4fd543c7 | 4 | Auto, truck & fleet repair | US | Installs & projects in stages | 2,770 | working MVP | Inventory & parts; Completion gates; Configurable WO statuses + office revi; Bilingual crews & customer docs |
| DP#29 | 45aa4110 | 4 | Recurring outdoor & cleaning | US | Recurring routes | 2,380 | production-grade | AI with a human in the loop; Payroll-ready timesheets with pay rule; Contract lifecycle & recurring billing; SLA timers, escalation & service KPIs |
| DP#30 | 8a525b5c | 4 | HVAC / plumbing / electrical | US | Service calls + plans | 2,180 | prototype | Completion gates; Price-book tiers, membership pricing, ; Configurable WO statuses + office revi; AI with a human in the loop |
| DP#31 | 62a74456 | 4 | Recurring outdoor & cleaning | El Salvador | Recurring routes | 2,151 | production-grade | Certificates & service reports; Inventory & parts; Country tax & e-invoicing packs; Site hierarchy |
| DP#32 | 87aaa990 | 4 | Security, IT & low-voltage | US | Service calls + plans | 1,744 | prototype | Platform business model; Inventory & parts; Deposits & tiered/staged payment sched; Contract lifecycle & recurring billing |

Coverage: SC 14, RR 7, IP 6, PM 5 (one per shape at fit 5: DP#4/776a5cd3 SC, DP#3/c8fa1c86 RR, DP#1/054ed1be IP, DP#10/3d8aa1de PM). Regions: US 18, India 4, Canada 2, plus Australia, Romania, Brazil, Hungary, Ireland, UK, UAE, El Salvador.

## 6. Not all want the same

% of builders in each primary shape whose requirements name the cluster.

| Cluster | SC (n=33) | RR (n=13) | IP (n=17) | PM (n=10) | All (n=73) |
|---|---|---|---|---|---|
| Granular role/permission matrix | 21% | 23% | 41% | 60% | 32% |
| Platform business model: tenants, plan tiers/seats, trials,  | 27% | 23% | 41% | 30% | 30% |
| Certificates & service reports: validity/next-due, locked &  | 21% | 15% | 29% | 40% | 25% |
| Signed quote = locked truth: snapshot on accept, auto-create | 15% | 8% | 47% | 30% | 23% |
| Audit trail, MFA, log of every send | 27% | 0% | 29% | 20% | 22% |
| Inventory & parts: reserve on quote, deduct on completion, P | 18% | 8% | 41% | 10% | 21% |
| Customer portal / no-login link (approve quote, reports, doc | 27% | 23% | 18% | 10% | 22% |
| Completion gates: required photos/checklist/signature/OTP be | 15% | 8% | 35% | 10% | 18% |
| Offline tech app with durable queue & idempotent sync | 21% | 0% | 24% | 30% | 19% |
| Payment rails: surcharge/platform fee, Connect, SEPA/QRIS/Ze | 6% | 46% | 29% | 0% | 18% |
| Price-book tiers, membership pricing, customer contract rate | 27% | 8% | 29% | 10% | 22% |
| Deposits & tiered/staged payment schedules (deposit %, progr | 12% | 15% | 35% | 10% | 18% |
| Country tax & e-invoicing packs (GST/HST/VAT, e-Faktur, DTE, | 12% | 15% | 29% | 20% | 18% |
| AMC/PPM visit generation by contract cycle (interval, letter | 9% | 38% | 12% | 50% | 21% |
| Subcontractor/vendor portal & compliance (own invoices, RFQ, | 12% | 0% | 35% | 0% | 14% |
| Collections: AR aging, dunning ladder, credit hold, suspend  | 6% | 8% | 29% | 0% | 11% |
| Multi-stage projects: Gantt/production board, stages, daily  | 3% | 0% | 47% | 10% | 14% |
| Configurable WO statuses + office review loop (submit -> app | 27% | 8% | 24% | 0% | 19% |
| Invisible correctness: business timezone, rounding, no doubl | 15% | 15% | 18% | 10% | 15% |
| Accounting/ERP sync (QuickBooks, Zoho, DATEV) | 18% | 15% | 12% | 10% | 15% |
| Bilingual crews & customer docs (EN/ES, Arabic RTL) | 15% | 0% | 12% | 30% | 14% |
| Two-way messaging with consent (SMS YES/HERE/STOP, quiet hou | 15% | 15% | 12% | 10% | 14% |
| Site hierarchy: account -> sites/branches/units, access note | 18% | 15% | 12% | 30% | 18% |
| Equipment/asset register: QR label -> history, serial/VIN as | 18% | 8% | 12% | 30% | 16% |
| On-call rotation & emergency fast-lane | 27% | 0% | 0% | 10% | 14% |
| Estimating engines: takeoff, load calc, instant price-range  | 9% | 0% | 29% | 20% | 14% |
| AI with a human in the loop: voice-to-report, AI receptionis | 15% | 8% | 18% | 20% | 15% |
| Payroll-ready timesheets with pay rules (period, OT, holiday | 12% | 31% | 6% | 10% | 14% |
| Dispatch board with double-booking & capacity warnings | 21% | 0% | 12% | 10% | 14% |
| Assignment rules: skill/zone/certificate matching, block ine | 18% | 8% | 12% | 10% | 14% |
| Job costing: planned vs actual margin, per-site/unit P&L | 9% | 0% | 12% | 30% | 11% |
| Contract lifecycle & recurring billing (pause/skip, renewals | 12% | 31% | 6% | 20% | 15% |
| Route building by zone/day (TSP, multi-day trips, real road  | 6% | 8% | 18% | 0% | 8% |
| Role-based money visibility (techs/subs never see price, cos | 15% | 8% | 0% | 20% | 11% |
| Geofenced clock-in / auto-arrive, with location-privacy rule | 18% | 15% | 6% | 10% | 14% |
| Live tracking & 'on my way' ETA | 9% | 15% | 0% | 20% | 10% |
| Import from old system (Jobber/CSV/Excel) with strict duplic | 6% | 0% | 6% | 20% | 7% |
| Checklist/form templates per job type | 6% | 15% | 6% | 20% | 10% |
| Financing + good/better/best options in the proposal, e-sign | 6% | 8% | 12% | 10% | 8% |
| SLA timers, escalation & service KPIs (first-time fix, MTTR, | 3% | 8% | 6% | 30% | 8% |
| Inspection findings/defects -> quote -> job | 3% | 0% | 6% | 20% | 5% |
| Technician commission, bonus & revenue-split rules | 6% | 23% | 6% | 0% | 8% |

**What one shape wants that the others don't**
- **IP (installs & projects)**: signed-quote truth and change orders (47%), multi-stage projects/Gantt/daily logs (47%), inventory reserved on quote (41%), deposits/progress/retention (35%), subcontractor compliance (35%), completion gates (35%), collections (29%). Money-heavy and staged; no on-call.
- **PM (planned maintenance & compliance)**: AMC/PPM cycle generation (50%), certificates/reports with next-due (40%), granular roles (60%), site hierarchy and asset QR (30%), SLA/KPIs (30%), defects → quote (20%), job costing per site (30%), bilingual reports (30%). Least interested in payment rails (0%).
- **RR (recurring routes)**: payment rails and alternative pay methods (46%), cycle/recurrence (38%), contract pause/skip and monthly billing (31%), payroll with pay rules (31%) and commission/bonus (23%). Crew pay is their money problem, not quotes.
- **SC (service calls + plans)**: on-call/emergency fast-lane (27%, nobody else), configurable statuses + office review (27%), price book tiers and memberships (27%), portal (27%), dispatch board (21%).

**By region** (top 25 clusters; small n outside North America, read as direction only)

| Cluster | North America (n=38) | India & Pakistan (n=7) | EU (n=6) | Middle East & Africa (n=5) | Unclear (n=5) | APAC (n=4) | LatAm (n=4) | UK & Ireland (n=4) |
|---|---|---|---|---|---|---|---|---|
| Granular role/permission matrix | 32% | 14% | 0% | 40% | 20% | 75% | 75% | 25% |
| Platform business model: tenants, plan tiers/seats | 29% | 14% | 17% | 20% | 0% | 100% | 25% | 75% |
| Certificates & service reports: validity/next-due, | 13% | 29% | 33% | 40% | 0% | 50% | 75% | 50% |
| Signed quote = locked truth: snapshot on accept, a | 26% | 29% | 17% | 20% | 0% | 50% | 0% | 25% |
| Audit trail, MFA, log of every send | 16% | 0% | 33% | 40% | 20% | 50% | 25% | 50% |
| Inventory & parts: reserve on quote, deduct on com | 24% | 14% | 33% | 0% | 20% | 25% | 25% | 0% |
| Customer portal / no-login link (approve quote, re | 21% | 14% | 17% | 0% | 40% | 25% | 50% | 25% |
| Completion gates: required photos/checklist/signat | 16% | 14% | 17% | 0% | 20% | 25% | 75% | 0% |
| Offline tech app with durable queue & idempotent s | 24% | 14% | 17% | 40% | 0% | 0% | 25% | 0% |
| Payment rails: surcharge/platform fee, Connect, SE | 24% | 14% | 0% | 0% | 0% | 50% | 25% | 0% |
| Price-book tiers, membership pricing, customer con | 37% | 14% | 0% | 0% | 20% | 0% | 0% | 0% |
| Deposits & tiered/staged payment schedules (deposi | 21% | 14% | 0% | 20% | 0% | 50% | 0% | 25% |
| Country tax & e-invoicing packs (GST/HST/VAT, e-Fa | 11% | 14% | 33% | 20% | 0% | 50% | 50% | 25% |
| AMC/PPM visit generation by contract cycle (interv | 11% | 43% | 17% | 20% | 40% | 0% | 50% | 50% |
| Subcontractor/vendor portal & compliance (own invo | 13% | 0% | 17% | 0% | 20% | 50% | 0% | 25% |
| Collections: AR aging, dunning ladder, credit hold | 11% | 0% | 0% | 0% | 0% | 75% | 25% | 0% |
| Multi-stage projects: Gantt/production board, stag | 13% | 0% | 33% | 20% | 0% | 50% | 0% | 0% |
| Configurable WO statuses + office review loop (sub | 24% | 14% | 17% | 0% | 20% | 0% | 25% | 25% |
| Invisible correctness: business timezone, rounding | 13% | 14% | 17% | 20% | 20% | 0% | 25% | 25% |
| Accounting/ERP sync (QuickBooks, Zoho, DATEV) | 21% | 14% | 17% | 0% | 0% | 0% | 25% | 0% |
| Bilingual crews & customer docs (EN/ES, Arabic RTL | 16% | 0% | 33% | 40% | 0% | 0% | 0% | 0% |
| Two-way messaging with consent (SMS YES/HERE/STOP, | 18% | 29% | 0% | 0% | 0% | 25% | 0% | 0% |
| Site hierarchy: account -> sites/branches/units, a | 11% | 14% | 50% | 0% | 40% | 0% | 25% | 50% |
| Equipment/asset register: QR label -> history, ser | 16% | 29% | 0% | 40% | 20% | 0% | 25% | 0% |
| On-call rotation & emergency fast-lane | 11% | 14% | 0% | 40% | 40% | 0% | 0% | 25% |

- **North America**: price-book tiers/memberships (37%), financing/G-B-B, estimating engines, two-way SMS with consent, QuickBooks. The ServiceTitan feature set at Jobber prices.
- **India & Pakistan**: AMC cycles (43%), contract renewals (43%), payroll/attendance/cash wallet (43%), geofenced presence (29%), money visibility (29%), WhatsApp, GST. Cash-heavy, technician-control-heavy.
- **EU / UK**: site hierarchies (50%), certificates (33–50%), country tax and fiscal exports, bilingual docs, GDPR retention.
- **LatAm / APAC / Middle East**: certificates and compliance reports (40–75%), local e-invoicing, completion gates (LatAm 75%), collections/suspension (APAC 75%), Arabic RTL.

**Implication for Job OS:** one core (signed quote → job → gated completion → locked report → invoice/schedule) plus four shape packs (IP: stages + CO + retention; PM: cycles + certificates + SLA; RR: routes + crew pay; SC: on-call + memberships) and region packs (tax, payments, messaging). Money visibility, idempotent offline sync and invisible correctness go in the core because every shape hit them.

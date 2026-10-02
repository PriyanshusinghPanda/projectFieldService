# Job OS: white-label plan (what to build next, and why)

*2 Oct 2026. Combines:*
- *our own evidence: [research/internal-findings.md](research/internal-findings.md) (73 paying field-service builders, $493k paid);*
- *a fast external pass: [research/external-wants.md](research/external-wants.md) (provisional, few sources fetched in full);*
- *integrations: [research/integrations-field-service.md](research/integrations-field-service.md) ((u) rows still to verify);*
- *the method of Dealer OS (`whitelabel_tools/dealer-os`), keeping only what is about selling a template, not about cars.*

## 1. What we take from Dealer OS (category-neutral) and what we don't

**Take (how a template is sold on a call):**
1. A **7-minute script that follows one record** (ours: one job, Chloe's AC: missed call → quote → approve + deposit → schedule → tech on site → paid → plan → owner view → make it yours).
2. A **presenter window**, opened with a key and visible only to the presenter. It does the following:
   - switch between demo businesses;
   - reset in seconds;
   - jump the clock (e.g. "9:14 PM");
   - inject events (missed call, WhatsApp message, web booking, payment);
   - "jump to beat N".
3. **Rebrand in a minute**: the prospect's logo, colour and name on the app, the customer pages, documents and texts.
4. **Bring their data**: import the prospect's customer and price-book CSV, or a Jobber/Housecall Pro export.
5. **Honest simulation**: every value from a third party is labelled Live, Recorded (a real API's response) or Simulated. The labels show only in the presenter view, so the demo reads as shipped software.
6. **Ports for every integration** (live vs simulated adapters), with a plan per stage: Demo → Pilot → Live.
7. **"Can it do X?" answers**: for each common question, where to click.

**Don't take (car-dealer specific):** VIN decoding, vehicle history, book values, listing syndication, title work, the deal desk, credit bureaus and lenders, aging and holding cost.

**Field service needs instead:** the tech's phone is the main screen and works offline; dispatch with time windows; recurring work that creates its own visits; proof on site; money in stages; the four trade shapes; and regional packs (UK certificates, WhatsApp-first in IN/EU/LATAM, AMC contracts in India).

## 2. Wanted features: evidence vs the template today

**Tags:**
- **WANT:** owners ask for it or switch for it.
- **DELIGHTER:** the "wow" in a demo.
- **NEED:** table stakes.

**Evidence columns:**
- **Int** = number of our builders who asked for it.
- **Ext** = external signal, strong (●) or some (◐).

| # | Feature | Tag | Int | Ext | In template now | Do |
|---|---|---|---|---|---|---|
| 1 | Missed call → text back → booked into a real free slot (AI receptionist later) | WANT | 11 (AI) + inbox builders | ● | Text-back simulated; no booking from the message | **Build**: inbox assistant that proposes real free slots + recorded AI call |
| 2 | Plans/contracts that generate visits, bill and renew (incl. AMC/PPM cycles, SLA) | WANT | 15 | ● | Simple interval generation, pause/resume | **Extend**: contract cycles, SLA, renewals, plan billing log |
| 3 | No add-ons / no per-seat fees (pricing model) | WANT | n/a | ● | n/a | Pricing page in Settings (flat price placeholder) |
| 4 | Good/better/best quotes from the price book, on the phone | WANT | 16 (tiers) | ● | Built (office); phone builder missing | Add quote-on-phone in tech app |
| 5 | Signed quote is the locked source of truth + **change orders** | WANT | 17 | ◐ | Lock built; change orders missing | **Build** change orders (delta, re-approval, rolls into invoice) |
| 6 | **Certificates / service reports** with validity + next-due, numbered, locked | WANT | 18 | ◐ (UK) | Missing (checklists only) | **Build** report/certificate templates + next-due reminders |
| 7 | Completion gates (photos, checklist, signature/OTP) | WANT | 13 | ● | Built | Keep; add OTP option |
| 8 | Live profit per job, costs hidden from techs, commission rules | WANT | 16 (roles) | ● | Built (basic) | Granular role matrix (NEED, 23 builders) |
| 9 | Offline tech app that never loses photos | NEED+ | 14 | ● | Offline queue built | Keep; show sync state in demo |
| 10 | Deposits & staged payments by rule | WANT | 13 | ● | Built | Keep |
| 11 | Map-view schedule + route order | WANT | dispatch 29 | ◐ | Lanes only | **Build** map view + "optimise route" (OSRM/Google) |
| 12 | Inventory: reserve on quote, deduct on completion, van stock, POs | WANT | 15 | ◐ | Missing | Build basic van stock + deduct on completion |
| 13 | Resell as a platform (tenants, plans/seats, trials) | WANT (founders) | 22, $201k | n/a | Org scoping only | **Build** "SaaS mode": tenant admin, plan tiers, trials |
| 14 | Financing shown on the quote ("from $X/mo") | WANT (US/UK/AU) | ~10 | ● | Missing | Simulated calculator per option (Wisetack-style), real later |
| 15 | Country tax & e-invoicing packs | NEED (regional) | 13 | ◐ | Basic tax packs | GST/VAT invoice formats; e-invoice file export later |
| 16 | Reviews & referrals after payment | WANT | messaging 25 | ● | Review request text | Add referral link + "only happy customers to Google" gate |
| 17 | Inspection defects → quote | DELIGHTER | 4 | ◐ | Missing | With #6: defects list → one-click quote |
| 18 | Voice note → structured job report | DELIGHTER | 11 | ◐ | Missing | LLM: dictate → summary + line items |
| 19 | Rain-day reschedule in one action | DELIGHTER | n/a | inferred | Missing | Weather (NWS/Open-Meteo) + bulk move + notify |
| 20 | Rebates/data-plate magic on quotes | DELIGHTER (US) | estimating 10 | inferred | Missing | Data-plate photo → model/serial/age (vision); rebates later |

**Not everyone wants the same thing.** Each trade shape switches on a different pack:
- **Installs/projects** want change orders, stages and retention.
- **Planned maintenance** wants cycles, certificates and SLAs.
- **Recurring routes** want crew pay and route days.
- **Service calls** want on-call and emergency handling.

## 3. Integrations (driven by the wants)

Full tables, with Live/Simulated per stage: [research/integrations-field-service.md](research/integrations-field-service.md).

| Powers want # | Default | Regional | Demo | Pilot |
|---|---|---|---|---|
| 1 Missed call / receptionist | Twilio (SMS, voice) + LLM; Retell/Vapi for live voice | Exotel (India), Telnyx | Simulated + recorded call | Live per business |
| 1, 16 WhatsApp | WhatsApp Cloud API (each business connects its own number) | Same everywhere | Meta test number + simulator | Live |
| 10, 13 Payments | Stripe Connect (links, card on file, ACH/Bacs/SEPA) | Razorpay/UPI (IN), Mercado Pago/Pix (LATAM), GoCardless (DD) | Stripe test mode | Live |
| 14 Financing | Wisetack (US) | V12/Klarna (UK), Humm/Zip (AU), Razorpay EMI (IN) | Simulated calculator | Partner agreement |
| 15 Accounting / e-invoice | QuickBooks, Xero | Zoho Books/Tally (IN), MYOB (AU), DATEV export (DE), Peppol/GST/CFDI files | Sync log | Live |
| 11, 19 Maps & weather | Google Places/Routes (free tier), OSRM | Ola Maps/Mappls (IN) | Live free tier | Live |
| 16 Reviews & leads | Google review link; lead e-mail parser (Angi, Checkatrade, Bark) | Checkatrade (UK) | Live link + sample e-mails | GBP API / LSA after approval |
| 18, 20 AI | Emergent LLM key (assistant, voice-to-report, data-plate vision) | — | Live | Live |
| 6 E-sign/certs | In-app signature + PDF; SignWell for contracts | Aadhaar e-sign (IN) | Live | Live |

**Start today (longest lead time first):**
1. Meta business verification, Tech Provider status and App Review (1–4+ weeks).
2. Wisetack partner agreement.
3. Google Ads developer token for Local Services Ads.
4. Google Business Profile API access.
5. US 10DLC SMS registration (1–3 weeks; toll-free verification takes days).
6. Twilio regulatory bundles.
7. Stripe Connect platform review.
8. India: Razorpay and Exotel KYC, DLT SMS registration.
9. Google OAuth verification for calendar access.

## 4. Build plan

**Phase A: make it sellable on a call** (the white-label layer; mostly frontend + a demo API). About 1 day.
1. Presenter window (backtick key):
   - switch demo business: US "Summit Heating & Plumbing" and a second one, UK "Thames Gas & Heating" (CP12 pack) or India "Coolserve AC" (AMC + GST + WhatsApp);
   - reset;
   - clock jump;
   - inject events (missed call, WhatsApp, web booking, payment);
   - jump to beat N;
   - talk-track notes.
2. Rebrand in a minute: logo upload, colour and name, applied to app, customer pages, PDFs and texts.
3. Bring their data: CSV import for customers, sites, equipment and price book (with column mapping), plus Jobber CSV mapping.
4. Integrations page in Settings: each port shows Live / Recorded / Simulated, and the provenance chip appears in presenter view only.
5. "Can it do X?" panel in the presenter window.

**Phase B: top wants not built yet** (each with tests, as in the current suite). About 2–3 days.
1. Certificates & service reports (#6, #17): templates per trade/country, numbered and locked, next-due reminders; defects become a quote.
2. Change orders (#5).
3. Contract cycles + SLA + renewals (#2).
4. Inbox assistant: books real free slots, recorded AI call (#1).
5. Map view + route order + rain-day reschedule (#11, #19).
6. Financing calculator on quote options (#14, simulated).
7. Voice note → job report; data-plate photo → equipment (#18, #20).
8. Van stock: deduct on completion (#12).
9. Granular role matrix (#8).

**Phase C: SaaS mode for founders (#13)** and regional packs.
1. Tenant admin, plan tiers, trials and per-tenant branding.
2. UK CP12/EICR, India AMC + GST invoice + WhatsApp, EU e-invoice export.

## 5. Open items
- **External wants pass is provisional.** Verify the lead quotes (Reddit/G2/Trustpilot) before quoting them to customers.
- **Integration facts marked (u) need checking.** Re-check them against providers' documentation.
- **Tap to Pay needs a native app.** v1 uses a payment link or QR on the tech's phone; Tap to Pay comes later in an app wrapper.
- **Where the template lives.** Agree with Divyam whether Job OS moves into `whitelabel_tools/field-services/` as a sibling app (his repo layout supports that), and share the integration ports rather than building two.

# Job OS: integrations chosen by what field-service owners want

*Research pass, 2 Oct 2026. The method follows Dealer OS (`docs/INTEGRATIONS.md`, `docs/research/integrations-2026-09.md`). Every external system sits behind a port in `backend/app/adapters/`. Each port has a `live` adapter and a labelled **stand-in** (today `messaging.py` writes to the message log and `payments.py` is a fake Stripe). The country pack (`packs/countries.py`) picks the adapter per port.*

**This is a quick pass, not a verified catalogue.** The user asked for it within minutes, so the six source-verification sub-searches were stopped before they reported. Read the markers before quoting anything to a customer.
- **(d)**: checked against the linked primary source in the Dealer OS research pass of 29 Sep 2026.
- **(u)**: unverified. This covers prior knowledge, vendor claims I did not re-check, and anything from `~/Desktop/whitelabel-research/integrations-catalog.md` or `scout-home-property.md`. Those two files were written without our context, so they are used only as leads.
- No marker: a design decision or an architecture point, not a fact about a provider.

**Auth models** (the column "Auth" below):
- **Tenant-OAuth:** each business connects its own account inside Settings → Connections.
- **Tenant-key:** the business pastes its own API key.
- **Platform:** one Job OS account serves every tenant (ISV, Connect or Tech Provider style). The tenant is the merchant or sender of record where the law requires it.
- **Open:** a public or free API; one platform key or no key at all.

---

## 0. What owners want, and the integration behind each want

Wants are ranked from our 73 Emergent field-service builders (PRD §1–3), Capterra and community evidence (scout §4a/4b/4e, (u) until re-read), and the colleague's wireframe ideas.

| # | Wanted outcome | What powers it | Job OS module |
|---|---|---|---|
| W1 | "Never miss a call": text-back now, an AI that answers later | Telephony + SMS/WhatsApp + voice agent + LLM | Inbox |
| W2 | Get paid on site / by link; autopay for plans | Payments (Terminal, links, card on file, direct debit) | Invoices, Plans |
| W3 | Bigger tickets: monthly price on the quote | Consumer financing | Quotes |
| W4 | More 5-star reviews and referrals | Review link + GBP API + referral links | Invoices → Review |
| W5 | Leads land in one place, with source ROI | Lead marketplaces, ad lead forms, web booking | Inbox, Owner view |
| W6 | Books match QuickBooks/Xero without retyping | Accounting sync (+ e-invoice where mandated) | Invoices |
| W7 | Routes that make sense; "on my way" with an ETA | Maps, routing, route optimisation, fleet GPS | Schedule, Tech app |
| W8 | Quotes that feel smart: rebates, roof size, equipment facts | Free "magic" data | Quotes, Tech app |
| W9 | Signed proof and certificates | E-sign, forms and certificates, photos | Quotes, Tech app |
| W10 | The owner runs the business from WhatsApp ("owner agent") | WhatsApp Cloud API + LLM tools over Job OS | Owner view |
| W11 | Hours and commission straight to payroll | Payroll/time export | Team |
| W12 | Parts priced and ordered from my supplier | Supplier catalogues and ordering | Quotes, Jobs |

---

## 1. Integration map by feature

### 1.1 Missed-call text-back and AI receptionist (W1)
| Provider | Powers | Regions | Pricing model | Test mode | Lead time 2026 | Auth | Demo stand-in |
|---|---|---|---|---|---|---|---|
| **Twilio** Voice + SMS | Tracking number; forward to the owner; "no answer" webhook → text-back; call recording on the job | US, CA, UK, AU, EU; **no Indian numbers** (u, [Twilio India voice](https://www.twilio.com/en-us/guidelines/in/voice)) | Per number/month + per minute + per segment. US SMS ≈ $0.0083/segment plus carrier fees (d, [Twilio](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv)) | Trial + test credentials (d) | US: 10DLC brand + campaign 1–3 weeks, toll-free verification days (d). UK/AU/EU numbers need regulatory bundles: address/ID proof, days (u) | Platform (ISV: a subaccount + secondary profile + brand + campaign **per tenant**) (d) | Message log (exists today) + a "simulate missed call" button |
| **Telnyx** | Same as Twilio, cheaper; own AI-assistant product (u) | US, UK, EU, AU (u) | ≈ $0.004/SMS + carrier (d) | Yes (d) | 10DLC: campaign review 24–72 h, then carrier review 3–10 business days (u) | Platform | Same |
| Vonage | Alternative CPaaS | Global (u) | Per use (u) | Yes (u) | Similar 10DLC rules (u) | Platform | – (don't build v1) |
| **Exotel** | Indian virtual numbers, IVR, call-status webhooks; bridge to a voice agent | India | Prepaid packs (≈ ₹10k start (u)) | Trial (u) | KYC 1–3 business days (u, [Exotel](https://developer.exotel.com/docs/faqs/account-setup)) | Tenant-key (each business has its own KYC'd account) | Message log |
| India SMS: MSG91 + **TRAI DLT** | Text-back and reminders over SMS in India | India | Per SMS (u) | – | DLT entity → header → template; templates take 24–48 h (u) | Tenant (DLT entity is the business) | WhatsApp instead (India is WhatsApp-first) |
| **Retell AI** / **Vapi** | Voice agent that answers, qualifies, books a real free slot, texts a summary | Global; brings its own Twilio/Telnyx/SIP number | Per minute, roughly $0.07–0.31/min all-in (u, [Vapi](https://vapi.ai/pricing), [Retell](https://www.retellai.com/pricing)) | Free credits, web test calls (u) | Same day | Platform key; one agent per tenant, configured from Job OS (price book, hours, slots via tool calls) | **Recorded call + transcript** played in the demo; "Call the demo line" only if a US number is live |
| Bland AI | Same | US-centric (u) | Per minute (u) | (u) | Same day (u) | Platform | – |
| **OpenAI Realtime** (or another realtime model) over Twilio Media Streams / SIP | Build-our-own receptionist (Dealer OS target design (d)) | Global | Per audio token (u) | Pay as you go | Same day | Platform | Later |

**Pick:** v1 ships missed-call **text-back** on Twilio (US/CA) and WhatsApp (elsewhere). The **AI receptionist** ships as a stand-in in the demo and on **Retell or Vapi** per customer. Choose by price and latency tests (u). It reuses the same "offer only free slots and real prices" tools the text assistant already needs (PRD §5 Inbox). India: Exotel number → Vapi/Retell over SIP (u: confirm Exotel SIP/stream support).

### 1.2 WhatsApp Business, including the owner agent (W1, W10)
| Provider | Powers | Regions | Pricing | Test | Lead time | Auth | Stand-in |
|---|---|---|---|---|---|---|---|
| **WhatsApp Cloud API** (Job OS as **Tech Provider**, Embedded Signup) | Customer threads, booking confirmations, quotes and pay links, "on my way"; **owner agent**: the owner asks "who owes me?" or "move Mrs Lee to 3pm" and the LLM calls Job OS tools | Global; primary channel in UK, EU, India, LATAM | Per message since 1 Jul 2025. Marketing always charged; utility charged outside the 24 h window; **from 1 Oct 2026 in-window service/utility is billed at utility rates** (d, [Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)) | Meta test number, ≤5 recipients (d) | Business Verification + Tech Provider + App Review: **1–4+ weeks**. Limit of 10 new tenants / 7 days until verified (d, [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers)) | Platform app; **each tenant connects its own WABA and number**, and pays Meta | Simulator: inject inbound, capture outbound (Dealer OS pattern) |
| 360dialog | BSP route if Tech Provider status is slow; partner API for client onboarding (u) | Global, EU-hosted (u) | Monthly per number + Meta fees (u) | (u) | Days (u) | Platform partner | – |
| Gupshup / **Interakt** | India BSPs; Interakt bundles inbox + catalogue (u) | India | Monthly plan + Meta fees (u) | (u) | Days (u) | Tenant-key | – |

The **owner agent** needs no extra provider. It is the same WhatsApp number and the same LLM port, with tools scoped to the owner role and a confirm step for anything that writes. Note that the owner messaging their own business number counts as a customer-service conversation, so it is cheap. Pricing beyond that is (u).

### 1.3 Payments: on site, links, card on file, direct debit (W2)
| Provider | Powers | Regions | Pricing | Test | Lead time | Auth | Stand-in |
|---|---|---|---|---|---|---|---|
| **Stripe Connect** (Accounts v2, direct charges, `application_fee_amount`) | Payment links, deposits, SetupIntent card-on-file for plans, ACH (US), Bacs (UK, 1%, min 20p, cap £4 (d)), SEPA DD, BECS (AU, u) | US, UK, EU, CA, AU, MX, BR (u); **India invite-only** (u, [Stripe](https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india)) | Standard card rates; the platform takes an application fee (d) | Test mode, instant (d) | Platform live review takes days (d); each tenant does its own Stripe KYC | Platform (Connect); the tenant is merchant of record (d) | Existing demo pay page → swap for Stripe **test** mode in the demo |
| **Stripe Terminal / Tap to Pay** | Card on site | Tap to Pay on iPhone/Android in the US, UK, AU, CA, parts of EU (u) | Card-present rates (u) | Simulated reader (u) | Days | Connect | **Tap to Pay needs a native SDK**, so it cannot run from our PWA (u: confirm). v1 = payment link / QR on the tech's phone; native wrapper later |
| Square | On-site + links for tenants already on Square | US, CA, UK, AU, IE, FR, ES, JP (u, [Square](https://developer.squareup.com/docs/build-basics/international-development)) | Square rates (u) | Sandbox (u) | Same day | Tenant-OAuth | – (later adapter) |
| **Razorpay** | UPI QR / intent, payment links, cards, EMI | India | ≈ 2% (u) | Test keys (u) | Partner/sub-merchant onboarding; **Route** split payouts need an RBI compliance certificate since 2025 (u, [Razorpay Route](https://razorpay.com/docs/payments/route/)) | Tenant-key (or partner OAuth (u)) | Demo pay page labelled "UPI (demo)" |
| **GoCardless** | Direct debit for plans/memberships (Bacs, SEPA, BECS, ACH) | UK, EU, AU, NZ, US, CA (u) | ≈1% + fixed, capped (u) | Sandbox (u) | Partner app approval (u) | Tenant-OAuth (partner) | Mandate stand-in |
| PayPal Zettle | Card reader for tenants who already own one | UK, EU, BR, MX (u) | Per transaction (u) | (u) | (u) | Tenant-OAuth (u) | – (later) |
| **Mercado Pago** | Links, Pix (BR), cards, Point readers | AR, BR, CL, CO, MX, PE, UY (u) | Per transaction (u) | Test users (u) | Days (u) | Tenant-OAuth (marketplace) (u) | Demo pay page |

### 1.4 Consumer financing on quotes (W3)
| Provider | Powers | Regions | Model | Test | Lead time | Auth | Stand-in |
|---|---|---|---|---|---|---|---|
| **Wisetack** | "From $X/mo" on each good/better/best option; apply-by-link; funded to the contractor | US only (u) | Merchant pays a fee; 0% promos are merchant-subsidised (u) | Partner sandbox (u) | **Partner programme application: weeks** (u); then each merchant applies | Platform partner + per-merchant onboarding (u) | **Monthly-price calculator** labelled "Financing (demo)"; the apply button opens a fake approval |
| Hearth | Contractor financing marketplace; pre-qualification links (u) | US | Contractor subscription (u) | (u) | Days (u) | **Tenant-link** (paste their Hearth link; no API needed) (u) | Link field in Settings |
| Affirm / Klarna / Afterpay via Stripe | Pay-over-time at checkout on the deposit or invoice (smaller tickets) | Affirm US/CA; Klarna US/UK/EU/AU; Afterpay/Clearpay US/UK/AU (u) | Merchant fee per transaction (u) | Stripe test mode | Payment method enablement on the connected account (u); check service eligibility | Connect | Shown as a payment-method toggle |
| UK: **V12 Retail Finance**, Klarna | Big-ticket finance (boilers, heat pumps) | UK | Merchant fee (u) | (u) | Weeks: the **contractor usually needs FCA credit-broking permission** or must be an appointed representative (u) | Tenant account | Calculator stand-in |
| AU: Humm, Zip | BNPL / bigger-ticket instalments for trades (u) | AU, NZ | Merchant fee (u) | (u) | Weeks (u) | Tenant account | Calculator stand-in |
| India: Razorpay EMI / cardless EMI (Bajaj Finserv etc.) | EMI at checkout | India | Merchant/issuer fee (u) | Razorpay test | With Razorpay (u) | Tenant-key | Shown on the pay page |

### 1.5 Accounting sync (W6)
| Provider | Regions | Pricing to us | Test | Lead time | Auth |
|---|---|---|---|---|---|
| **QuickBooks Online** | US, CA, UK, AU (u: not sold in India since 2023) | Intuit App Partner Program: Builder tier $0 (u) | Sandbox company, free | Dev same day; production keys after a questionnaire; App Store listing takes weeks (d/u) | Tenant-OAuth |
| **Xero** | UK, AU, NZ, global SMB | 2026 tiered developer pricing; Starter $0 for a few connections (d, [Xero](https://developer.xero.com/pricing)) | Demo company | Same day; certification weeks (u) | Tenant-OAuth |
| MYOB | AU, NZ | Partner registration (u) | (u) | Weeks (u) | Tenant-OAuth |
| **Zoho Books** | India + global | Free API; daily caps by plan (u) | Free org | Same day | Tenant-OAuth (per data centre, e.g. `.in`) |
| Tally | India (desktop) | No cloud API: XML over HTTP on the local machine (u) | – | Needs an on-PC connector | Local agent → v1 = **export file** |
| Sage Accounting | UK, EU (u) | (u) | (u) | (u) | Tenant-OAuth |
| DATEV | DE | Export file for the accountant (already in the DE pack) | – | – | File |

Stand-in for all of them: a "sync log" that shows the exact invoice/payment/customer payload that would be posted, with idempotency keys. This meets the PRD rule "QuickBooks or Xero matches, with no duplicates".

### 1.6 E-invoicing mandates (W6; B2B mostly, B2C usually exempt)
| Mandate | Who it bites in field service | Route | Status (all (u) unless noted) |
|---|---|---|---|
| **EU Peppol** (BE B2B from 1 Jan 2026; DE must receive since 2025, issue from 2027–28; FR reform from Sep 2026, small firms issue later; PL KSeF 2026) | Commercial work: property managers, FM contracts | Peppol access point with an API (e.g. Storecove (u)); generate UBL / XRechnung / Factur-X ourselves | Dates (u): re-verify per country before selling |
| **India GST e-invoice (IRP)** | Businesses with AATO ≥ ₹5 cr: few of our trades, but AMC firms with B2B contracts | GSP API (ClearTax, Masters India (u)) or Zoho Books | IRN + signed QR on the PDF; sandbox exists (u) |
| **ZATCA (Saudi Fatoora)** | Saudi pack only | Phase 2 integration waves via an approved solution (u) | Later |
| **Mexico CFDI 4.0** | Every invoice in MX | PAC API, e.g. Facturapi (test mode (u)) | Required for any MX pack |
| **Brazil NFS-e** (services; national standard rolling out 2026 with the tax reform (u)) | Every service invoice in BR | Focus NFe or similar (u) | Required for any BR pack |
| UK | MTD VAT returns; B2B e-invoicing mandate announced for 2029 (u) | HMRC MTD API (sandbox) | Later |

### 1.7 Reviews and referrals (W4)
| Provider | Powers | Test | Lead time | Auth | Stand-in |
|---|---|---|---|---|---|
| **Google "write a review" link** (`https://search.google.com/local/writereview?placeid=…`) | The review request after payment (already a template in `messaging.py`) | n/a | None: real in v1 | Tenant pastes or looks up its Place ID (Places API) | – |
| **Google Business Profile API** | Read reviews, AI-drafted replies, rating trend | **0 QPM until Google approves** (u, [GBP FAQ](https://developers.google.com/my-business/content/faq)) | Application with a verified profile; reported as days to ~2 weeks, plus a minimum profile age (u) | Tenant-OAuth (`business.manage`) | Seeded reviews labelled "demo" |
| NiceJob / Birdeye / Podium | Review campaigns for tenants who already pay for them | (u) | Partner-only APIs (u) | Tenant-key | – (later) |
| Referrals | Per-customer referral link + reward credit on the next invoice | Built in-house | None | – | Real in v1 |

Rule: Google forbids gated or incentivised reviews (u: confirm the policy wording). Ask everyone, and pay referral rewards for **jobs**, never for reviews.

### 1.8 Lead marketplaces and lead sources (W5)
| Source | Regions | Integration reality | Lead time | Auth | Stand-in |
|---|---|---|---|---|---|
| **Google Local Services Ads** | US, CA, UK, some EU (u) | Google Ads API exposes LSA leads and conversations (u); needs a developer token (Basic access review) | Developer token review: days to weeks (u) | Tenant-OAuth (Google Ads) | "Lead from Google LSA" fixture in the inbox |
| Angi (Angi Leads/HomeAdvisor) | US | CRM-partner lead delivery (webhook) or lead e-mails (u) | Partner request (u) | Per-pro account id | **Email parser**: forward lead e-mails to `<tenant>@leads.…`. Real in v1 for any marketplace that e-mails leads |
| Thumbtack | US | Partner API with pro OAuth: leads, messages (u) | Partner application, weeks (u) | Tenant-OAuth | Fixture |
| Yelp | US, some intl | Yelp Leads API for partners (u) | Partner application (u) | Tenant-OAuth (u) | Fixture |
| Checkatrade / MyBuilder / Rated People / Bark | UK (Bark global) | No public lead API known (u); leads arrive by e-mail/app | – | – | **Email parser** |
| Meta Lead Ads / Google Ads lead forms | Global | `leadgen` webhook (Meta App Review); Google lead-form webhook URL + key (u) | Meta: rides on the WhatsApp verification; Google: same day (u) | Tenant-OAuth / webhook key | Test-lead button |
| Web booking (our own) | Global | Public booking page already exists (`public-booking`) | None | – | Real in v1 |

### 1.9 Maps, routing, route optimisation, fleet GPS (W7)
| Provider | Powers | Pricing | Test | Lead time | Auth |
|---|---|---|---|---|---|
| **Google Maps Platform**: Places Autocomplete, Geocoding, Routes (matrix), **Route Optimization API** | Address pin, drive times, "suggest best slot", optimise the day, ETA in "on my way" | Per-SKU free monthly caps since Mar 2025 (no $200 credit). India has its own price list with higher caps (u, [Google India](https://developers.google.com/maps/billing-and-pricing/pricing-india)) | Free caps | Same day (billing account) | Platform key with per-tenant quotas |
| Mapbox | Alternative maps + Optimization API (u) | Free tier (u) | Yes | Same day | Platform |
| HERE | Tour planning (u) | Free tier (u) | Yes | Same day | Platform |
| **OSRM / VROOM / OpenRouteService** | Self-hosted fallback; no per-call cost | Free (OSRM BSD; ORS hosted has daily limits (u)) | n/a | Ops effort | Platform |
| Ola Maps / **Mappls** | India geocoding and routing | Free tiers (u); Ola has a legal-dispute risk (u) | Yes | Same day (u) | Platform |
| **Samsara / Motive / Geotab / Verizon Connect** | Live van location on the dispatch board; arrival from GPS, not the tech's phone | Free to us; the tenant pays the fleet vendor (u) | Samsara/Motive dev accounts; Verizon Connect partner-only (u) | Marketplace app listing takes weeks (u) | Tenant-OAuth / tenant key |

v1 stand-in for fleet: use the **tech phone's own location** on "On my way" (PWA geolocation). Fleet GPS is tier C.

### 1.10 Suppliers, parts, photos, e-sign, calendar, payroll, forms
| Area | Providers | Reality 2026 | Auth | v1 approach |
|---|---|---|---|---|
| Supplier price lists / ordering (W12) | Ferguson, SupplyHouse, Johnstone (US HVAC/plumbing); **ABC Supply** and SRS/Beacon have developer APIs for roofing (u); UK merchants (City Plumbing, Wolseley, BSS, Travis Perkins) mostly offer price files or EDI (u); DE: Datanorm/IDS/UGL standards (u) | Mostly **partner-only, per-account price files**. Few public APIs (u) | Tenant account | **CSV/Datanorm price-file import** into the price book (real); a "Send PO by e-mail" stand-in |
| Job photos | **CompanyCam** API (OAuth, webhooks) (u) | For tenants already on CompanyCam; we store photos ourselves anyway | Tenant-OAuth | Later |
| E-sign (W9) | **SignWell** (embedded, unlimited test mode (d)); Dropbox Sign (`test_mode` (u)); DocuSign (embedded only on expensive tiers (d)); **India Aadhaar eSign** via Leegality/Digio (u) | Our own "click to accept + drawn signature + audit trail" covers most quotes under ESIGN/UETA (d, counsel to confirm) | Platform key | **In-house signature is real in v1**; SignWell for tenants needing certified signatures; Aadhaar later |
| Calendar | Google Calendar API, Microsoft Graph | `calendar.events` is a **sensitive** scope: OAuth verification takes days (u). Never request Gmail scopes | Tenant-OAuth | Real in v1 (unverified-app warning until verified) |
| Payroll / time (W11) | Gusto (embedded / app-integration partner (u)), QuickBooks Payroll (limited API (u)), Deputy, Xero Payroll (UK/AU/NZ), Employment Hero/KeyPay (AU) (u) | Partner approvals vary (u) | Tenant-OAuth | **CSV export of hours + commission** (real); APIs tier C |
| Forms / certificates (W9) | UK **CP12** gas safety record (fields set by Gas Safety (Installation and Use) Regs 1998 reg 36 (u)), **EICR** (BS 7671 model forms (u)); SafetyCulture API (u); Gas Engineer Software has no public API (u) | We generate the documents ourselves | – | Real in v1 (PRD §7). Have a Gas Safe engineer review the form fields before selling |

### 1.11 Free "magic" data (W8)
| Source | Powers | Regions | Access | Commercial use | v1 |
|---|---|---|---|---|---|
| **Rewiring America Incentives API** | "You qualify for $X in rebates" on heat-pump, water-heater and panel quotes | US | Free key (u, [docs](https://docs.rewiringamerica.org/)) | Check terms (u) | Real (US pack) |
| DSIRE | Incentive database | US | Licence for API/bulk (u) | Paid (u) | Later |
| ENERGY STAR product data (Socrata) | Efficiency and certification for a model number | US | Open (u) | Yes (u) | Real |
| AHRI Directory | AHRI certificate on the quote | US | **No public API** (u) | Licence | Manual field |
| **Data-plate OCR** via the LLM vision port | Snap the unit's label → make, model, serial, refrigerant; serial date-code → age | Global | Our LLM | Yes | **Real in v1**: the biggest wow for HVAC/plumbing |
| **Google Solar API** | Roof area, pitch and sun exposure for solar/roofing quotes | ~40 countries; India coverage reported 2026 (u) | Maps billing, free caps (u) | Yes | Real (install pack) |
| Weather: **NWS** (US, free, User-Agent) (u); **Open-Meteo** (free API non-commercial only; paid plan for commercial use (u, [terms](https://open-meteo.com/en/terms))); Met Office DataHub (UK) (u) | Rain-day reschedule for lawn/roof/paint/pool; heat-wave campaign | US / global | Free / paid | Mind the Open-Meteo terms | Real (NWS in US; Open-Meteo paid elsewhere) |
| Property: Regrid (parcels), ATTOM, RentCast; UK EPC register | Lot size for lawn quotes; beds/baths for cleaning price; EPC for heat-pump surveys | US / UK | Trials / free keys (u) | Paid at scale | Stand-in (fixture) + UK EPC real (u) |
| Permits (Shovels, city open data) | "Neighbours who pulled a permit" lead lists | US | Paid / open (u) | – | Later |
| Address services: US Census geocoder, France BAN, NL PDOK/BAG, UK OS Places (u); **EU VIES** VAT check | Address pin; VAT-number check for business customers | US/FR/NL/UK/EU | Free | Yes | Real (PRD §7) |

---

## 2. Tiering against the PRD §7 connection plan and the wireframe ideas

**A: real in v1.** Free or test-mode only, no approval needed; works in the demo with no tenant keys.
**B: labelled stand-in in the demo, real per customer.** The adapter is built; it goes live when the tenant connects an account or an approval lands.
**C: later.** PRD §4 "Next phase", or partner deals measured in months.

| Integration | Tier | PRD §7 bucket | Wireframe idea served |
|---|---|---|---|
| Google Maps Places/Geocoding/Routes + Route Optimization (free caps); OSRM fallback | **A** | Real, free | – |
| Gov address services, EU VIES | **A** | Real, free | – |
| Weather (NWS US; Open-Meteo paid elsewhere) | **A** | Real, free | – |
| CP12 / EICR / e-invoice files (UBL, XRechnung, Factur-X) generated in-house | **A** | Real, free | – |
| Google review link + referral links + in-house e-sign | **A** | (adds to §7) | Reviews/referrals |
| Data-plate OCR, Rewiring America (US), ENERGY STAR, Solar API | **A** | (adds to §7: "magic") | – |
| LLM assistant for text replies and quote drafts | **A** | – | AI receptionist (text) |
| Stripe Connect **test mode** (links, card on file, ACH/Bacs/SEPA) | **A** in demo → **B** live | Real, owner's account | – |
| Twilio SMS/voice text-back | **B** (US live needs 10DLC/toll-free) | Real, owner's account | AI receptionist |
| WhatsApp Cloud API (test number live in demo) + owner agent | **B** | Real, owner's account | WhatsApp owner agent |
| QuickBooks / Xero / Zoho Books (sandbox companies in demo) | **B** | Real, owner's account | – |
| Google Calendar / Microsoft sync | **B** (OAuth verification) | Real, owner's account | – |
| SignWell (certified e-sign) | **B** | Real, owner's account | – |
| Razorpay (IN), Mercado Pago (LATAM), GoCardless (DD) | **B** | Payments row | – |
| Lead e-mail parser (Angi, Checkatrade, Bark, MyBuilder e-mails) | **A** (real; no API needed) | Stand-in → partly real | – |
| AI voice receptionist (Retell/Vapi; Exotel in IN) | **B** (recorded-call stand-in; live per customer) | §4 next phase | **AI receptionist (headline)** |
| Consumer financing (Wisetack US; V12/Klarna UK; Humm/Zip AU; Razorpay EMI IN) | **B** (calculator stand-in) | Stand-in | **Financing** |
| GBP API (review inbox and replies) | **B** (approval) | – | Reviews |
| Google LSA via Ads API, Thumbtack, Yelp, Angi APIs | **B → C** (partner approvals) | Stand-in | – |
| Supplier price-file import (CSV/Datanorm) | **A**; ordering APIs **C** | Stand-in | – |
| Peppol access point / GSP / PAC / NFS-e sending | **B** per country | Stand-in | – |
| Fleet GPS, CompanyCam, payroll APIs, DSIRE, permits, Tap to Pay (native) | **C** | §4 | – |

Gap against PRD §7: the PRD says "card on site and tap to pay … through Stripe" is real with the owner's own account. Tap to Pay most likely needs a native app, and PRD §3 rules out a native app in v1 (u: confirm Stripe has no web Tap to Pay). Proposal: v1 = payment link/QR on the tech's phone plus Stripe Terminal readers (u: check web support for Terminal readers). Tap to Pay arrives with a Capacitor wrapper.

---

## 3. Regional bundles: what each country pack switches on

Proposed `adapters` blocks for `packs/countries.py`. The current file already sets payments, accounting and sms.

| Port | **US** | **UK** | **AU / NZ** | **India** | **EU** (DE/FR/NL/BE…) | **LATAM** (MX/BR) |
|---|---|---|---|---|---|---|
| Messaging | Twilio SMS (10DLC) + WhatsApp | **WhatsApp** + Twilio SMS (alpha sender) | Twilio SMS + WhatsApp | **WhatsApp** + MSG91 (DLT) | **WhatsApp** | **WhatsApp** |
| Voice / receptionist | Twilio + Retell/Vapi | Twilio (UK bundle) + Retell/Vapi | Twilio (AU bundle) + Retell/Vapi | **Exotel** + Vapi/Retell | Twilio (bundle) | Twilio/Telnyx (u) |
| Payments | Stripe Connect (cards, ACH, Terminal) | Stripe (cards, **Bacs**) / GoCardless | Stripe (cards, BECS (u)) / GoCardless | **Razorpay** (UPI, links, EMI) | Stripe (cards, **SEPA**, iDEAL/Bancontact) | **Mercado Pago** (MX/BR; Pix) |
| Financing | **Wisetack** (+ Affirm via Stripe) | V12 / Klarna (FCA permission check) | Humm / Zip | Razorpay EMI | Klarna (u) | Mercado Pago instalments (u) |
| Accounting | **QuickBooks Online** | **Xero** (QBO, Sage alt) | **Xero** / MYOB | **Zoho Books** / Tally export | DATEV export (DE), Xero (u) | Facturapi + local tools (u) |
| Tax / e-invoice | Sales tax by area (Stripe Tax (u)) | VAT + CIS; MTD later | GST; Peppol optional (u) | GST; **IRP via GSP** above ₹5 cr | **Peppol / XRechnung / Factur-X** | **CFDI 4.0 (MX)**, **NFS-e (BR)** |
| Reviews / leads | GBP + **LSA, Angi, Thumbtack, Yelp** | GBP + **Checkatrade, MyBuilder, Rated People** (e-mail parser) | GBP + hipages, Oneflare (u) | GBP + JustDial, IndiaMART (u) | GBP + MyHammer, Werkspot (u) | GBP |
| Magic data | **Rewiring America**, ENERGY STAR, NWS, Solar API | **CP12/EICR**, EPC register, Boiler Upgrade Scheme note (u) | Solar API, state rebates (manual) (u) | India Post PIN codes, Mappls/Ola | VIES, BAN/PDOK addresses | Solar API |
| E-sign | In-house / SignWell | In-house / SignWell | In-house / SignWell | **Aadhaar eSign** (Leegality/Digio) later | In-house; QES only where required | In-house |

---

## 4. Start today: long lead times

Ordered longest first. Durations are (d) where Dealer OS verified them, otherwise (u).

1. **Meta Business Verification → Tech Provider → App Review (WhatsApp + `leads_retrieval`)**: **1–4+ weeks** (d).
   Steps: Business Portfolio → verify the business (legal documents, domain) → create the developer app → apply for Tech Provider → App Review for `whatsapp_business_messaging` / `whatsapp_business_management` → Access Verification. This lifts the onboarding cap of 10 new tenants per 7 days (d). One platform verification covers every tenant.
2. **Wisetack partner (platform) agreement**: **weeks** (u).
   Steps: contact partnerships → integration review → sandbox keys → each merchant then applies (days (u)). In parallel, check UK FCA broker rules for V12/Klarna and talk to Humm/Zip (AU).
3. **Google Ads API developer token (LSA leads)**: **days to weeks** (u).
   Steps: Google Ads manager account → apply for the developer token → Basic access review with a design document → OAuth consent verification.
4. **Google Business Profile API access**: **days to ~2 weeks**; needs a verified, established profile (u).
   Steps: a Google Cloud project → the GBP API access request form using a real GBP (ours or a friendly pilot's) → wait. Quota is 0 until approved (u).
5. **A2P 10DLC (US)**: **1–3 weeks** (d).
   Steps: Twilio upgrade → Primary Customer Profile (ISV) → per tenant: subaccount, Secondary Customer Profile, Brand (≈$4.50 / $46 + $15 vetting (d)), Campaign (≈$1.50–10/mo (d)) → carrier review. For the demo, toll-free verification is faster (days (d)). Unverified toll-free is blocked (u).
6. **Twilio regulatory bundles (UK, AU, EU numbers)**: **days** (u).
   Steps: submit a bundle per country with business address and ID proof → approval → buy numbers. Do the UK first for the WhatsApp-plus-SMS pilot.
7. **Stripe Connect platform**: instant in test mode; **live platform review takes days** (d).
   Steps: a platform account → Connect (Accounts v2) → platform profile and the business's risk questionnaire → test Bacs/SEPA/ACH → request Terminal and Affirm/Klarna on connected accounts (u).
8. **India set-up**: **days to weeks** (u).
   Steps: Razorpay partner account (+ Route RBI certificate only if we need split payouts); Exotel KYC (1–3 business days); TRAI DLT entity → header → templates (MSG91); the Google Maps India billing account.
9. **Google OAuth verification for `calendar.events`**: **days** (u). Steps: verify the domain, publish a privacy policy, record a demo video, submit.
10. **Same day, but do it now**:
    - Intuit developer + production questionnaire, Xero app, Zoho Books app;
    - SignWell sandbox;
    - Retell and Vapi accounts (record the demo call);
    - Rewiring America key, Google Maps key with quotas;
    - a GoCardless partner sandbox, Mercado Pago test users;
    - a Peppol access-point trial (Storecove or similar (u)) and a Facturapi test account (u).

---

## 5. What to do in the code next

- Add ports next to `messaging.py`/`payments.py`, each with a stand-in that writes to a visible log and carries `provenance: "demo"` on screen:
  - `voice.py` (receptionist);
  - `financing.py` (offers on quote options);
  - `accounting.py` (sync log with idempotency);
  - `reviews.py`, `leads.py` (e-mail parser + fixtures);
  - `geo.py`, `einvoice.py`.
- Extend each pack's `adapters` dict to the §3 bundle; Settings → go-live checklist reads it.
- Re-verify every (u) row in §1 against primary sources before a customer conversation. The stopped research tasks covered:
  - voice/SMS, WhatsApp/reviews/leads, payments/financing;
  - accounting/e-invoice/e-sign/payroll, maps/fleet/suppliers;
  - magic data.

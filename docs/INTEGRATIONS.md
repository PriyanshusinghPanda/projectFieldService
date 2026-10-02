# Integrations: what to connect, by stage

What works as soon as keys are added (set them as secrets where the app runs; Settings → Connections shows the status):
- **SMS (Twilio):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (optional `SMS_COUNTRY_CODE`, default 1). Point the number's "A message comes in" webhook at `<api>/api/public/sms/inbound/<slug>`; signatures are checked (set `PUBLIC_API_URL` if behind a proxy). Without keys, texts are saved and marked "not delivered".
- **AI (Ask + AI visibility):** any of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY` (models can be changed with `*_MODEL`). Without one, Ask answers the common questions from the data and AI visibility asks the owner to connect one.

Payments are still a demo checkout; connect the rest per customer when they go live. Full research, with prices and lead times (some items still to verify): `research/integrations-field-service.md`.

| Powers | Default provider | Regional alternatives | Template | Going live needs |
|---|---|---|---|---|
| Payments (links, card on file, deposits) | Stripe Connect | Razorpay/UPI (IN), Mercado Pago/Pix (LATAM), GoCardless (direct debit) | Demo checkout | Stripe platform account + Connect review (days) |
| SMS, two-way texting, missed-call text-back | Twilio | Telnyx; Exotel (India, Twilio has no Indian numbers): swap `send_sms()` | Live with keys | US A2P 10DLC (1–3 weeks) or toll-free verification (days) |
| WhatsApp | WhatsApp Cloud API (each business connects its own number) | Same everywhere | — | Meta business verification + Tech Provider + App Review (1–4+ weeks): start first |
| AI assistant (Ask), AI visibility | OpenAI / Anthropic / Gemini / Perplexity | — | Live with keys |
| AI receptionist (voice) | LLM + Twilio voice (Retell/Vapi) | Exotel (IN) | — | Phone numbers per region |
| Accounting | QuickBooks Online, Xero | Zoho Books / Tally export (IN), MYOB (AU), DATEV export (DE) | — | OAuth app registration |
| Maps & routes | Google Places / Routes (free tier) | OSRM, Ola Maps / Mappls (IN) | — | API key |
| Financing on quotes | Wisetack (US) | V12 / Klarna (UK), Humm / Zip (AU), Razorpay EMI (IN) | — | Partner agreement (weeks) |
| Reviews & leads | Google review link; lead e-mail parsing (Angi, Checkatrade, Bark) | Checkatrade (UK) | — | Google Business Profile API approval; Local Services Ads token |
| E-sign & documents | In-app signature + printable PDF; SignWell for contracts | Aadhaar e-sign (IN) | In-app signature | — |

**Start today (longest lead time first):**
1. Meta / WhatsApp verification.
2. The Wisetack partner agreement.
3. Google Ads token for Local Services Ads.
4. Google Business Profile API access.
5. US 10DLC SMS registration.
6. Stripe Connect.
7. India KYC (Razorpay, Exotel, DLT SMS registration).

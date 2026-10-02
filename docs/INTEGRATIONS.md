# Integrations: what to connect, by stage

In the template, every third party is **simulated**:
- texts are logged;
- the checkout is a demo;
- nothing leaves the machine.

Connect them per customer when they go live. Full research, with prices and lead times (some items still to verify): `research/integrations-field-service.md`.

| Powers | Default provider | Regional alternatives | Template | Going live needs |
|---|---|---|---|---|
| Payments (links, card on file, deposits) | Stripe Connect | Razorpay/UPI (IN), Mercado Pago/Pix (LATAM), GoCardless (direct debit) | Demo checkout | Stripe platform account + Connect review (days) |
| SMS, missed-call text-back | Twilio | Telnyx; Exotel (India, Twilio has no Indian numbers) | Logged | US A2P 10DLC (1–3 weeks) or toll-free verification (days) |
| WhatsApp | WhatsApp Cloud API (each business connects its own number) | Same everywhere | — | Meta business verification + Tech Provider + App Review (1–4+ weeks): start first |
| AI receptionist / assistant | LLM (Emergent key) + Twilio voice (Retell/Vapi) | Exotel (IN) | — | Phone numbers per region |
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

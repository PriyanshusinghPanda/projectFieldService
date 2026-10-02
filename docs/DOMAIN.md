# Domain: records, lifecycles, rules

## Records (all scoped by `org_id`)
| Record | Key fields |
|---|---|
| **Organisation** | name, slug, phone, brand {color, short}, currency, tax_rate_bp, deposit_percent |
| **User** | name, email, role (owner / office / tech), skills, color |
| **Customer** | name, type, phone, email, source, public_token |
| **Site** | address, city, access_notes |
| **Equipment** | type, make, model, serial, installed_on |
| **Price-book item** | code, name, category, trade, unit_price_cents, cost_cents, tax_code (taxable / labor / exempt), bookable |
| **Lead** | name, phone, channel, source, service, status, auto_replied |
| **Quote** | number, customer, site, options[{lines, totals, deposit_cents}], status, chosen_option_id, signature, job_id |
| **Job** | number, customer, site, equipment, lines, status, assigned_tech_ids, scheduled_start/end, checklist, photos, signature, invoice_id, timeline |
| **Invoice** | number, job, lines (snapshot), totals, deposits_applied, amount_paid, balance, status, due_on, public_token |
| **Payment** | kind (deposit / payment), amount_cents, method, invoice or quote |
| **Plan / Membership** | plan: price, visits per year. Membership: customer, site, plan, status |
| **Message** | logged texts (demo: nothing is sent) |

## Lifecycles
- **Quote:** draft → sent → viewed → approved (locked; creates a job), or declined.
- **Job:** new → scheduled → en_route → on_site → in_progress ⇄ paused → completed → invoiced → paid. Also non_complete (with a reason) and cancelled.
- **Invoice:** open → partially_paid → paid.

## Rules that must never break
1. **Money:** integer cents. One `totals()` for quotes, jobs and invoices. Tax applies to taxable lines only.
2. **Quotes:** an approved quote can't be edited. The job's lines are a copy of the chosen option.
3. **Invoices:** an invoice copies the job's lines. A deposit paid on the quote counts once against the invoice.
4. **Scheduling:** a technician can't have two overlapping active jobs.
5. **Finishing:** "completed" needs every required checklist item and a customer signature.
6. **Technicians:** they see only their own jobs and never costs or margins.
7. **Customer links:** public links never return costs or internal notes.

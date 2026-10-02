"""Demo data: a fictional HVAC + plumbing business, "Summit Heating & Plumbing". All names and numbers are made up."""
import random
from datetime import date, datetime, timedelta, timezone

from server import col, hash_pw, phone_key, insert, line, make_invoice, new_id, new_job, number, pay, quote_options, update

R = random.Random(7)
TEAM = [("Jordan Lee", "owner@summit.demo", "owner", []), ("Casey Morgan", "office@summit.demo", "office", []),
        ("Marco Diaz", "marco@summit.demo", "tech", ["hvac"]), ("Nina Patel", "nina@summit.demo", "tech", ["hvac", "electrical"]),
        ("Owen Brooks", "owen@summit.demo", "tech", ["plumbing"])]
COLORS = {"Marco": "#2563eb", "Nina": "#16a34a", "Owen": "#ea580c"}
ITEMS = [("DIAG", "Diagnostic visit", "repair", "hvac", 8900, 0, "labor", True), ("TUNE-AC", "AC tune-up", "maintenance", "hvac", 12900, 2500, "labor", True),
         ("CAP", "Capacitor replacement", "repair", "hvac", 18900, 1800, "taxable", False), ("FANMOTOR", "Condenser fan motor", "repair", "hvac", 42500, 11000, "taxable", False),
         ("RECHARGE", "Refrigerant recharge (per lb)", "repair", "hvac", 9000, 2200, "taxable", False),
         ("AC-3T-16", "3-ton 16 SEER2 AC system", "install", "hvac", 695000, 380000, "taxable", False),
         ("INSTALL-LAB", "Install labour (2 techs, per hour)", "install", "hvac", 18000, 7600, "labor", False),
         ("HAUL", "Haul-away and permit", "install", "hvac", 18000, 6000, "labor", False), ("TSTAT", "Smart thermostat installed", "install", "hvac", 32000, 14000, "taxable", True),
         ("DRAIN", "Drain cleaning", "repair", "plumbing", 22500, 2000, "labor", True), ("WH-50", "50-gal water heater installed", "install", "plumbing", 185000, 82000, "taxable", True),
         ("LEAK", "Leak repair", "repair", "plumbing", 26500, 3500, "taxable", True), ("PANEL", "Panel inspection", "maintenance", "electrical", 19500, 1000, "labor", True)]
PEOPLE = ["Ana Alvarez", "Ben Brennan", "Chloe Cho", "Daniel Dawson", "Emma Eriksen", "Northside Dental", "George Gupta", "Hana Hughes", "Julia Jensen", "Kofi Kowalski"]
STREETS = ["Maple Ave", "Cedar St", "Ridge Rd", "Aspen Ct", "Pine Dr", "Willow Ln", "Elm St", "Birch Way", "Summit Blvd", "Oak Hollow"]
SOURCES = ["google_lsa", "website", "referral", "missed_call", "angi"]


def at(d, h):
    return datetime(d.year, d.month, d.day, h).isoformat()


async def seed():
    org_id = new_id()
    org = {"id": org_id, "name": "Summit Heating & Plumbing", "slug": "summit", "phone": "(555) 010-2400", "email": "hello@summit.demo", "country": "US",
           "currency": "USD", "tax_rate_bp": 825, "tax_label": "Sales tax", "deposit_percent": 25, "brand": {"color": "#0b5cff", "short": "S"}}
    await col("orgs").insert_one(dict(org))
    users = {}
    for name, email, role, skills in TEAM:
        users[name.split()[0]] = await insert("users", org_id, {"name": name, "email": email, "role": role, "skills": skills, "demo": True,
                                                                "color": COLORS.get(name.split()[0]), "password_hash": hash_pw("demo1234")})
    items = {}
    for code, name, cat, trade, price, cost, tax, bookable in ITEMS:
        items[code] = await insert("pricebook", org_id, {"code": code, "name": name, "category": cat, "trade": trade, "kind": "service",
                                                         "unit_price_cents": price, "cost_cents": cost, "tax_code": tax, "active": True, "bookable": bookable})
    plan = await insert("plans", org_id, {"name": "Home Comfort Plan", "price_cents": 1900, "interval": "month", "visits_per_year": 2, "active": True,
                                          "perks": ["2 tune-ups a year", "15% off repairs", "Priority booking"]})
    await insert("plans", org_id, {"name": "Plumbing Care", "price_cents": 1200, "interval": "month", "visits_per_year": 1, "active": True,
                                   "perks": ["Annual water heater flush", "Drain check"]})
    custs = []
    for i, name in enumerate(PEOPLE):
        c = await insert("customers", org_id, {"name": name, "type": "business" if "Dental" in name else "residential", "phone": f"(555) 2{i:02d}-{R.randint(1000, 9999)}",
                                               "email": f"customer{i}@example.com", "prefers": "sms", "tags": [], "tax_exempt": False,
                                               "source": SOURCES[i % len(SOURCES)], "public_token": new_id() + new_id()[:8]})
        s = await insert("sites", org_id, {"customer_id": c["id"], "label": "Home", "address": f"{100 + i * 37} {STREETS[i]}", "city": "Denver, CO",
                                           "access_notes": ["Gate code 4412", "Side entrance", "Dog in backyard", ""][i % 4]})
        e = await insert("equipment", org_id, {"site_id": s["id"], "customer_id": c["id"], "type": ["AC condenser", "Furnace", "Water heater"][i % 3],
                                               "make": ["Carrier", "Trane", "Rheem"][i % 3], "model": "XR14", "serial": f"SN{R.randint(100000, 999999)}",
                                               "installed_on": f"{2010 + i % 12}-05-01"})
        custs.append((c, s, e))
    await insert("memberships", org_id, {"plan_id": plan["id"], "customer_id": custs[0][0]["id"], "site_id": custs[0][1]["id"], "status": "active",
                                         "started_on": (date.today() - timedelta(days=90)).isoformat()})
    today = date.today()
    # history: paid and open invoices over the last 4 months
    menu = [["DIAG", "CAP"], ["TUNE-AC"], ["DRAIN"], ["LEAK"], ["WH-50", "HAUL"], ["PANEL"], ["DIAG", "FANMOTOR", "RECHARGE"]]
    for n in range(24):
        c, s, e = custs[n % len(custs)]
        combo = menu[n % len(menu)]
        tech = users["Owen"] if items[combo[0]]["trade"] == "plumbing" else users[["Marco", "Nina"][n % 2]]
        d = today - timedelta(days=R.randint(3, 120))
        j = await new_job(org, {"customer_id": c["id"], "site_id": s["id"], "title": items[combo[0]]["name"], "job_type": items[combo[0]]["category"],
                                "lines": [line(items[k]) for k in combo]})
        j = await update("jobs", org_id, j["id"], {"assigned_tech_ids": [tech["id"]], "scheduled_start": at(d, 9), "scheduled_end": at(d, 11), "status": "completed"})
        inv = await make_invoice(org, j)
        inv = await update("invoices", org_id, inv["id"], {"issued_on": d.isoformat(), "due_on": (d + timedelta(days=14)).isoformat()})
        if n % 6:
            await pay(org, inv, inv["balance_cents"])
    # today's board
    for (c, s, e), tech, h1, h2, code, status in [(custs[2], "Marco", 8, 10, "DIAG", "on_site"), (custs[3], "Nina", 9, 11, "TUNE-AC", "en_route"),
                                                   (custs[7], "Owen", 8, 12, "WH-50", "in_progress"), (custs[8], "Marco", 11, 12, "DIAG", "scheduled"),
                                                   (custs[9], "Owen", 14, 16, "DRAIN", "scheduled")]:
        j = await new_job(org, {"customer_id": c["id"], "site_id": s["id"], "equipment_ids": [e["id"]], "title": items[code]["name"],
                                "job_type": items[code]["category"], "lines": [line(items[code])]})
        await update("jobs", org_id, j["id"], {"assigned_tech_ids": [users[tech]["id"]], "scheduled_start": at(today, h1), "scheduled_end": at(today, h2), "status": status})
    await new_job(org, {"customer_id": custs[5][0]["id"], "site_id": custs[5][1]["id"], "title": "Quarterly RTU service", "job_type": "maintenance",
                        "lines": [line(items["TUNE-AC"])], "due_date": (today + timedelta(days=10)).isoformat()})
    # quotes: Chloe's AC repair-or-replace with three options (viewed), and a water heater (sent)
    c, s, e = custs[2]
    opts = await quote_options(org, [
        {"name": "Repair", "description": "Replace capacitor and fan motor, recharge 2 lb. 1-year warranty.",
         "lines": [{"item_id": items["CAP"]["id"]}, {"item_id": items["FANMOTOR"]["id"]}, {"item_id": items["RECHARGE"]["id"], "qty": 2}]},
        {"name": "New 16 SEER2 system", "recommended": True, "description": "10-year parts warranty, lower bills, old unit removed.",
         "lines": [{"item_id": items["AC-3T-16"]["id"]}, {"item_id": items["INSTALL-LAB"]["id"], "qty": 8}, {"item_id": items["HAUL"]["id"]}, {"item_id": items["TSTAT"]["id"]}]}])
    await insert("quotes", org_id, {"number": await number(org_id, "quote", "Q-"), "customer_id": c["id"], "site_id": s["id"], "title": "AC repair or replace",
                                    "job_type": "install", "trade": "hvac", "equipment_ids": [e["id"]], "options": opts, "status": "viewed", "notes": "",
                                    "public_token": new_id() + new_id()[:8], "expires_on": (today + timedelta(days=30)).isoformat(), "chosen_option_id": None,
                                    "signature": None, "job_id": None, "deposit_paid_cents": 0, "sent_at": at(today - timedelta(days=1), 17)})
    # inbox
    for name, ch, svc, msg, mins in [("Tom Reyes", "missed_call", "No heat", "Missed call at 9:14pm", 640), ("Lucia Ford", "web_booking", "AC tune-up", "Saturday if possible", 180),
                                     ("Harbor Yoga Studio", "google_lsa", "Water heater", "Water heater leaking", 95), ("Mia Chen", "angi", "Thermostat install", "Smart thermostat", 20)]:
        await insert("leads", org_id, {"name": name, "phone": f"(555) 3{R.randint(10, 99)}-{R.randint(1000, 9999)}", "channel": ch, "source": ch, "service": svc,
                                       "message": msg, "status": "new", "auto_replied": ch == "missed_call",
                                       "created_at": (datetime.now() - timedelta(minutes=mins)).isoformat(timespec="seconds")})
    # a few text conversations (starter content)
    for (c, s_, e), convo in [(custs[2], [("out", "Summit Heating: your quote Q-1001 is ready. Tap to view and approve."),
                                          ("in", "Thanks! Is the new system the quieter one?"), ("out", "Yes, it's a 16 SEER2 unit, much quieter than your current one.")]),
                              (custs[3], [("out", "Summit Heating: Nina is on the way and should arrive in about 20 minutes."), ("in", "Great, the side gate is open.")]),
                              (custs[4], [("in", "Hi, my invoice says due today, can I pay by card?")])]:
        for i, (d, body) in enumerate(convo):
            await insert("messages", org_id, {"channel": "sms", "direction": d, "contact": phone_key(c["phone"]), "phone": c["phone"], "body": body,
                                              "status": "sent" if d == "out" else "received", "related": {}, "read": d == "out" or i < len(convo) - 1,
                                              "created_at": (datetime.now(timezone.utc) - timedelta(minutes=90 - i * 7 - len(c["name"]))).isoformat()})
    return org_id

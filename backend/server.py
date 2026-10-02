"""Job OS: field-service template API. One file, on purpose.

FastAPI + MongoDB (Motor). Set MONGO_URL/DB_NAME; without MONGO_URL it runs on an in-memory database with demo data.
Everything is under /api. Money is integer cents. This is a starting point: owners add their own rules and features
(see the "Build next" page in the app for ready-made prompts).
"""
import os
import uuid
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

SECRET = os.getenv("JWT_SECRET", "dev-only-change-me-set-JWT_SECRET-in-production")
DEMO = os.getenv("DEMO_MODE", "true").lower() == "true"


# ---------------------------------------------------------------- database
class DB:
    db = None
    in_memory = False


def connect():
    if os.getenv("MONGO_URL"):
        from motor.motor_asyncio import AsyncIOMotorClient
        client, DB.in_memory = AsyncIOMotorClient(os.environ["MONGO_URL"]), False
    else:
        from mongomock_motor import AsyncMongoMockClient
        client, DB.in_memory = AsyncMongoMockClient(), True
    DB.db = client[os.getenv("DB_NAME", "job_os")]


def col(name):
    return DB.db[name]


def new_id():
    return uuid.uuid4().hex


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


async def find(name, org, q=None, sort=None, limit=1000):
    cur = col(name).find({"org_id": org, **(q or {})}, {"_id": 0})
    if sort:
        cur = cur.sort(sort)
    return [d async for d in cur.limit(limit)]


async def get(name, org, id_):
    d = await col(name).find_one({"org_id": org, "id": id_}, {"_id": 0})
    if not d:
        raise HTTPException(404, f"{name[:-1]} not found")
    return d


async def insert(name, org, doc):
    doc = {"id": new_id(), "org_id": org, "created_at": now(), **doc}
    await col(name).insert_one(dict(doc))
    return doc


async def update(name, org, id_, patch):
    await col(name).update_one({"org_id": org, "id": id_}, {"$set": {**patch, "updated_at": now()}})
    return await get(name, org, id_)


async def by_token(name, token):
    d = await col(name).find_one({"public_token": token}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Link not found")
    return d


async def number(org, kind, prefix):
    r = await col("counters").find_one_and_update({"org_id": org, "kind": kind}, {"$inc": {"n": 1}}, upsert=True, return_document=True)
    return f"{prefix}{1000 + r['n']}"


async def log_message(org, to, body, related=None):
    await insert("messages", org["id"], {"channel": "sms", "to": to, "body": body, "status": "logged", "related": related or {}})


# ---------------------------------------------------------------- auth
def hash_pw(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=8)).decode()


def token_for(u):
    return jwt.encode({"sub": u["id"], "org": u["org_id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET, algorithm="HS256")


class Ctx:
    def __init__(self, user, org):
        self.user, self.org, self.org_id, self.is_tech = user, org, org["id"], user["role"] == "tech"


async def ctx(authorization: str = Header(default="")):
    try:
        p = jwt.decode(authorization.removeprefix("Bearer "), SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Sign in again")
    user = await col("users").find_one({"id": p["sub"], "org_id": p["org"]}, {"_id": 0, "password_hash": 0})
    org = await col("orgs").find_one({"id": p["org"]}, {"_id": 0})
    if not user or not org:
        raise HTTPException(401, "Sign in again")
    return Ctx(user, org)


async def office(c: Ctx = Depends(ctx)):
    if c.is_tech:
        raise HTTPException(403, "Office only")
    return c


def rules_of(org):
    """The few settings the screens read. Owners add more rules as they build."""
    return {"visibility": {"tech_sees_prices": True, "tech_sees_costs": False},
            "tax": {"rates_bp": {"taxable": org.get("tax_rate_bp", 0), "labor": 0, "exempt": 0}, "label": org.get("tax_label", "Sales tax")},
            "deposit": {"enabled": True, "percent": org.get("deposit_percent", 25), "min_quote_total_cents": 100000},
            "payment_schedule": {"enabled": False, "tiers": []}, "membership": {"discount_percent": 0},
            "quote": {"expires_days": 30}, "recurring": {"generate_weeks_ahead": 12},
            "custom_fields": {"customer": [], "site": [], "equipment": [], "job": []}, "custom": {}}


# ---------------------------------------------------------------- money
def line(item=None, qty=1, **over):
    item = item or {}
    ln = {"id": new_id()[:10], "item_id": item.get("id"), "code": item.get("code"), "name": item.get("name", "Item"),
          "description": item.get("description", ""), "category": item.get("category", "repair"), "kind": item.get("kind", "service"),
          "qty": qty, "unit_price_cents": item.get("unit_price_cents", 0), "cost_cents": item.get("cost_cents", 0),
          "tax_code": item.get("tax_code", "taxable"), "optional": False, **over}
    ln["total_cents"] = round(ln["unit_price_cents"] * ln["qty"])
    return ln


def totals(lines, org, exempt=False):
    rate = 0 if exempt else org.get("tax_rate_bp", 0)
    sub = sum(l["total_cents"] for l in lines if not l.get("optional"))
    taxable = sum(l["total_cents"] for l in lines if not l.get("optional") and l.get("tax_code") == "taxable")
    tax = round(taxable * rate / 10000)
    cost = sum(round(l.get("cost_cents", 0) * l["qty"]) for l in lines if not l.get("optional"))
    return {"subtotal_cents": sub, "tax_cents": tax, "total_cents": sub + tax, "cost_cents": cost, "tax_label": org.get("tax_label", "Sales tax"),
            "tax_lines": [{"code": "taxable", "rate_bp": rate, "taxable_cents": taxable, "tax_cents": tax}] if tax else []}


async def build_lines(org_id, raw):
    out = []
    for r in raw or []:
        item = await col("pricebook").find_one({"org_id": org_id, "id": r.get("item_id")}, {"_id": 0}) if r.get("item_id") else None
        extra = {k: r[k] for k in ("name", "unit_price_cents", "category", "tax_code", "kind", "cost_cents") if k in r}
        out.append(line(item, r.get("qty", 1), optional=bool(r.get("optional")), **extra))
    return out


def for_tech(doc):
    for ln in doc.get("lines", []):
        ln.pop("cost_cents", None)
    doc.pop("profit", None)
    return doc


# ---------------------------------------------------------------- jobs
NEXT = {"new": ["scheduled", "cancelled"], "scheduled": ["en_route", "on_site", "new", "cancelled"], "en_route": ["on_site", "scheduled"],
        "on_site": ["in_progress", "non_complete"], "in_progress": ["paused", "completed", "non_complete"], "paused": ["in_progress", "non_complete"],
        "completed": ["invoiced"], "invoiced": ["paid"], "non_complete": ["scheduled", "new", "cancelled"], "paid": [], "cancelled": ["new"]}
CHECKLISTS = {"repair": ["Confirm the problem with the customer", "Test and diagnose", "Explain options and price before work"],
              "maintenance": ["Inspect and clean unit", "Replace or check filter", "Test safety controls"],
              "install": ["Remove old unit", "Install and connect", "Test and walk the customer through it"],
              "estimate": ["Measure and photograph"]}


async def new_job(org, data):
    jt = data.get("job_type", "repair")
    return await insert("jobs", org["id"], {
        "number": await number(org["id"], "job", "J-"), "customer_id": data["customer_id"], "site_id": data.get("site_id"),
        "equipment_ids": data.get("equipment_ids", []), "title": data.get("title") or jt.title(), "job_type": jt, "trade": data.get("trade", "hvac"),
        "priority": data.get("priority", "normal"), "status": "new", "source": data.get("source", "manual"), "quote_id": data.get("quote_id"),
        "membership_id": data.get("membership_id"), "due_date": data.get("due_date"), "lines": data.get("lines") or await build_lines(org["id"], data.get("raw_lines")),
        "assigned_tech_ids": [], "scheduled_start": None, "scheduled_end": None, "duration_min": data.get("duration_min", 120),
        "checklist": [{"id": new_id()[:8], "label": t, "required": True, "done": False} for t in CHECKLISTS.get(jt, CHECKLISTS["repair"])],
        "photos": [], "signature": None, "notes_internal": "", "notes_customer": "", "invoice_id": None,
        "timeline": [{"at": now(), "text": f"Job created ({data.get('source', 'manual')})"}]})


def completion_errors(job):
    errs = [f"Finish: {i['label']}" for i in job["checklist"] if i["required"] and not i["done"]]
    if not job.get("signature"):
        errs.append("Customer signature required")
    return errs


async def push(name, org_id, id_, field, value):
    await col(name).update_one({"org_id": org_id, "id": id_}, {"$push": {field: value}})


async def make_invoice(org, job):
    if job.get("invoice_id"):
        return await get("invoices", org["id"], job["invoice_id"])
    cust = await get("customers", org["id"], job["customer_id"])
    lines = [l for l in job["lines"] if not l.get("optional")]
    t = totals(lines, org, cust.get("tax_exempt"))
    dep = sum(p["amount_cents"] for p in await find("payments", org["id"], {"job_id": job["id"], "kind": "deposit"}))
    inv = await insert("invoices", org["id"], {
        "number": await number(org["id"], "invoice", "INV-"), "job_id": job["id"], "customer_id": cust["id"], "lines": lines, **t,
        "currency": org.get("currency", "USD"), "deposits_applied_cents": dep, "amount_paid_cents": dep, "balance_cents": t["total_cents"] - dep,
        "status": "paid" if t["total_cents"] <= dep else "open", "issued_on": date.today().isoformat(),
        "due_on": (date.today() + timedelta(days=14)).isoformat(), "public_token": new_id() + new_id()[:8], "stages": [], "custom_fields": []})
    await update("jobs", org["id"], job["id"], {"invoice_id": inv["id"], "status": "invoiced"})
    return inv


async def pay(org, inv, amount, method="card"):
    amount = min(amount, inv["balance_cents"])
    await insert("payments", org["id"], {"kind": "payment", "amount_cents": amount, "method": method, "invoice_id": inv["id"],
                                         "job_id": inv["job_id"], "customer_id": inv["customer_id"], "received_at": now()})
    paid, bal = inv["amount_paid_cents"] + amount, inv["balance_cents"] - amount
    inv = await update("invoices", org["id"], inv["id"], {"amount_paid_cents": paid, "balance_cents": bal, "status": "paid" if bal <= 0 else "partially_paid"})
    if bal <= 0:
        await update("jobs", org["id"], inv["job_id"], {"status": "paid"})
    return inv


# ---------------------------------------------------------------- app
@asynccontextmanager
async def lifespan(_):
    connect()
    if os.getenv("SEED_DEMO", "true").lower() == "true" and not await col("orgs").find_one({}):
        from seed import seed
        await seed()
    yield


app = FastAPI(title="Job OS template", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
async def health():
    return {"ok": True, "in_memory_db": DB.in_memory}


# auth
@app.post("/api/auth/login")
async def login(body: dict):
    u = await col("users").find_one({"email": body.get("email", "").lower().strip()}, {"_id": 0})
    if not u or not bcrypt.checkpw(body.get("password", "").encode(), u["password_hash"].encode()):
        raise HTTPException(401, "Wrong email or password")
    u.pop("password_hash")
    return {"token": token_for(u), "user": u}


@app.post("/api/auth/demo/{role}")
async def demo_login(role: str):
    u = await col("users").find_one({"role": role, "demo": True}, {"_id": 0, "password_hash": 0}) if DEMO else None
    if not u:
        raise HTTPException(404, "No demo user")
    return {"token": token_for(u), "user": u}


@app.get("/api/auth/me")
async def me(c: Ctx = Depends(ctx)):
    return {"user": c.user, "org": c.org, "rules": rules_of(c.org), "demo": DEMO}


# settings, team, home, reports
@app.get("/api/settings")
async def settings(c: Ctx = Depends(office)):
    keys = ("name", "phone", "email", "brand", "tax_rate_bp", "tax_label", "deposit_percent", "currency", "country", "slug")
    return {"org": {k: c.org.get(k) for k in keys}, "rules": rules_of(c.org)}


@app.patch("/api/settings")
async def save_settings(body: dict, c: Ctx = Depends(office)):
    if c.user["role"] != "owner":
        raise HTTPException(403, "Owner only")
    patch = {k: v for k, v in (body.get("org") or {}).items() if k in ("name", "phone", "email", "brand", "tax_rate_bp", "tax_label", "deposit_percent")}
    await col("orgs").update_one({"id": c.org_id}, {"$set": patch})
    org = await col("orgs").find_one({"id": c.org_id}, {"_id": 0})
    return {"org": org, "rules": rules_of(org)}


@app.get("/api/team")
async def team(c: Ctx = Depends(ctx)):
    return [{k: v for k, v in u.items() if k != "password_hash"} for u in await find("users", c.org_id, {}, sort=[("name", 1)])]


@app.post("/api/team")
async def add_member(body: dict, c: Ctx = Depends(office)):
    if c.user["role"] != "owner" or body.get("role") not in ("owner", "office", "tech") or not body.get("email"):
        raise HTTPException(400, "Owner only; name, email and role (owner/office/tech) required")
    if await col("users").find_one({"email": body["email"].lower()}):
        raise HTTPException(409, "Email already in use")
    u = await insert("users", c.org_id, {"name": body.get("name", ""), "email": body["email"].lower(), "role": body["role"], "skills": body.get("skills", []),
                                         "phone": body.get("phone"), "color": body.get("color"), "password_hash": hash_pw(body.get("password") or new_id()[:12])})
    u.pop("password_hash")
    return u


@app.get("/api/home")
async def home(c: Ctx = Depends(office)):
    today = date.today().isoformat()
    jobs, invs, quotes, leads = [await find(n, c.org_id) for n in ("jobs", "invoices", "quotes", "leads")]
    names = {x["id"]: x["name"] for x in await find("customers", c.org_id)}
    techs = {u["id"]: u["name"] for u in await find("users", c.org_id, {"role": "tech"})}
    waiting = [q for q in quotes if q["status"] in ("sent", "viewed")]
    open_inv = [i for i in invs if i["status"] in ("open", "partially_paid")]
    overdue = [i for i in open_inv if i["due_on"] < today]
    new_leads = [l for l in leads if l["status"] == "new"]
    unsched = [j for j in jobs if j["status"] == "new"]
    best = lambda q: max([o["totals"]["total_cents"] for o in q["options"]] or [0])
    week = (date.today() - timedelta(days=date.today().weekday())).isoformat()
    brief = [x for x in [f"{len(new_leads)} new lead(s) waiting for a reply." if new_leads else "",
                         f"{len(waiting)} quote(s) out with customers." if waiting else "",
                         f"{len(overdue)} invoice(s) overdue." if overdue else "",
                         f"{len(unsched)} job(s) waiting to be scheduled." if unsched else ""] if x]
    attention = ([{"kind": "overdue", "id": i["id"], "text": f"{names.get(i['customer_id'], '')} · overdue", "action": "Remind"} for i in overdue[:4]]
                 + [{"kind": "lead", "id": l["id"], "text": f"{l['name']} · {l.get('service', '')}", "action": "Reply"} for l in new_leads[:3]]
                 + [{"kind": "unscheduled", "id": j["id"], "text": f"{names.get(j['customer_id'], '')} · {j['title']}", "action": "Schedule"} for j in unsched[:3]])
    todays = sorted([j for j in jobs if (j.get("scheduled_start") or "").startswith(today)], key=lambda j: j["scheduled_start"])
    return {"date": today, "brief": brief, "attention": attention,
            "tiles": {"new_leads": len(new_leads), "quotes_waiting": {"count": len(waiting), "cents": sum(best(q) for q in waiting)},
                      "to_invoice": {"count": sum(j["status"] == "completed" for j in jobs), "cents": 0},
                      "unpaid": {"count": len(open_inv), "cents": sum(i["balance_cents"] for i in open_inv), "overdue_cents": sum(i["balance_cents"] for i in overdue)},
                      "collected_this_week_cents": sum(p["amount_cents"] for p in await find("payments", c.org_id) if p["received_at"][:10] >= week)},
            "today": [{"id": j["id"], "number": j["number"], "title": j["title"], "status": j["status"], "customer": names.get(j["customer_id"], ""),
                       "techs": [techs.get(t, "") for t in j["assigned_tech_ids"]], "start": j["scheduled_start"], "end": j["scheduled_end"]} for j in todays]}


@app.get("/api/reports")
async def reports(c: Ctx = Depends(office)):
    invs = await find("invoices", c.org_id)
    jobs = {j["id"]: j for j in await find("jobs", c.org_id)}
    custs = {x["id"]: x for x in await find("customers", c.org_id)}
    techs = {u["id"]: u["name"] for u in await find("users", c.org_id, {"role": "tech"})}
    month, src, typ, tech = {}, {}, {}, {}
    for i in invs:
        j, rev = jobs.get(i["job_id"], {}), i["subtotal_cents"]
        profit = rev - i.get("cost_cents", 0)
        month[i["issued_on"][:7]] = month.get(i["issued_on"][:7], 0) + rev
        s = src.setdefault(custs.get(i["customer_id"], {}).get("source") or "direct", [0, 0, 0]); s[0] += 1; s[1] += rev; s[2] += profit
        t = typ.setdefault(j.get("job_type", "other"), [0, 0]); t[0] += rev; t[1] += profit
        for tid in j.get("assigned_tech_ids", []):
            x = tech.setdefault(tid, [0, 0]); x[0] += rev; x[1] += 1
    return {"revenue_by_month": [{"month": k, "cents": v} for k, v in sorted(month.items())],
            "lead_sources": sorted([{"source": k, "jobs": v[0], "revenue_cents": v[1], "profit_cents": v[2]} for k, v in src.items()], key=lambda x: -x["profit_cents"]),
            "job_types": [{"type": k, "revenue_cents": v[0], "margin_percent": round(100 * v[1] / v[0]) if v[0] else 0} for k, v in typ.items()],
            "techs": [{"tech": techs.get(k, k), "revenue_cents": v[0], "jobs": v[1], "avg_ticket_cents": v[0] // max(1, v[1]), "non_complete": 0} for k, v in tech.items()],
            "totals": {"revenue_cents": sum(month.values()), "invoices": len(invs)}}


# customers, sites, equipment, price book, leads
@app.get("/api/customers")
async def customers(q: str = "", c: Ctx = Depends(ctx)):
    rows = await find("customers", c.org_id, {"name": {"$regex": q, "$options": "i"}} if q else {}, sort=[("name", 1)])
    members = {m["customer_id"] for m in await find("memberships", c.org_id)}
    bal = {}
    for i in await find("invoices", c.org_id, {"status": {"$in": ["open", "partially_paid"]}}):
        bal[i["customer_id"]] = bal.get(i["customer_id"], 0) + i["balance_cents"]
    return [{**r, "member": r["id"] in members, "balance_cents": bal.get(r["id"], 0)} for r in rows]


@app.post("/api/customers")
async def create_customer(body: dict, c: Ctx = Depends(office)):
    cust = await insert("customers", c.org_id, {"name": body["name"], "type": body.get("type", "residential"), "phone": body.get("phone"),
                                                "email": body.get("email"), "prefers": "sms", "tags": [], "tax_exempt": False, "source": body.get("source", "direct"),
                                                "public_token": new_id() + new_id()[:8]})
    if body.get("site"):
        await insert("sites", c.org_id, {"customer_id": cust["id"], "label": "Main", **body["site"]})
    return cust


@app.get("/api/customers/{cid}")
async def customer(cid: str, c: Ctx = Depends(ctx)):
    cust = await get("customers", c.org_id, cid)
    invs = await find("invoices", c.org_id, {"customer_id": cid}, sort=[("created_at", -1)])
    return {**cust, "sites": await find("sites", c.org_id, {"customer_id": cid}), "equipment": await find("equipment", c.org_id, {"customer_id": cid}),
            "jobs": await find("jobs", c.org_id, {"customer_id": cid}, sort=[("created_at", -1)]), "invoices": invs,
            "quotes": await find("quotes", c.org_id, {"customer_id": cid}), "memberships": await find("memberships", c.org_id, {"customer_id": cid}),
            "messages": await find("messages", c.org_id, {"to": cust.get("phone")}, sort=[("created_at", -1)], limit=20),
            "balance_cents": sum(i["balance_cents"] for i in invs if i["status"] != "paid"), "lifetime_cents": sum(i["amount_paid_cents"] for i in invs)}


@app.patch("/api/customers/{cid}")
async def update_customer(cid: str, body: dict, c: Ctx = Depends(office)):
    return await update("customers", c.org_id, cid, {k: v for k, v in body.items() if k not in ("id", "org_id")})


@app.post("/api/equipment")
async def add_equipment(body: dict, c: Ctx = Depends(ctx)):
    site = await get("sites", c.org_id, body["site_id"])
    return await insert("equipment", c.org_id, {**{k: v for k, v in body.items() if k not in ("id", "org_id")}, "customer_id": site["customer_id"]})


@app.patch("/api/equipment/{eid}")
async def update_equipment(eid: str, body: dict, c: Ctx = Depends(ctx)):
    return await update("equipment", c.org_id, eid, {k: v for k, v in body.items() if k not in ("id", "org_id")})


@app.get("/api/pricebook")
async def pricebook(q: str = "", category: str = "", c: Ctx = Depends(ctx)):
    query = {"active": True, **({"name": {"$regex": q, "$options": "i"}} if q else {}), **({"category": category} if category else {})}
    rows = await find("pricebook", c.org_id, query, sort=[("name", 1)])
    return [for_tech({"lines": [r]})["lines"][0] for r in rows] if c.is_tech else rows


@app.get("/api/leads")
async def leads(status: str = "", c: Ctx = Depends(office)):
    return await find("leads", c.org_id, {"status": status} if status else {}, sort=[("created_at", -1)])


@app.post("/api/leads")
async def add_lead(body: dict, c: Ctx = Depends(ctx)):
    lead = await insert("leads", c.org_id, {"status": "new", "channel": "phone", "source": "direct", **{k: v for k, v in body.items() if k not in ("id", "org_id")}})
    if lead["channel"] == "missed_call" and lead.get("phone"):
        await log_message(c.org, lead["phone"], f"Sorry we missed your call! This is {c.org['name']}. Reply here and we'll get you booked.", {"type": "lead", "id": lead["id"]})
        lead = await update("leads", c.org_id, lead["id"], {"auto_replied": True})
    return lead


@app.patch("/api/leads/{lid}")
async def update_lead(lid: str, body: dict, c: Ctx = Depends(office)):
    return await update("leads", c.org_id, lid, {k: v for k, v in body.items() if k not in ("id", "org_id")})


@app.post("/api/leads/{lid}/convert")
async def convert_lead(lid: str, c: Ctx = Depends(office)):
    lead = await get("leads", c.org_id, lid)
    cust = await col("customers").find_one({"org_id": c.org_id, "phone": lead.get("phone")}, {"_id": 0}) if lead.get("phone") else None
    if not cust:
        cust = await create_customer({"name": lead["name"], "phone": lead.get("phone"), "email": lead.get("email"), "source": lead.get("source"),
                                      "site": {"address": lead["address"]} if lead.get("address") else None}, c)
    await update("leads", c.org_id, lid, {"customer_id": cust["id"], "status": "contacted"})
    return cust


# quotes
async def quote_options(org, options):
    out = []
    for i, o in enumerate(options or []):
        lines = await build_lines(org["id"], o.get("lines"))
        t = totals(lines, org)
        dep = round(t["total_cents"] * org.get("deposit_percent", 25) / 100) if t["total_cents"] >= 100000 else 0
        out.append({"id": o.get("id") or new_id()[:8], "name": o.get("name") or ["Good", "Better", "Best"][min(i, 2)], "description": o.get("description", ""),
                    "recommended": bool(o.get("recommended")), "lines": lines, "totals": t, "stages": [100], "deposit_cents": dep,
                    "margin_percent": round(100 * (t["subtotal_cents"] - t["cost_cents"]) / t["subtotal_cents"]) if t["subtotal_cents"] else 0})
    return out


@app.get("/api/quotes")
async def quotes(status: str = "", c: Ctx = Depends(office)):
    names = {x["id"]: x["name"] for x in await find("customers", c.org_id)}
    rows = await find("quotes", c.org_id, {"status": status} if status else {}, sort=[("created_at", -1)])
    return [{**q, "customer_name": names.get(q["customer_id"], ""), "best_total_cents": max([o["totals"]["total_cents"] for o in q["options"]] or [0])} for q in rows]


@app.post("/api/quotes")
async def create_quote(body: dict, c: Ctx = Depends(office)):
    return await insert("quotes", c.org_id, {
        "number": await number(c.org_id, "quote", "Q-"), "customer_id": body["customer_id"], "site_id": body.get("site_id"), "lead_id": body.get("lead_id"),
        "title": body.get("title", "Quote"), "job_type": body.get("job_type", "repair"), "trade": body.get("trade", "hvac"), "equipment_ids": body.get("equipment_ids", []),
        "options": await quote_options(c.org, body.get("options")), "status": "draft", "notes": body.get("notes", ""), "public_token": new_id() + new_id()[:8],
        "expires_on": (date.today() + timedelta(days=30)).isoformat(), "chosen_option_id": None, "signature": None, "job_id": None, "deposit_paid_cents": 0})


@app.get("/api/quotes/{qid}")
async def quote(qid: str, c: Ctx = Depends(office)):
    q = await get("quotes", c.org_id, qid)
    return {**q, "customer": await get("customers", c.org_id, q["customer_id"])}


@app.patch("/api/quotes/{qid}")
async def update_quote(qid: str, body: dict, c: Ctx = Depends(office)):
    q = await get("quotes", c.org_id, qid)
    if q["status"] not in ("draft", "sent", "viewed"):
        raise HTTPException(409, "This quote was approved and is locked")
    patch = {k: body[k] for k in ("title", "notes", "site_id", "job_type", "trade") if k in body}
    if "options" in body:
        patch["options"] = await quote_options(c.org, body["options"])
    return await update("quotes", c.org_id, qid, patch)


@app.post("/api/quotes/{qid}/send")
async def send_quote(qid: str, request: Request, c: Ctx = Depends(office)):
    q = await get("quotes", c.org_id, qid)
    cust = await get("customers", c.org_id, q["customer_id"])
    await log_message(c.org, cust.get("phone"), f"{c.org['name']}: your quote {q['number']} is ready: {request.headers.get('origin', '')}/q/{q['public_token']}")
    return await update("quotes", c.org_id, qid, {"status": "sent", "sent_at": now()})


@app.post("/api/quotes/{qid}/decline")
async def decline_quote(qid: str, body: dict, c: Ctx = Depends(office)):
    return await update("quotes", c.org_id, qid, {"status": "declined", "decline_reason": body.get("reason", "")})


async def approve_quote(org, q, option_id, signer):
    if q["status"] not in ("draft", "sent", "viewed"):
        raise HTTPException(409, "This quote has already been answered")
    opt = next((o for o in q["options"] if o["id"] == option_id), None)
    if not opt or not signer:
        raise HTTPException(400, "Pick an option and type your name")
    job = await new_job(org, {"customer_id": q["customer_id"], "site_id": q.get("site_id"), "equipment_ids": q.get("equipment_ids", []),
                              "title": f"{q['title']}: {opt['name']}", "job_type": q.get("job_type", "repair"), "source": "quote", "quote_id": q["id"], "lines": opt["lines"]})
    return await update("quotes", org["id"], q["id"], {"status": "approved", "chosen_option_id": option_id, "approved_at": now(),
                                                       "signature": {"name": signer, "at": now()}, "deposit_due_cents": opt["deposit_cents"], "job_id": job["id"]}), job


# jobs and the technician app
def job_view(c, j):
    j["totals"] = totals(j["lines"], c.org)
    return for_tech(j) if c.is_tech else j


@app.get("/api/jobs")
async def jobs(status: str = "", tech_id: str = "", date: str = "", unscheduled: bool = False, c: Ctx = Depends(ctx)):
    q = {"status": "new"} if unscheduled else ({"status": {"$in": status.split(",")}} if status else {})
    if c.is_tech or tech_id:
        q["assigned_tech_ids"] = c.user["id"] if c.is_tech else tech_id
    names = {x["id"]: x["name"] for x in await find("customers", c.org_id)}
    sites = {x["id"]: x for x in await find("sites", c.org_id)}
    out = []
    for j in await find("jobs", c.org_id, q, sort=[("scheduled_start", 1)]):
        if date and not (j.get("scheduled_start") or "").startswith(date):
            continue
        s = sites.get(j.get("site_id")) or {}
        out.append(job_view(c, {**j, "customer_name": names.get(j["customer_id"], ""), "photo_count": len(j["photos"]),
                                "address": ", ".join(x for x in (s.get("address"), s.get("city")) if x)}))
    return out


@app.post("/api/jobs")
async def create_job(body: dict, c: Ctx = Depends(office)):
    return await new_job(c.org, {**body, "raw_lines": body.get("lines"), "lines": None})


async def my_job(c, jid):
    j = await get("jobs", c.org_id, jid)
    if c.is_tech and c.user["id"] not in j["assigned_tech_ids"]:
        raise HTTPException(403, "Not your job")
    return j


@app.get("/api/jobs/{jid}")
async def job(jid: str, c: Ctx = Depends(ctx)):
    j = await my_job(c, jid)
    j["customer"] = await get("customers", c.org_id, j["customer_id"])
    j["site"] = await col("sites").find_one({"org_id": c.org_id, "id": j.get("site_id")}, {"_id": 0})
    j["equipment"] = await find("equipment", c.org_id, {"id": {"$in": j.get("equipment_ids", [])}})
    j["history"] = [{"number": x["number"], "title": x["title"], "status": x["status"], "date": x["created_at"][:10]}
                    for x in await find("jobs", c.org_id, {"site_id": j.get("site_id"), "id": {"$ne": jid}}, limit=10)] if j.get("site_id") else []
    j["completion_errors"] = completion_errors(j) if j["status"] in ("on_site", "in_progress", "paused") else []
    j["allowed_next"], j["custom_field_defs"] = NEXT.get(j["status"], []), {"equipment": [], "job": []}
    if j.get("invoice_id") and not c.is_tech:
        j["invoice"] = await get("invoices", c.org_id, j["invoice_id"])
    j = job_view(c, j)
    if not c.is_tech:
        t = j["totals"]
        j["profit"] = {"price_cents": t["subtotal_cents"], "parts_cost_cents": t["cost_cents"], "labor_cost_cents": 0, "profit_cents": t["subtotal_cents"] - t["cost_cents"]}
    return j


@app.patch("/api/jobs/{jid}")
async def update_job(jid: str, body: dict, c: Ctx = Depends(office)):
    patch = {k: body[k] for k in ("title", "priority", "notes_internal", "notes_customer", "equipment_ids", "duration_min") if k in body}
    if "lines" in body:
        patch["lines"] = await build_lines(c.org_id, body["lines"])
    return await update("jobs", c.org_id, jid, patch)


@app.post("/api/jobs/{jid}/schedule")
async def schedule(jid: str, body: dict, c: Ctx = Depends(office)):
    j, techs, start, end = await get("jobs", c.org_id, jid), body.get("tech_ids", []), body["start"], body["end"]
    for o in await find("jobs", c.org_id, {"assigned_tech_ids": {"$in": techs}, "status": {"$in": ["scheduled", "en_route", "on_site", "in_progress"]}, "id": {"$ne": jid}}):
        if o.get("scheduled_start") and start < o["scheduled_end"] and o["scheduled_start"] < end:
            raise HTTPException(409, f"Double booking: overlaps {o['number']} ({o['title']})")
    status = "scheduled" if j["status"] in ("new", "non_complete", "scheduled") else j["status"]
    await push("jobs", c.org_id, jid, "timeline", {"at": now(), "text": f"Scheduled {start[:16].replace('T', ' ')}"})
    return await update("jobs", c.org_id, jid, {"assigned_tech_ids": techs, "scheduled_start": start, "scheduled_end": end, "status": status})


@app.post("/api/jobs/{jid}/unschedule")
async def unschedule(jid: str, c: Ctx = Depends(office)):
    return await update("jobs", c.org_id, jid, {"assigned_tech_ids": [], "scheduled_start": None, "scheduled_end": None, "status": "new"})


@app.post("/api/jobs/{jid}/status")
async def set_status(jid: str, body: dict, c: Ctx = Depends(ctx)):
    j, to = await my_job(c, jid), body["to"]
    if to not in NEXT.get(j["status"], []):
        raise HTTPException(409, f"A job can't go from {j['status']} to {to}")
    if to == "completed" and completion_errors(j):
        raise HTTPException(422, {"message": "Can't finish yet", "errors": completion_errors(j)})
    if to == "en_route":
        cust = await get("customers", c.org_id, j["customer_id"])
        await log_message(c.org, cust.get("phone"), f"{c.org['name']}: {c.user['name'].split()[0]} is on the way.", {"type": "job", "id": jid})
    await push("jobs", c.org_id, jid, "timeline", {"at": now(), "text": f"Status: {to.replace('_', ' ')}" + (f" ({body['reason']})" if body.get("reason") else "")})
    j = await update("jobs", c.org_id, jid, {"status": to, f"{to}_at": now(), **({"non_complete_reason": body.get("reason")} if to == "non_complete" else {})})
    if to == "completed":
        await make_invoice(c.org, j)
        j = await get("jobs", c.org_id, jid)
    return job_view(c, j)


@app.post("/api/jobs/{jid}/checklist/{item_id}")
async def check(jid: str, item_id: str, body: dict, c: Ctx = Depends(ctx)):
    j = await my_job(c, jid)
    items = [{**i, "done": bool(body.get("done", True))} if i["id"] == item_id else i for i in j["checklist"]]
    return (await update("jobs", c.org_id, jid, {"checklist": items}))["checklist"]


@app.post("/api/jobs/{jid}/photos")
async def photo(jid: str, body: dict, c: Ctx = Depends(ctx)):
    await my_job(c, jid)
    p = {"id": new_id()[:10], "stage": body.get("stage", "after"), "caption": body.get("caption", ""), "url": body.get("url", ""), "at": now()}
    await push("jobs", c.org_id, jid, "photos", p)
    return p


@app.post("/api/jobs/{jid}/parts")
async def part(jid: str, body: dict, c: Ctx = Depends(ctx)):
    await my_job(c, jid)
    ln = line(await get("pricebook", c.org_id, body["item_id"]), body.get("qty", 1))
    await push("jobs", c.org_id, jid, "lines", ln)
    return for_tech({"lines": [ln]})["lines"][0] if c.is_tech else ln


@app.post("/api/jobs/{jid}/signature")
async def sign(jid: str, body: dict, c: Ctx = Depends(ctx)):
    await my_job(c, jid)
    sig = {"name": body.get("name", ""), "image": body.get("image", ""), "at": now()}
    await update("jobs", c.org_id, jid, {"signature": sig})
    return sig


@app.post("/api/jobs/{jid}/notes")
async def note(jid: str, body: dict, c: Ctx = Depends(ctx)):
    j = await my_job(c, jid)
    field = "notes_customer" if body.get("customer") else "notes_internal"
    text = (j.get(field, "") + "\n" + body.get("text", "")).strip()
    await update("jobs", c.org_id, jid, {field: text})
    return {field: text}


@app.post("/api/jobs/{jid}/invoice")
async def invoice_job(jid: str, c: Ctx = Depends(ctx)):
    return await make_invoice(c.org, await my_job(c, jid))


@app.get("/api/schedule")
async def board(date: str = "", c: Ctx = Depends(office)):
    date = date or datetime.now().date().isoformat()
    techs = [{k: v for k, v in u.items() if k != "password_hash"} for u in await find("users", c.org_id, {"role": "tech"}, sort=[("name", 1)])]
    return {"date": date, "techs": techs, "jobs": [j for j in await jobs(date=date, c=c) if j["status"] != "cancelled"],
            "unscheduled": await jobs(unscheduled=True, c=c), "hours": [8, 17]}


# invoices and payments
@app.get("/api/invoices")
async def invoices(status: str = "", c: Ctx = Depends(office)):
    names = {x["id"]: x["name"] for x in await find("customers", c.org_id)}
    rows = await find("invoices", c.org_id, {"status": {"$in": status.split(",")}} if status else {}, sort=[("created_at", -1)])
    today = date.today()
    return [{**i, "customer_name": names.get(i["customer_id"], ""),
             "days_overdue": max(0, (today - date.fromisoformat(i["due_on"])).days) if i["status"] in ("open", "partially_paid") else 0} for i in rows]


@app.get("/api/invoices/{iid}")
async def invoice(iid: str, c: Ctx = Depends(office)):
    i = await get("invoices", c.org_id, iid)
    return {**i, "customer": await get("customers", c.org_id, i["customer_id"]), "payments": await find("payments", c.org_id, {"invoice_id": iid}),
            "messages": await find("messages", c.org_id, {"related.id": iid})}


@app.post("/api/invoices/{iid}/send")
async def send_invoice(iid: str, request: Request, c: Ctx = Depends(office)):
    i = await get("invoices", c.org_id, iid)
    cust = await get("customers", c.org_id, i["customer_id"])
    await log_message(c.org, cust.get("phone"), f"{c.org['name']}: invoice {i['number']}. Pay here: {request.headers.get('origin', '')}/pay/{i['public_token']}", {"type": "invoice", "id": iid})
    return await update("invoices", c.org_id, iid, {"sent_at": now()})


@app.post("/api/invoices/{iid}/remind")
async def remind(iid: str, c: Ctx = Depends(office)):
    i = await get("invoices", c.org_id, iid)
    cust = await get("customers", c.org_id, i["customer_id"])
    await log_message(c.org, cust.get("phone"), f"{c.org['name']}: a friendly reminder about invoice {i['number']}.", {"type": "invoice", "id": iid})
    return {"ok": True}


@app.post("/api/invoices/{iid}/payments")
async def record_payment(iid: str, body: dict, c: Ctx = Depends(ctx)):
    i = await get("invoices", c.org_id, iid)
    inv = await pay(c.org, i, int(body.get("amount_cents") or i["balance_cents"]), body.get("method", "card"))
    return {"invoice": inv}


# plans and memberships
@app.get("/api/plans")
async def plans(c: Ctx = Depends(ctx)):
    ms = await find("memberships", c.org_id)
    return [{**p, "members": sum(m["plan_id"] == p["id"] for m in ms)} for p in await find("plans", c.org_id, sort=[("price_cents", 1)])]


@app.post("/api/plans")
async def create_plan(body: dict, c: Ctx = Depends(office)):
    return await insert("plans", c.org_id, {"interval": "month", "visits_per_year": 2, "perks": [], "active": True, **{k: v for k, v in body.items() if k not in ("id", "org_id")}})


@app.patch("/api/plans/{pid}")
async def update_plan(pid: str, body: dict, c: Ctx = Depends(office)):
    return await update("plans", c.org_id, pid, {k: v for k, v in body.items() if k not in ("id", "org_id")})


@app.get("/api/memberships")
async def memberships(c: Ctx = Depends(office)):
    names = {x["id"]: x["name"] for x in await find("customers", c.org_id)}
    pl = {x["id"]: x["name"] for x in await find("plans", c.org_id)}
    return [{**m, "customer_name": names.get(m["customer_id"], ""), "plan_name": pl.get(m["plan_id"], "")} for m in await find("memberships", c.org_id)]


@app.post("/api/memberships")
async def add_membership(body: dict, c: Ctx = Depends(ctx)):
    """Selling a plan books its first visit as an unscheduled job (owners can extend this to a full schedule)."""
    plan = await get("plans", c.org_id, body["plan_id"])
    m = await insert("memberships", c.org_id, {"plan_id": plan["id"], "customer_id": body["customer_id"], "site_id": body.get("site_id"),
                                               "status": "active", "started_on": date.today().isoformat()})
    await new_job(c.org, {"customer_id": body["customer_id"], "site_id": body.get("site_id"), "title": f"{plan['name']} visit", "job_type": "maintenance",
                          "source": "plan", "membership_id": m["id"], "due_date": (date.today() + timedelta(days=14)).isoformat(),
                          "lines": [line(None, 1, name=f"{plan['name']} visit (included)", tax_code="exempt", category="maintenance")]})
    return {**m, "visits_created": 1}


# customer-facing links (no login)
def public_quote(q, org, cust):
    strip = lambda o: {**o, "totals": {k: v for k, v in o["totals"].items() if k != "cost_cents"},
                       "lines": [{k: l[k] for k in ("name", "description", "qty", "unit_price_cents", "total_cents", "optional")} for l in o["lines"]]}
    return {"number": q["number"], "title": q["title"], "status": q["status"], "expires_on": q["expires_on"], "options": [strip(o) for o in q["options"]],
            "chosen_option_id": q["chosen_option_id"], "deposit_due_cents": q.get("deposit_due_cents", 0), "deposit_paid_cents": q.get("deposit_paid_cents", 0),
            "customer": {"name": cust["name"]}, "notes": q.get("notes", ""),
            "org": {"name": org["name"], "phone": org.get("phone"), "brand": org.get("brand", {}), "currency": org.get("currency", "USD")}}


@app.get("/api/public/quotes/{token}")
async def view_quote(token: str):
    q = await by_token("quotes", token)
    org = await col("orgs").find_one({"id": q["org_id"]}, {"_id": 0})
    if q["status"] == "sent":
        q = await update("quotes", org["id"], q["id"], {"status": "viewed"})
    return public_quote(q, org, await get("customers", org["id"], q["customer_id"]))


@app.post("/api/public/quotes/{token}/approve")
async def approve(token: str, body: dict):
    q = await by_token("quotes", token)
    org = await col("orgs").find_one({"id": q["org_id"]}, {"_id": 0})
    q, job = await approve_quote(org, q, body.get("option_id"), body.get("signature_name"))
    dep = q.get("deposit_due_cents", 0)
    return {"quote": public_quote(q, org, await get("customers", org["id"], q["customer_id"])), "job_number": job["number"],
            "deposit_link": {"amount_cents": dep, "provider": "demo"} if dep else None}


@app.post("/api/public/quotes/{token}/decline")
async def decline(token: str, body: dict):
    q = await by_token("quotes", token)
    await update("quotes", q["org_id"], q["id"], {"status": "declined", "decline_reason": body.get("reason", "")})
    return {"ok": True}


@app.get("/api/public/invoices/{token}")
async def view_invoice(token: str):
    i = await by_token("invoices", token)
    org = await col("orgs").find_one({"id": i["org_id"]}, {"_id": 0})
    cust = await get("customers", org["id"], i["customer_id"])
    return {**{k: i[k] for k in ("number", "status", "issued_on", "due_on", "subtotal_cents", "tax_lines", "tax_cents", "tax_label", "total_cents",
                                 "deposits_applied_cents", "amount_paid_cents", "balance_cents", "currency", "custom_fields")},
            "lines": [{k: l[k] for k in ("name", "qty", "unit_price_cents", "total_cents")} for l in i["lines"]],
            "customer": {"name": cust["name"]}, "org": {"name": org["name"], "phone": org.get("phone"), "brand": org.get("brand", {})}}


@app.post("/api/public/pay")
async def demo_pay(body: dict):
    """Demo checkout standing in for a payment provider (connect Stripe or similar to go live)."""
    if body.get("for") == "deposit":
        q = await by_token("quotes", body["token"])
        await insert("payments", q["org_id"], {"kind": "deposit", "amount_cents": int(body["amount_cents"]), "method": "card", "quote_id": q["id"],
                                               "job_id": q.get("job_id"), "customer_id": q["customer_id"], "received_at": now()})
        await update("quotes", q["org_id"], q["id"], {"deposit_paid_cents": q.get("deposit_paid_cents", 0) + int(body["amount_cents"])})
        return {"ok": True}
    i = await by_token("invoices", body["token"])
    org = await col("orgs").find_one({"id": i["org_id"]}, {"_id": 0})
    await pay(org, i, int(body.get("amount_cents") or i["balance_cents"]))
    return {"ok": True}


@app.get("/api/public/portal/{token}")
async def portal(token: str):
    cust = await by_token("customers", token)
    o = cust["org_id"]
    org = await col("orgs").find_one({"id": o}, {"_id": 0})
    pl = {p["id"]: p["name"] for p in await find("plans", o)}
    return {"customer": {"name": cust["name"]}, "org": {"name": org["name"], "phone": org.get("phone"), "brand": org.get("brand", {}), "currency": org.get("currency")},
            "invoices": [{"number": i["number"], "status": i["status"], "total_cents": i["total_cents"], "balance_cents": i["balance_cents"], "due_on": i["due_on"],
                          "token": i["public_token"]} for i in await find("invoices", o, {"customer_id": cust["id"]})],
            "quotes": [{"number": q["number"], "title": q["title"], "status": q["status"], "token": q["public_token"]}
                       for q in await find("quotes", o, {"customer_id": cust["id"], "status": {"$in": ["sent", "viewed", "approved"]}})],
            "visits": [{"title": j["title"], "status": j["status"], "date": (j.get("scheduled_start") or j.get("due_date") or "")[:10]}
                       for j in await find("jobs", o, {"customer_id": cust["id"]}, limit=20)],
            "equipment": [{"type": e["type"], "make": e.get("make"), "model": e.get("model"), "installed_on": e.get("installed_on")}
                          for e in await find("equipment", o, {"customer_id": cust["id"]})],
            "memberships": [{"status": m["status"], "plan": pl.get(m["plan_id"], "")} for m in await find("memberships", o, {"customer_id": cust["id"]})]}


@app.get("/api/public/track/{token}")
async def track(token: str):
    cust = await by_token("customers", token)
    org = await col("orgs").find_one({"id": cust["org_id"]}, {"_id": 0})
    js = await find("jobs", cust["org_id"], {"customer_id": cust["id"], "status": {"$in": ["scheduled", "en_route", "on_site", "in_progress"]}}, sort=[("scheduled_start", 1)])
    info = {"org": {"name": org["name"], "phone": org.get("phone"), "brand": org.get("brand", {})}}
    if not js:
        return {"job": None, **info}
    j = js[0]
    tech = await col("users").find_one({"id": (j["assigned_tech_ids"] or [""])[0]}, {"_id": 0}) or {}
    return {"job": {"title": j["title"], "status": j["status"], "window": [j["scheduled_start"], j["scheduled_end"]],
                    "tech": {"first_name": (tech.get("name") or "Technician").split()[0], "trade": ", ".join(tech.get("skills", []))}}, **info}


@app.get("/api/public/booking/{slug}")
async def booking_info(slug: str):
    org = await col("orgs").find_one({"slug": slug}, {"_id": 0})
    if not org:
        raise HTTPException(404, "Business not found")
    items = await find("pricebook", org["id"], {"active": True, "bookable": True})
    return {"org": {"name": org["name"], "phone": org.get("phone"), "brand": org.get("brand", {}), "currency": org.get("currency")},
            "services": [{"id": i["id"], "name": i["name"], "description": i.get("description", ""), "from_cents": i["unit_price_cents"]} for i in items]}


@app.post("/api/public/booking/{slug}")
async def book(slug: str, body: dict):
    org = await col("orgs").find_one({"slug": slug}, {"_id": 0})
    if not org or not body.get("name"):
        raise HTTPException(400, "Name required")
    lead = await insert("leads", org["id"], {"name": body["name"], "phone": body.get("phone"), "email": body.get("email"), "address": body.get("address"),
                                             "service": body.get("service"), "message": body.get("message", ""), "preferred_window": body.get("window"),
                                             "channel": "web_booking", "source": "website", "status": "new"})
    return {"ok": True, "reference": lead["id"][:8].upper()}

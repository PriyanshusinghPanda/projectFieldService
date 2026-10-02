"""The one journey the template promises: quote -> approve by link -> schedule -> tech finishes -> invoice -> paid."""
from datetime import date, timedelta

from conftest import auth


def test_full_journey(client):
    h = auth(client)
    q = next(x for x in client.get("/api/quotes", headers=h).json() if x["status"] == "viewed")
    opt = q["options"][0]
    r = client.post(f"/api/public/quotes/{q['public_token']}/approve", json={"option_id": opt["id"], "signature_name": "Chloe"})
    assert r.status_code == 200
    job_id = client.get(f"/api/quotes/{q['id']}", headers=h).json()["job_id"]
    marco = next(u for u in client.get("/api/team", headers=h).json() if u["name"] == "Marco Diaz")
    day = (date.today() + timedelta(days=5)).isoformat()
    assert client.post(f"/api/jobs/{job_id}/schedule", headers=h, json={"tech_ids": [marco["id"]], "start": f"{day}T09:00:00", "end": f"{day}T11:00:00"}).status_code == 200
    t = auth(client, "tech")
    for st in ("en_route", "on_site", "in_progress"):
        assert client.post(f"/api/jobs/{job_id}/status", headers=t, json={"to": st}).status_code == 200
    blocked = client.post(f"/api/jobs/{job_id}/status", headers=t, json={"to": "completed"})
    assert blocked.status_code == 422
    job = client.get(f"/api/jobs/{job_id}", headers=t).json()
    assert all("cost_cents" not in l for l in job["lines"])
    for i in job["checklist"]:
        client.post(f"/api/jobs/{job_id}/checklist/{i['id']}", headers=t, json={"done": True})
    client.post(f"/api/jobs/{job_id}/signature", headers=t, json={"name": "Chloe"})
    assert client.post(f"/api/jobs/{job_id}/status", headers=t, json={"to": "completed"}).status_code == 200
    inv = client.get(f"/api/jobs/{job_id}", headers=h).json()["invoice"]
    assert [l["name"] for l in inv["lines"]] == [l["name"] for l in opt["lines"]]
    client.post(f"/api/invoices/{inv['id']}/payments", headers=h, json={"method": "card"})
    assert client.get(f"/api/invoices/{inv['id']}", headers=h).json()["status"] == "paid"


def test_no_double_booking_and_locked_quote(client):
    h = auth(client)
    jobs = [j for j in client.get("/api/jobs", headers=h).json() if j["status"] == "scheduled"]
    j = jobs[0]
    new = client.post("/api/jobs", headers=h, json={"customer_id": j["customer_id"], "title": "Test"}).json()
    r = client.post(f"/api/jobs/{new['id']}/schedule", headers=h, json={"tech_ids": j["assigned_tech_ids"], "start": j["scheduled_start"], "end": j["scheduled_end"]})
    assert r.status_code == 409


def test_screens_load(client):
    h = auth(client)
    for p in ("/api/home", "/api/schedule", "/api/reports", "/api/customers", "/api/invoices", "/api/plans", "/api/leads", "/api/settings"):
        assert client.get(p, headers=h).status_code == 200, p
    assert client.get("/api/invoices", headers=auth(client, "tech")).status_code == 403


def test_two_way_texting(client):
    h = auth(client)
    threads = client.get("/api/inbox/threads", headers=h).json()
    assert threads and any(t["unread"] for t in threads)
    phone = threads[0]["phone"]
    sent = client.post("/api/inbox/send", headers=h, json={"to": phone, "body": "Hi from the office"}).json()
    assert sent["status"] == "not_sent"  # no SMS provider in tests: stored and marked, never silently "sent"
    # Twilio posts a form with an E.164 number; it must land in the same conversation as "(555) ..."
    digits = "".join(ch for ch in phone if ch.isdigit())[-10:]
    r = client.post("/api/public/sms/inbound/summit", data={"From": "+1" + digits, "Body": "Got it, thanks"})
    assert r.status_code == 200 and "<Response>" in r.text
    t = client.get(f"/api/inbox/threads/{digits}", headers=h).json()
    assert [m["direction"] for m in t["messages"][-2:]] == ["out", "in"] and t["name"] != digits
    assert client.post("/api/inbox/send", headers=h, json={"to": "", "body": "x"}).status_code == 400


def test_ask_and_visibility_without_ai_provider(client):
    h = auth(client)
    a = client.post("/api/ai/ask", headers=h, json={"question": "who owes me money?", "page": "/"}).json()
    assert a["engine"] is None and ("overdue" in a["answer"] or "Nothing" in a["answer"])
    job = client.get("/api/jobs", headers=h).json()[0]
    a = client.post("/api/ai/ask", headers=h, json={"question": "summarise this", "page": f"/jobs/{job['id']}", "record_id": job["id"]}).json()
    assert job["number"] in a["answer"]
    assert client.get("/api/integrations", headers=h).json()["ai"] is False
    assert client.post("/api/ai/visibility", headers=h, json={"trade": "HVAC", "town": "Denver"}).status_code == 409

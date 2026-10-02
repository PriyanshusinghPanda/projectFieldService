import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Empty, ErrorBox, Field, Loading, Modal, Money, PageHead, Pill, Status, Tile, useToast } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { time } from "../lib/format";
import { useApi } from "../lib/useApi";

const KIND = {
  overdue: ["Overdue", "red"],
  quote: ["Quote", "amber"],
  lead: ["New lead", "blue"],
  unscheduled: ["To schedule", "grey"],
};

const JOB_TYPES = [["repair", "Repair"], ["maintenance", "Maintenance"], ["install", "Install"], ["estimate", "Estimate"]];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Home() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, org } = useAuth();
  const { data, loading, error, reload } = useApi("/api/home");
  const [newJob, setNewJob] = useState(false);
  const [busy, setBusy] = useState(null);
  const [reminded, setReminded] = useState({});

  const today = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const first = (user?.name || "").split(" ")[0];

  const act = async (a) => {
    if (a.kind === "overdue") {
      setBusy(a.id);
      try {
        await api.post(`/api/invoices/${a.id}/remind`);
        setReminded((r) => ({ ...r, [a.id]: true }));
        toast(`Payment reminder texted to ${a.text.split(" · ")[0]}`);
      } catch (e) {
        toast(e, true);
      } finally {
        setBusy(null);
      }
    } else if (a.kind === "quote") nav(`/quotes/${a.id}`);
    else if (a.kind === "lead") nav(`/inbox?lead=${a.id}`);
    else if (a.kind === "unscheduled") nav("/schedule");
  };

  const t = data?.tiles;

  return (
    <div className="page">
      <style>{`
        .home-tiles { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); margin-bottom: 18px; }
        .home-tiles .tile { transition: border-color .15s, box-shadow .15s; }
        .home-tiles .tile:hover { border-color: var(--line-2); box-shadow: var(--shadow); }
        .home-main { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); align-items: start; }
        .home-item { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-bottom: 1px solid var(--line); }
        .home-item:last-child { border-bottom: 0; }
        .home-visit { cursor: pointer; }
        .home-visit:hover { background: var(--surface-2); }
        .home-when { width: 92px; flex: none; font-variant-numeric: tabular-nums; }
        .home-brief { margin: 6px 0 0; padding-left: 18px; }
        .home-brief li { margin: 2px 0; }
        @media (max-width: 1000px) { .home-main { grid-template-columns: 1fr; } }
      `}</style>

      <PageHead title={`${greeting()}${first ? `, ${first}` : ""}`} sub={`${org?.name || ""} · ${today}`}>
        <Button onClick={() => setNewJob(true)}>+ New job</Button>
        <Button variant="primary" onClick={() => nav("/quotes/new")}>+ New quote</Button>
      </PageHead>

      <ErrorBox error={error} />
      {loading && !data && <Card><Loading /></Card>}

      {data && (
        <>
          {data.brief?.length > 0 && (
            <div className="callout" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 650 }}>Morning brief</div>
              <ul className="home-brief">{data.brief.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}

          <div className="home-tiles">
            <Tile k="New leads" v={t.new_leads} s={t.new_leads ? "Waiting for a reply" : "Inbox is clear"} onClick={() => nav("/inbox")} />
            <Tile k="Quotes waiting" v={t.quotes_waiting.count} s={<><Money cents={t.quotes_waiting.cents} /> out with customers</>} onClick={() => nav("/quotes")} />
            <Tile k="To invoice" v={t.to_invoice.count} s={t.to_invoice.count ? <><Money cents={t.to_invoice.cents} /> of finished work</> : "All finished work billed"} onClick={() => nav("/jobs")} />
            <Tile k="Unpaid" v={<Money cents={t.unpaid.cents} />}
              s={<>{plural(t.unpaid.count, "invoice")}{t.unpaid.overdue_cents ? <> · <span style={{ color: "var(--red)" }}><Money cents={t.unpaid.overdue_cents} /> overdue</span></> : null}</>}
              onClick={() => nav("/invoices")} />
            <Tile k="Collected this week" v={<span style={{ color: "var(--green)" }}><Money cents={t.collected_this_week_cents} /></span>} s="Payments received" onClick={() => nav("/reports")} />
          </div>

          <div className="home-main">
            <Card title="Needs you" actions={data.attention.length ? <Pill tone="grey">{data.attention.length}</Pill> : null} pad={false}>
              {data.attention.length === 0 ? <Empty>Nothing needs you right now. Nice.</Empty> : data.attention.map((a) => {
                const [label, tone] = KIND[a.kind] || [a.kind, "grey"];
                const done = reminded[a.id];
                return (
                  <div className="home-item" key={a.kind + a.id}>
                    <div style={{ width: 96, flex: "none" }}><Pill tone={tone}>{label}</Pill></div>
                    <div style={{ minWidth: 0, flex: 1 }}>{a.text}</div>
                    <Button size="sm" variant={a.kind === "overdue" && !done ? "primary" : undefined} disabled={busy === a.id || done} onClick={() => act(a)}>
                      {done ? "Reminded ✓" : busy === a.id ? "Sending…" : a.action}
                    </Button>
                  </div>
                );
              })}
            </Card>

            <Card title="Today's visits" actions={<Button size="sm" variant="ghost" onClick={() => nav("/schedule")}>Open schedule →</Button>} pad={false}>
              {data.today.length === 0 ? (
                <Empty>No visits booked for today.<div style={{ marginTop: 10 }}><Button size="sm" onClick={() => nav("/schedule")}>Go to schedule</Button></div></Empty>
              ) : data.today.map((j) => (
                <div className="home-item home-visit" key={j.id} onClick={() => nav(`/jobs/${j.id}`)}>
                  <div className="home-when">
                    <div style={{ fontWeight: 600 }}>{time(j.start)}</div>
                    <div className="muted small">to {time(j.end)}</div>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{j.customer}</div>
                    <div className="muted small">{j.number} · {j.title}</div>
                  </div>
                  <div className="small muted" style={{ textAlign: "right", flex: "none" }}>{j.techs?.length ? j.techs.join(", ") : "Unassigned"}</div>
                  <div style={{ width: 104, flex: "none", textAlign: "right" }}><Status s={j.status} /></div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      {newJob && <NewJobModal onClose={() => setNewJob(false)} onCreated={(j) => { reload(); nav(`/jobs/${j.id}`); }} />}
    </div>
  );
}

function NewJobModal({ onClose, onCreated }) {
  const toast = useToast();
  const customers = useApi("/api/customers");
  const [form, setForm] = useState({ customer_id: "", site_id: "", title: "", job_type: "repair" });
  const [sites, setSites] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!form.customer_id) { setSites([]); return; }
    let live = true;
    api.get(`/api/customers/${form.customer_id}`).then((c) => {
      if (!live) return;
      setSites(c.sites || []);
      setForm((f) => ({ ...f, site_id: c.sites?.[0]?.id || "" }));
    }).catch(() => live && setSites([]));
    return () => { live = false; };
  }, [form.customer_id]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.customer_id) return setErr(new Error("Pick a customer"));
    setSaving(true); setErr(null);
    try {
      const body = { customer_id: form.customer_id, job_type: form.job_type, title: form.title.trim() || undefined };
      if (form.site_id) body.site_id = form.site_id;
      const job = await api.post("/api/jobs", body);
      toast(`Job ${job.number} created`);
      onCreated(job);
    } catch (e2) {
      setErr(e2);
      setSaving(false);
    }
  };

  return (
    <Modal title="New job" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving} onClick={submit}>{saving ? "Creating…" : "Create job"}</Button></>}>
      <form className="col" onSubmit={submit}>
        <Field label="Customer">
          <select value={form.customer_id} onChange={set("customer_id")} autoFocus>
            <option value="">{customers.loading ? "Loading customers…" : "Choose a customer…"}</option>
            {(customers.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {sites.length > 1 && (
          <Field label="Site">
            <select value={form.site_id} onChange={set("site_id")}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.label ? `${s.label} · ` : ""}{s.address}</option>)}
            </select>
          </Field>
        )}
        {sites.length === 1 && <div className="muted small">Site: {sites[0].address}{sites[0].city ? `, ${sites[0].city}` : ""}</div>}
        <Field label="What's the job?"><input value={form.title} onChange={set("title")} placeholder="e.g. Furnace not heating" /></Field>
        <Field label="Job type">
          <select value={form.job_type} onChange={set("job_type")}>
            {JOB_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <ErrorBox error={err || customers.error} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar, Button, Card, Empty, ErrorBox, Field, Loading, Modal, Money, PageHead, Pill, Status, Tabs, Tile, useToast } from "../components/ui";
import { api } from "../lib/api";
import { ago } from "../lib/format";
import { useApi } from "../lib/useApi";

const JOB_TYPES = [["repair", "Repair"], ["maintenance", "Maintenance"], ["install", "Install"], ["estimate", "Estimate"]];
const PREFERS = { sms: "Text message", email: "Email", phone: "Phone call", whatsapp: "WhatsApp" };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

function quoteTotal(q) {
  const opts = q.options || [];
  const pick = opts.find((o) => o.id === q.chosen_option_id) || opts.find((o) => o.recommended) || opts[opts.length - 1];
  return pick?.totals?.total_cents ?? null;
}

// Full date with year: history on this page spans years (equipment installs, old invoices).
function dateY(iso, monthOnly = false) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString([], monthOnly ? { month: "short", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
}

const jobDate = (j) => j.scheduled_start || j.completed_at || j.due_date || j.created_at;

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data: c, loading, error, reload } = useApi(`/api/customers/${id}`);
  const plans = useApi("/api/plans");
  const [tab, setTab] = useState("overview");
  const [newJob, setNewJob] = useState(false);

  if (loading && !c) return <div className="page"><Card><Loading /></Card></div>;
  if (error && !c) return <div className="page"><PageHead title="Customer" /><ErrorBox error={error} /><div style={{ marginTop: 12 }}><Link to="/customers">← Back to customers</Link></div></div>;
  if (!c) return null;

  const planName = Object.fromEntries((plans.data || []).map((p) => [p.id, p.name]));
  const active = (c.memberships || []).filter((m) => m.status === "active");
  const byDesc = (f) => (a, b) => String(f(b) || "").localeCompare(String(f(a) || ""));
  const jobs = [...(c.jobs || [])].sort(byDesc(jobDate));
  const quotes = c.quotes || [];
  const invoices = [...(c.invoices || [])].sort(byDesc((i) => i.issued_on || i.created_at));
  const messages = c.messages || [];
  const openJobs = jobs.filter((j) => !["paid", "invoiced", "cancelled", "completed"].includes(j.status)).length;

  const copyLink = async (path, label) => {
    const url = `${window.location.origin}${path}`;
    toast((await copy(url)) ? `${label} copied: ${url}` : url, false);
  };

  return (
    <div className="page cd-page">
      <style>{`
        .cd-page .page-head { flex-wrap: wrap; }
        .cd-tiles { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); margin-bottom: 18px; }
        .cd-main { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr) 320px; align-items: start; }
        .cd-scroll { overflow-x: auto; }
        .cd-scroll table td, .cd-scroll table th { white-space: nowrap; }
        .cd-kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px 18px; }
        .cd-kv .k { font-size: 12px; color: var(--ink-3); margin-bottom: 1px; }
        .cd-eqform { display: grid; gap: 10px; grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 14px 16px; background: var(--surface-2); border-top: 1px solid var(--line); }
        .cd-msg { padding: 11px 16px; border-bottom: 1px solid var(--line); }
        .cd-msg:last-child { border-bottom: 0; }
        @media (max-width: 1050px) { .cd-main { grid-template-columns: 1fr; } .cd-eqform { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>

      <div className="small" style={{ marginBottom: 10 }}><Link to="/customers">← Customers</Link></div>

      <PageHead
        title={
          <span className="row wrap" style={{ gap: 10 }}>
            <Avatar name={c.name} size={36} color={c.type === "business" ? "#475569" : "var(--brand)"} />
            {c.name}
            {active.length > 0 && <Pill tone="green">★ Member</Pill>}
            <Pill tone={c.type === "business" ? "blue" : "grey"}>{c.type === "business" ? "Business" : "Residential"}</Pill>
            {c.tax_exempt && <Pill tone="amber">Tax exempt</Pill>}
          </span>
        }
        sub={[c.phone && <a key="p" href={`tel:${c.phone}`}>{c.phone}</a>, c.email && <a key="e" href={`mailto:${c.email}`}>{c.email}</a>,
          <span key="pr">Prefers {PREFERS[c.prefers] || c.prefers || "text message"}</span>]
          .filter(Boolean).reduce((acc, el, i) => (i ? [...acc, <span key={`s${i}`}> · </span>, el] : [el]), [])}
      >
        <div className="row wrap" style={{ justifyContent: "flex-end" }}>
          <Button onClick={() => copyLink(`/portal/${c.public_token}`, "Portal link")} disabled={!c.public_token}>Copy portal link</Button>
          <Button onClick={() => copyLink(`/track/${c.public_token}`, "Tracking link")} disabled={!c.public_token}>Tracking link</Button>
          <Button onClick={() => setNewJob(true)}>+ New job</Button>
          <Button variant="primary" onClick={() => nav(`/quotes/new?customer=${c.id}`)}>+ New quote</Button>
        </div>
      </PageHead>

      <div className="cd-tiles">
        <Tile k="Lifetime paid" v={<Money cents={c.lifetime_cents ?? 0} />} s={plural(invoices.length, "invoice")} />
        <Tile k="Balance owed" v={<span style={{ color: c.balance_cents ? "var(--red)" : undefined }}><Money cents={c.balance_cents ?? 0} /></span>}
          s={c.balance_cents ? "Open invoices" : "All paid up"} onClick={c.balance_cents ? () => setTab("invoices") : undefined} />
        <Tile k="Jobs" v={jobs.length} s={openJobs ? `${openJobs} open` : "None open"} onClick={() => setTab("jobs")} />
        <Tile k="Plan" v={active.length ? planName[active[0].plan_id] || "Member" : "None"} s={active.length ? `Since ${dateY(active[0].started_on)}` : "Not a member yet"} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        ["overview", "Sites & equipment"], ["jobs", `Jobs · ${jobs.length}`], ["quotes", `Quotes · ${quotes.length}`],
        ["invoices", `Invoices · ${invoices.length}`], ["messages", `Messages · ${messages.length}`],
      ]} />

      {tab === "overview" && (
        <div className="cd-main">
          <div className="col" style={{ gap: 16 }}>
            {(c.sites || []).length === 0 ? <Card><Empty>No service address on file yet.</Empty></Card> : c.sites.map((s) => (
              <SiteCard key={s.id} site={s} equipment={(c.equipment || []).filter((e) => e.site_id === s.id)} onAdded={reload} />
            ))}
          </div>
          <div className="col" style={{ gap: 16 }}>
            <Card title="Memberships" pad={false}>
              {(c.memberships || []).length === 0 ? (
                <Empty>Not on a maintenance plan.<div style={{ marginTop: 10 }}><Button size="sm" onClick={() => nav("/plans")}>See plans</Button></div></Empty>
              ) : c.memberships.map((m) => (
                <div key={m.id} className="cd-msg">
                  <div className="row">
                    <div style={{ fontWeight: 600 }}>{planName[m.plan_id] || "Plan"}</div>
                    <div className="spacer" />
                    <Status s={m.status} />
                  </div>
                  <div className="muted small" style={{ marginTop: 2 }}>
                    Since {dateY(m.started_on)}{m.autopay ? " · Autopay on" : ""}{m.paused_until ? ` · Paused until ${dateY(m.paused_until)}` : ""}
                  </div>
                </div>
              ))}
            </Card>
            <Card title="Recent messages" pad={false} actions={messages.length > 3 ? <Button size="sm" variant="ghost" onClick={() => setTab("messages")}>All →</Button> : null}>
              {messages.length === 0 ? <Empty>No messages yet.</Empty> : messages.slice(0, 3).map((m) => <MessageRow key={m.id} m={m} />)}
            </Card>
          </div>
        </div>
      )}

      {tab === "jobs" && (
        <Card pad={false}>
          {jobs.length === 0 ? <Empty>No jobs yet.<div style={{ marginTop: 10 }}><Button size="sm" variant="primary" onClick={() => setNewJob(true)}>+ New job</Button></div></Empty> : (
            <div className="cd-scroll">
              <table className="t">
                <thead><tr><th>Job</th><th>Title</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className="click" onClick={() => nav(`/jobs/${j.id}`)}>
                      <td style={{ fontWeight: 600 }}>{j.number}</td>
                      <td>{j.title}</td>
                      <td className="muted" style={{ textTransform: "capitalize" }}>{j.job_type}</td>
                      <td><Status s={j.status} /></td>
                      <td className="muted">{dateY(jobDate(j))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "quotes" && (
        <Card pad={false}>
          {quotes.length === 0 ? (
            <Empty>No quotes for this customer.<div style={{ marginTop: 10 }}><Button size="sm" variant="primary" onClick={() => nav(`/quotes/new?customer=${c.id}`)}>+ New quote</Button></div></Empty>
          ) : (
            <div className="cd-scroll">
              <table className="t">
                <thead><tr><th>Quote</th><th>Title</th><th>Status</th><th>Sent</th><th>Expires</th><th className="r">Total</th></tr></thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="click" onClick={() => nav(`/quotes/${q.id}`)}>
                      <td style={{ fontWeight: 600 }}>{q.number}</td>
                      <td>{q.title}</td>
                      <td><Status s={q.status} /></td>
                      <td className="muted">{q.sent_at ? dateY(q.sent_at) : "–"}</td>
                      <td className="muted">{q.expires_on ? dateY(q.expires_on) : "–"}</td>
                      <td className="r"><Money cents={quoteTotal(q)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "invoices" && (
        <Card pad={false}>
          {invoices.length === 0 ? <Empty>No invoices yet.</Empty> : (
            <div className="cd-scroll">
              <table className="t">
                <thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th>Status</th><th className="r">Total</th><th className="r">Balance</th></tr></thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id} className="click" onClick={() => nav(`/invoices/${i.id}`)}>
                      <td style={{ fontWeight: 600 }}>{i.number}</td>
                      <td className="muted">{dateY(i.issued_on)}</td>
                      <td className="muted">{dateY(i.due_on)}</td>
                      <td><Status s={i.status} /></td>
                      <td className="r"><Money cents={i.total_cents} /></td>
                      <td className="r" style={{ fontWeight: i.balance_cents ? 600 : 400, color: i.balance_cents ? "var(--ink)" : "var(--ink-3)" }}><Money cents={i.balance_cents} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "messages" && (
        <Card pad={false}>
          {messages.length === 0 ? <Empty>No texts or emails sent to this customer yet.</Empty> : messages.map((m) => <MessageRow key={m.id} m={m} />)}
        </Card>
      )}

      {newJob && <NewJobModal customer={c} onClose={() => setNewJob(false)} onCreated={(j) => nav(`/jobs/${j.id}`)} />}
    </div>
  );
}

function MessageRow({ m }) {
  return (
    <div className="cd-msg">
      <div className="row" style={{ gap: 8, marginBottom: 3 }}>
        <Pill tone={m.channel === "email" ? "blue" : "grey"}>{m.channel === "sms" ? "SMS" : m.channel === "email" ? "Email" : m.channel}</Pill>
        <span className="muted small">{m.direction === "in" ? "From customer" : m.status === "sent" ? "Sent" : "Not delivered"}</span>
        {m.template && <span className="muted small" style={{ textTransform: "capitalize" }}>{m.template.replace(/_/g, " ")}</span>}
        <div className="spacer" />
        <span className="muted small">{ago(m.created_at)}</span>
      </div>
      <div style={{ color: "var(--ink-2)" }}>{m.body}</div>
    </div>
  );
}

const EMPTY_EQ = { type: "", make: "", model: "", serial: "", installed_on: "", warranty_until: "", filter_size: "" };

function SiteCard({ site, equipment, onAdded }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_EQ);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const today = new Date().toISOString().slice(0, 10);

  const save = async (e) => {
    e.preventDefault();
    if (!form.type.trim()) return toast("Equipment type is required", true);
    setSaving(true);
    try {
      const { filter_size, ...rest } = form;
      const body = { site_id: site.id, custom: filter_size.trim() ? { filter_size: filter_size.trim() } : {} };
      Object.entries(rest).forEach(([k, v]) => { if (String(v).trim()) body[k] = String(v).trim(); });
      await api.post("/api/equipment", body);
      toast(`${form.type} added to ${site.label || "site"}`);
      setForm(EMPTY_EQ);
      setAdding(false);
      onAdded();
    } catch (err) {
      toast(err, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card pad={false}>
      <div className="card-head">
        <div style={{ minWidth: 0 }}>
          <h2>{site.address || "Site"}</h2>
          <div className="muted small" style={{ marginTop: 2 }}>{[site.label, site.city, site.postcode].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="spacer" />
        {!adding && <Button size="sm" onClick={() => setAdding(true)}>+ Add equipment</Button>}
      </div>
      {(site.access_notes || site.tenant_name || site.tenant_phone) && (
        <div className="card-body cd-kv" style={{ borderBottom: "1px solid var(--line)" }}>
          {site.access_notes && <div><div className="k">Access notes</div>{site.access_notes}</div>}
          {(site.tenant_name || site.tenant_phone) && (
            <div><div className="k">Tenant</div>{site.tenant_name || "–"}{site.tenant_phone && <> · <a href={`tel:${site.tenant_phone}`}>{site.tenant_phone}</a></>}</div>
          )}
        </div>
      )}
      {equipment.length === 0 && !adding ? (
        <div className="muted small" style={{ padding: "14px 16px" }}>No equipment recorded at this site. Add the furnace, AC or water heater so techs arrive prepared.</div>
      ) : equipment.length > 0 && (
        <div className="cd-scroll">
          <table className="t">
            <thead><tr><th>Equipment</th><th>Make / model</th><th>Serial</th><th>Installed</th><th>Warranty</th><th>Filter size</th></tr></thead>
            <tbody>
              {equipment.map((e) => {
                const under = e.warranty_until && e.warranty_until >= today;
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.type}</td>
                    <td>{[e.make, e.model].filter(Boolean).join(" ") || <span className="muted">–</span>}</td>
                    <td className="num muted">{e.serial || "–"}</td>
                    <td>{e.installed_on ? dateY(e.installed_on, true) : <span className="muted">–</span>}</td>
                    <td>{e.warranty_until ? <Pill tone={under ? "green" : "grey"}>{under ? "Until" : "Ended"} {dateY(e.warranty_until, true)}</Pill> : <span className="muted">–</span>}</td>
                    <td className="num">{e.custom?.filter_size || <span className="muted">–</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {adding && (
        <form className="cd-eqform" onSubmit={save}>
          <Field label="Type"><input value={form.type} onChange={set("type")} placeholder="e.g. Furnace" autoFocus /></Field>
          <Field label="Make"><input value={form.make} onChange={set("make")} placeholder="e.g. Carrier" /></Field>
          <Field label="Model"><input value={form.model} onChange={set("model")} placeholder="e.g. 59SC5" /></Field>
          <Field label="Serial"><input value={form.serial} onChange={set("serial")} placeholder="Serial number" /></Field>
          <Field label="Installed"><input type="date" value={form.installed_on} onChange={set("installed_on")} /></Field>
          <Field label="Warranty until"><input type="date" value={form.warranty_until} onChange={set("warranty_until")} /></Field>
          <Field label="Filter size"><input value={form.filter_size} onChange={set("filter_size")} placeholder="e.g. 16x25x1" /></Field>
          <div className="row" style={{ alignSelf: "end", justifyContent: "flex-end" }}>
            <Button type="button" onClick={() => { setAdding(false); setForm(EMPTY_EQ); }}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function NewJobModal({ customer, onClose, onCreated }) {
  const toast = useToast();
  const sites = customer.sites || [];
  const [form, setForm] = useState({ site_id: sites[0]?.id || "", title: "", job_type: "repair" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    setSaving(true); setErr(null);
    try {
      const body = { customer_id: customer.id, job_type: form.job_type, title: form.title.trim() || undefined };
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
    <Modal title={`New job for ${customer.name}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving} onClick={submit}>{saving ? "Creating…" : "Create job"}</Button></>}>
      <form className="col" onSubmit={submit}>
        {sites.length > 0 && (
          <Field label="Site">
            <select value={form.site_id} onChange={set("site_id")}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.label ? `${s.label} · ` : ""}{s.address}</option>)}
            </select>
          </Field>
        )}
        <Field label="What's the job?"><input value={form.title} onChange={set("title")} placeholder="e.g. Furnace not heating" autoFocus /></Field>
        <Field label="Job type">
          <select value={form.job_type} onChange={set("job_type")}>
            {JOB_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <ErrorBox error={err} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHead, Pill, Tabs, useToast } from "../components/ui";
import { api } from "../lib/api";
import { ago, CHANNEL } from "../lib/format";
import { useApi } from "../lib/useApi";

const CHANNEL_TONE = { missed_call: "red", web_booking: "blue", google_lsa: "green", angi: "amber", sms: "grey", phone: "grey", whatsapp: "green", email: "grey" };
const SOURCE = { website: "Website", google_lsa: "Google Local Services", angi: "Angi", referral: "Referral", phone: "Phone", direct: "Direct" };
const LEAD_STATUS = { new: ["New", "blue"], contacted: ["Contacted", "amber"], quoted: ["Quoted", "blue"], won: ["Won", "green"], lost: ["Lost", "grey"] };
const LeadStatus = ({ s }) => { const [l, t] = LEAD_STATUS[s] || [s, "grey"]; return <Pill tone={t}>{l}</Pill>; };
const channelLabel = (c) => CHANNEL[c] || (c || "").replace(/_/g, " ");

export default function Inbox() {
  const nav = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useApi("/api/leads");
  const [tab, setTab] = useState("new");
  const [busy, setBusy] = useState(null);
  const [logging, setLogging] = useState(false);
  const selectedId = params.get("lead");

  const leads = data || [];
  const counts = { new: leads.filter((l) => l.status === "new").length, all: leads.length };
  const rows = useMemo(() => (tab === "new" ? leads.filter((l) => l.status === "new") : leads), [leads, tab]);
  const selected = leads.find((l) => l.id === selectedId) || rows[0] || null;

  // A deep link (e.g. from Home) to a lead that is no longer "new" should still be visible.
  useEffect(() => {
    if (selectedId && data && tab === "new" && !rows.some((l) => l.id === selectedId) && leads.some((l) => l.id === selectedId)) setTab("all");
  }, [selectedId, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (id) => setParams(id ? { lead: id } : {}, { replace: true });

  const convert = async (lead) => {
    const cust = await api.post(`/api/leads/${lead.id}/convert`);
    await reload();
    return cust;
  };

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { toast(e, true); } finally { setBusy(null); }
  };

  const createCustomer = (lead) => run("convert", async () => {
    const cust = await convert(lead);
    toast(`${cust.name} saved as a customer`);
  });
  const quote = (lead) => run("quote", async () => {
    const cust = lead.customer_id ? { id: lead.customer_id } : await convert(lead);
    nav(`/quotes/new?customer=${cust.id}&lead=${lead.id}`);
  });
  const markLost = (lead) => run("lost", async () => {
    await api.patch(`/api/leads/${lead.id}`, { status: "lost" });
    await reload();
    toast(`${lead.name} marked as lost`);
  });

  return (
    <div className="page">
      <style>{`
        .ib-wrap { display: grid; grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: 16px; align-items: start; }
        .ib-list { max-height: calc(100vh - 210px); overflow-y: auto; }
        .ib-item { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--line); background: none; font: inherit; color: inherit;
          padding: 12px 16px; cursor: pointer; border-left: 3px solid transparent; }
        .ib-item:last-child { border-bottom: 0; }
        .ib-item:hover { background: var(--surface-2); }
        .ib-item.on { background: var(--brand-soft); border-left-color: var(--brand); }
        .ib-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 18px; }
        .ib-meta .k { font-size: 12px; color: var(--ink-3); margin-bottom: 2px; }
        .ib-msg { background: var(--surface-2); border-radius: 10px; padding: 12px 14px; font-size: 15px; line-height: 1.5; }
        .ib-auto { background: var(--green-soft); color: var(--green); border-radius: 8px; padding: 9px 12px; font-size: 13px; }
        @media (max-width: 900px) { .ib-wrap { grid-template-columns: 1fr; } .ib-list { max-height: none; } }
      `}</style>

      <PageHead title="Inbox" sub="Every call, text, booking and lead-site enquiry in one place. Reply fast, win the job.">
        <Button variant="primary" onClick={() => setLogging(true)}>+ Log a call</Button>
      </PageHead>

      <Tabs value={tab} onChange={setTab} tabs={[["new", `New${data ? ` · ${counts.new}` : ""}`], ["all", `All${data ? ` · ${counts.all}` : ""}`]]} />
      <ErrorBox error={error} />

      {loading && !data ? <Card><Loading /></Card> : data && (
        rows.length === 0 ? (
          <Card>
            <Empty>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{tab === "new" ? "You're all caught up" : "No leads yet"}</div>
              <div style={{ marginTop: 4 }}>{tab === "new" ? "New calls, texts and web bookings land here." : "Log a call or share your booking link to get started."}</div>
              <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
                {tab === "new" && leads.length > 0 && <Button onClick={() => setTab("all")}>Show all leads</Button>}
                <Button variant="primary" onClick={() => setLogging(true)}>+ Log a call</Button>
              </div>
            </Empty>
          </Card>
        ) : (
          <div className="ib-wrap">
            <Card pad={false}>
              <div className="ib-list">
                {rows.map((l) => (
                  <button key={l.id} className={`ib-item ${selected?.id === l.id ? "on" : ""}`} onClick={() => select(l.id)}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                      <div className="spacer" />
                      <span className="muted small" style={{ whiteSpace: "nowrap" }}>{ago(l.created_at)}</span>
                    </div>
                    <div className="muted small" style={{ margin: "2px 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.service || "General enquiry"}
                    </div>
                    <div className="row wrap" style={{ gap: 6 }}>
                      <Pill tone={CHANNEL_TONE[l.channel] || "grey"}>{channelLabel(l.channel)}</Pill>
                      <LeadStatus s={l.status} />
                      {l.auto_replied && <Pill tone="green">✓ Auto-replied</Pill>}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {selected ? (
              <LeadDetail lead={selected} busy={busy} onConvert={createCustomer} onQuote={quote} onLost={markLost} />
            ) : (
              <Card><Empty>Select a lead to see the details.</Empty></Card>
            )}
          </div>
        )
      )}

      {logging && (
        <LogCallModal
          onClose={() => setLogging(false)}
          onSaved={async (lead) => {
            setLogging(false);
            toast(lead.auto_replied
              ? `Missed call logged. We texted ${lead.name.split(" ")[0]} back automatically.`
              : `Lead from ${lead.name} added to the inbox`);
            await reload();
            setTab("new");
            select(lead.id);
          }}
        />
      )}
    </div>
  );
}

function LeadDetail({ lead, busy, onConvert, onQuote, onLost }) {
  const closed = lead.status === "lost" || lead.status === "won";
  return (
    <Card pad={false}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
        <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
          <Avatar name={lead.name} size={44} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ fontSize: 19 }}>{lead.name}</h2>
            <div className="muted" style={{ marginTop: 3 }}>
              {lead.service || "General enquiry"} · via {channelLabel(lead.channel)} · {ago(lead.created_at)}
            </div>
          </div>
          <LeadStatus s={lead.status} />
        </div>
      </div>

      <div className="col" style={{ padding: "18px 20px", gap: 16 }}>
        {lead.message && (
          <div>
            <div className="muted small" style={{ marginBottom: 6 }}>Message</div>
            <div className="ib-msg">“{lead.message}”</div>
          </div>
        )}

        {lead.auto_replied && (
          <div className="ib-auto">✓ We texted them back automatically so they know you'll call. Follow up while they're still interested.</div>
        )}

        <div className="ib-meta">
          <div><div className="k">Phone</div>{lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : <span className="muted">Not given</span>}</div>
          <div><div className="k">Email</div>{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : <span className="muted">Not given</span>}</div>
          <div><div className="k">Preferred time</div>{lead.preferred_window || <span className="muted">Any time</span>}</div>
          <div><div className="k">Source</div>{SOURCE[lead.source] || CHANNEL[lead.source] || lead.source || <span className="muted">Unknown</span>}</div>
          {lead.address && <div style={{ gridColumn: "1 / -1" }}><div className="k">Address</div>{lead.address}</div>}
        </div>

        {lead.customer_id && (
          <div className="callout row" style={{ gap: 8 }}>
            <span>Saved as a customer.</span>
            <div className="spacer" />
            <Link to={`/customers/${lead.customer_id}`} style={{ fontWeight: 600 }}>View customer →</Link>
          </div>
        )}
      </div>

      <div className="row wrap" style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", background: "var(--surface-2)", borderRadius: "0 0 var(--radius) var(--radius)" }}>
        {lead.phone && <a className="btn" href={`tel:${lead.phone}`}>Call</a>}
        {!lead.customer_id && <Button disabled={!!busy} onClick={() => onConvert(lead)}>{busy === "convert" ? "Saving…" : "Create customer"}</Button>}
        <div className="spacer" />
        {!closed && <Button variant="danger" disabled={!!busy} onClick={() => onLost(lead)}>{busy === "lost" ? "Saving…" : "Mark lost"}</Button>}
        <Button variant="primary" disabled={!!busy || lead.status === "lost"} onClick={() => onQuote(lead)}>{busy === "quote" ? "Opening…" : "Quote"}</Button>
      </div>
    </Card>
  );
}

const LOG_CHANNELS = ["phone", "missed_call", "sms", "email", "whatsapp", "google_lsa", "angi"];

function LogCallModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", phone: "", channel: "phone", service: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) return setErr(new Error("Add the caller's name"));
    if (form.channel === "missed_call" && !form.phone.trim()) return setErr(new Error("A missed call needs a phone number to text back"));
    setSaving(true); setErr(null);
    try {
      const source = form.channel === "google_lsa" || form.channel === "angi" ? form.channel : form.channel === "missed_call" ? "phone" : "direct";
      const body = { ...form, name: form.name.trim(), source };
      if (!body.message && form.channel === "missed_call") body.message = `Missed call at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      onSaved(await api.post("/api/leads", body));
    } catch (e2) {
      setErr(e2);
      setSaving(false);
    }
  };

  return (
    <Modal title="Log a call" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving} onClick={submit}>{saving ? "Saving…" : "Add to inbox"}</Button></>}>
      <form className="col" onSubmit={submit}>
        <div className="grid g2">
          <Field label="Name"><input value={form.name} onChange={set("name")} placeholder="Caller or business name" autoFocus /></Field>
          <Field label="Phone"><input value={form.phone} onChange={set("phone")} placeholder="(555) 010-0000" /></Field>
        </div>
        <div className="grid g2">
          <Field label="Channel">
            <select value={form.channel} onChange={set("channel")}>
              {LOG_CHANNELS.map((c) => <option key={c} value={c}>{channelLabel(c)}</option>)}
            </select>
          </Field>
          <Field label="Service needed"><input value={form.service} onChange={set("service")} placeholder="e.g. No heat" /></Field>
        </div>
        {form.channel === "missed_call" && (
          <div className="callout small">Missed calls get an automatic text back right away, so the customer knows you'll call them.</div>
        )}
        <Field label="Notes"><textarea value={form.message} onChange={set("message")} placeholder="What did they say?" /></Field>
        <ErrorBox error={err} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

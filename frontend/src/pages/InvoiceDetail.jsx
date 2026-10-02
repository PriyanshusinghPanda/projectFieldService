import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Empty, ErrorBox, Loading, Money, PageHead, Pill, Status, useToast } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ago, day, money } from "../lib/format";
import { useApi } from "../lib/useApi";
import { LateBadge, PaymentModal } from "./Invoices";

const METHOD = { card: "Card", cash: "Cash", check: "Check", ach: "Bank transfer", deposit: "Deposit" };
const TEMPLATE = { invoice_sent: "Invoice sent", payment_reminder: "Payment reminder", receipt: "Receipt", review_request: "Review request" };
const pct = (bp) => `${(bp / 100).toFixed(bp % 100 ? 2 : 0)}%`;

const PRINT_CSS = `
.inv-paper { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 36px 40px; }
.inv-paper table { width: 100%; border-collapse: collapse; }
.inv-paper th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-3); font-weight: 600; padding: 8px 0; border-bottom: 1px solid var(--ink); }
.inv-paper td { padding: 10px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.inv-paper .r { text-align: right; }
.inv-label { font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-3); font-weight: 600; margin-bottom: 4px; }
.inv-tot { display: flex; justify-content: space-between; padding: 5px 0; }
.inv-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
@media (max-width: 1050px) { .inv-layout { grid-template-columns: 1fr; } }
@media print {
  @page { margin: 14mm; }
  body { background: #fff !important; }
  .side, .topbar, .no-print, .toast { display: none !important; }
  .shell { display: block !important; }
  .page { padding: 0 !important; max-width: none !important; }
  .inv-layout { display: block !important; }
  .inv-paper { border: 0 !important; box-shadow: none !important; padding: 0 !important; }
  .inv-paper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export default function InvoiceDetail() {
  const { id } = useParams();
  const { org } = useAuth();
  const toast = useToast();
  const { data: inv, loading, error, reload } = useApi(`/api/invoices/${id}`);
  const cust = useApi(inv ? `/api/customers/${inv.customer_id}` : null, [inv?.customer_id]);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(null);

  if (loading && !inv) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><PageHead title="Invoice" /><ErrorBox error={error} /></div>;

  const open = inv.status === "open" || inv.status === "partially_paid";
  const payLink = `${window.location.origin}/pay/${inv.public_token}`;
  const site = cust.data?.sites?.find((s) => s.id === inv.site_id);
  const brand = org?.brand?.color || "var(--brand)";

  const act = async (kind) => {
    setBusy(kind);
    try {
      await api.post(`/api/invoices/${inv.id}/${kind}`);
      toast(kind === "send" ? `Invoice texted to ${inv.customer?.name} with a pay link` : `Reminder sent to ${inv.customer?.name}`);
      reload();
    } catch (e) { toast(e, true); } finally { setBusy(null); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(payLink); toast("Pay link copied"); }
    catch { window.prompt("Copy the pay link", payLink); }
  };

  return (
    <div className="page">
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <div className="small" style={{ marginBottom: 8 }}><Link to="/invoices">← Invoices</Link></div>
        <PageHead title={<span className="row" style={{ gap: 10 }}>{inv.number} <Status s={inv.status} /> <LateBadge inv={inv} /></span>}
          sub={<>{inv.customer?.name} · issued {day(inv.issued_on)} · {inv.sent_at ? `sent ${ago(inv.sent_at)}` : "not sent yet"}</>}>
          <Button onClick={copy}>Copy pay link</Button>
          <Button onClick={() => window.print()}>Print</Button>
          {open && <Button onClick={() => act("remind")} disabled={!!busy}>{busy === "remind" ? "Sending…" : "Remind"}</Button>}
          {open && <Button onClick={() => act("send")} disabled={!!busy}>{busy === "send" ? "Sending…" : inv.sent_at ? "Send again" : "Send"}</Button>}
          {open && <Button variant="primary" onClick={() => setPaying(true)}>Record payment</Button>}
        </PageHead>
      </div>

      <div className="inv-layout">
        {/* the printable document */}
        <div className="inv-paper">
          <div className="row between" style={{ alignItems: "flex-start", gap: 24 }}>
            <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: brand, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 18 }}>
                {org?.brand?.short || org?.name?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 650, fontSize: 17 }}>{org?.name}</div>
                <div className="muted small">{[org?.phone, org?.email].filter(Boolean).join(" · ")}</div>
                {org?.license_number && <div className="muted small">Licence {org.license_number}</div>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: ".04em", color: brand }}>INVOICE</div>
              <div style={{ fontWeight: 600 }}>{inv.number}</div>
            </div>
          </div>

          <div className="grid g3" style={{ marginTop: 28, gap: 18 }}>
            <div>
              <div className="inv-label">Bill to</div>
              <div style={{ fontWeight: 600 }}>{inv.customer?.name}</div>
              {site && <div className="small">{site.address}{site.city ? `, ${site.city}` : ""} {site.postcode}</div>}
              <div className="muted small">{[inv.customer?.phone, inv.customer?.email].filter(Boolean).join(" · ")}</div>
            </div>
            <div>
              <div className="inv-label">Issued</div><div>{day(inv.issued_on)}</div>
              <div className="inv-label" style={{ marginTop: 10 }}>Due</div><div>{day(inv.due_on)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="inv-label">Balance due</div>
              <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{money(inv.balance_cents)}</div>
              {inv.status === "paid" && <Pill tone="green">Paid in full</Pill>}
            </div>
          </div>

          <table style={{ marginTop: 28 }}>
            <thead><tr><th>Description</th><th className="r" style={{ width: 60 }}>Qty</th><th className="r" style={{ width: 110 }}>Unit</th><th className="r" style={{ width: 120 }}>Amount</th></tr></thead>
            <tbody>
              {inv.lines.map((l) => (
                <tr key={l.id || l.name}>
                  <td>
                    <div style={{ fontWeight: 550 }}>{l.name}</div>
                    {l.description && <div className="muted small">{l.description}</div>}
                    {l.member_price_applied && <div className="small" style={{ color: "var(--green)" }}>Member price</div>}
                  </td>
                  <td className="r num">{l.qty}</td>
                  <td className="r"><Money cents={l.unit_price_cents} /></td>
                  <td className="r"><Money cents={l.total_cents} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row" style={{ marginTop: 16, alignItems: "flex-start", gap: 24 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {inv.custom_fields?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="inv-label">Equipment &amp; job details</div>
                  {inv.custom_fields.map((f) => (
                    <div key={f.label} className="small"><span className="muted">{f.label}:</span> <b>{f.value}</b></div>
                  ))}
                </div>
              )}
              {inv.stages?.length > 1 && (
                <div>
                  <div className="inv-label">Payment schedule</div>
                  {inv.stages.map((s, n) => (
                    <div key={n} className="small">Stage {n + 1}: {s.percent}% · <Money cents={s.amount_cents} /></div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 290 }}>
              <div className="inv-tot"><span className="muted">Subtotal</span><Money cents={inv.subtotal_cents} /></div>
              {inv.tax_lines?.filter((t) => t.tax_cents > 0).map((t) => (
                <div key={t.code} className="inv-tot"><span className="muted">{inv.tax_label || "Tax"} ({pct(t.rate_bp)})</span><Money cents={t.tax_cents} /></div>
              ))}
              <div className="inv-tot" style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 8, fontWeight: 650 }}><span>Total</span><Money cents={inv.total_cents} /></div>
              {inv.deposits_applied_cents > 0 && <div className="inv-tot"><span className="muted">Deposit paid</span><span>−<Money cents={inv.deposits_applied_cents} /></span></div>}
              {inv.amount_paid_cents > 0 && <div className="inv-tot"><span className="muted">Paid</span><span>−<Money cents={inv.amount_paid_cents} /></span></div>}
              <div className="inv-tot" style={{ borderTop: "2px solid var(--ink)", marginTop: 4, paddingTop: 8, fontWeight: 700, fontSize: 16 }}>
                <span>Balance due</span><Money cents={inv.balance_cents} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 28, paddingTop: 14, borderTop: "1px solid var(--line)" }} className="small muted">
            {open ? <>Pay online: <span style={{ color: "var(--ink)" }}>{payLink}</span></> : "Thank you for your business."}
            {org?.review_link && inv.status === "paid" && <div>Happy with the work? Leave us a review: {org.review_link}</div>}
          </div>
        </div>

        {/* office side panel */}
        <div className="col no-print" style={{ gap: 14 }}>
          <Card title="Summary">
            <div className="col" style={{ gap: 6 }}>
              <div className="row between"><span className="muted">Total</span><Money cents={inv.total_cents} /></div>
              <div className="row between"><span className="muted">Received</span><Money cents={(inv.amount_paid_cents || 0) + (inv.deposits_applied_cents || 0)} /></div>
              <div className="row between" style={{ fontWeight: 650 }}><span>Balance</span><Money cents={inv.balance_cents} /></div>
              {inv.total_cents > 0 && (
                <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (100 * (inv.total_cents - inv.balance_cents)) / inv.total_cents)}%`, background: "var(--green)" }} />
                </div>
              )}
              {inv.reminders?.length > 0 && <div className="muted small">{inv.reminders.length} reminder{inv.reminders.length === 1 ? "" : "s"} sent · last {ago(inv.reminders[inv.reminders.length - 1].at)}</div>}
              {inv.job_id && <div className="small"><Link to={`/jobs/${inv.job_id}`}>View the job →</Link></div>}
              <div className="small"><Link to={`/customers/${inv.customer_id}`}>View {inv.customer?.name} →</Link></div>
            </div>
          </Card>

          <Card title="Payments" pad={false}>
            {inv.payments?.length ? inv.payments.map((p) => (
              <div key={p.id} className="row" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <div style={{ fontWeight: 550 }}>{METHOD[p.method] || p.method}{p.kind === "deposit" ? " · deposit" : ""}</div>
                  <div className="muted small">{ago(p.received_at)}{p.recorded_by === "webhook" ? " · online" : ""}</div>
                </div>
                <div className="spacer" />
                <b><Money cents={p.amount_cents} /></b>
              </div>
            )) : <Empty>No payments yet</Empty>}
          </Card>

          <Card title="Messages" pad={false}>
            {inv.messages?.length ? inv.messages.map((m) => (
              <div key={m.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
                <div className="row small" style={{ gap: 6 }}>
                  <b>{TEMPLATE[m.template] || m.template?.replace(/_/g, " ")}</b>
                  <Pill tone="grey">{m.channel.toUpperCase()}</Pill>
                  <div className="spacer" /><span className="muted">{ago(m.created_at)}</span>
                </div>
                <div className="small" style={{ color: "var(--ink-2)", marginTop: 4 }}>{m.body}</div>
              </div>
            )) : <Empty>No messages sent about this invoice yet</Empty>}
          </Card>
        </div>
      </div>

      {paying && <PaymentModal invoice={{ ...inv, customer_name: inv.customer?.name }} onClose={() => setPaying(false)} onDone={reload} />}
    </div>
  );
}

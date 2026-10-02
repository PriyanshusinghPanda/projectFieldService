import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Empty, ErrorBox, Field, Loading, Modal, Money, PageHead, Pill, Status, Tabs, Tile, useToast } from "../components/ui";
import { api } from "../lib/api";
import { day, localISODate, money, toCents } from "../lib/format";
import { useApi } from "../lib/useApi";

// Aging buckets, oldest last. Warm sequential ramp: the later the money, the darker the segment.
const BUCKETS = [
  ["not_due", "Not due yet", "#9db8f2"],
  ["1-7", "1–7 days late", "#f2c46d"],
  ["8-14", "8–14 days late", "#e8913f"],
  ["15-30", "15–30 days late", "#d0573a"],
  ["30+", "30+ days late", "#9b1c1c"],
];

const METHODS = [["card", "Card"], ["cash", "Cash"], ["check", "Check"], ["ach", "Bank transfer (ACH)"]];
const Group = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}>{label}{children}</div>
);
const isOpen = (i) => i.status === "open" || i.status === "partially_paid";
const daysLate = (i) => (i.due_on ? Math.max(0, Math.round((new Date(localISODate() + "T12:00:00") - new Date(i.due_on + "T12:00:00")) / 86400000)) : 0);
const bucketOf = (d) => (d <= 0 ? "not_due" : d <= 7 ? "1-7" : d <= 14 ? "8-14" : d <= 30 ? "15-30" : "30+");
// Aging computed client-side from the invoice list: unpaid balance per bucket.
function agingOf(rows) {
  const out = Object.fromEntries(BUCKETS.map(([k]) => [k, 0]));
  for (const i of rows) if (isOpen(i)) out[bucketOf(i.days_overdue)] += i.balance_cents || 0;
  return out;
}

// Shared with InvoiceDetail: record a payment taken in person.
export function PaymentModal({ invoice, onClose, onDone }) {
  const toast = useToast();
  const [amount, setAmount] = useState(((invoice.balance_cents || 0) / 100).toFixed(2));
  const [method, setMethod] = useState("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const cents = toCents(amount);
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const res = await api.post(`/api/invoices/${invoice.id}/payments`, { amount_cents: cents, method });
      toast(`${money(cents)} recorded on ${invoice.number}${res.invoice?.status === "paid" ? " — paid in full" : ""}`);
      onDone?.(res);
      onClose();
    } catch (e) { setError(e); setBusy(false); }
  };
  return (
    <Modal title={`Record payment · ${invoice.number}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || cents <= 0} onClick={save}>{busy ? "Saving…" : `Record ${money(cents)}`}</Button></>}>
      <div className="row between small muted">
        <span>{invoice.customer_name || invoice.customer?.name}</span>
        <span>Balance <b style={{ color: "var(--ink)" }}><Money cents={invoice.balance_cents} /></b></span>
      </div>
      <Field label="Amount">
        <div style={{ position: "relative" }}>
          <span className="muted" style={{ position: "absolute", left: 10, top: 8 }}>$</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ paddingLeft: 22 }} autoFocus />
        </div>
      </Field>
      <Group label="Method">
        <div className="row wrap" style={{ gap: 6 }}>
          {METHODS.map(([k, label]) => (
            <button key={k} type="button" className={`btn sm ${method === k ? "primary" : ""}`} onClick={() => setMethod(k)}>{label}</button>
          ))}
        </div>
      </Group>
      {cents > invoice.balance_cents && <div className="small" style={{ color: "var(--amber)" }}>That is more than the balance owed.</div>}
      <ErrorBox error={error} />
    </Modal>
  );
}

export function LateBadge({ inv }) {
  if (!isOpen(inv)) return null;
  if (inv.days_overdue > 0) return <Pill tone={inv.days_overdue > 14 ? "red" : "amber"}>{inv.days_overdue} {inv.days_overdue === 1 ? "day" : "days"} late</Pill>;
  const left = Math.round((new Date(inv.due_on + "T12:00:00") - new Date(localISODate() + "T12:00:00")) / 86400000);
  return <span className="muted small">{left === 0 ? "Due today" : `Due in ${left} d`}</span>;
}

function AgingBar({ aging }) {
  const [hover, setHover] = useState(null);
  const total = BUCKETS.reduce((s, [k]) => s + (aging[k] || 0), 0);
  if (!total) return <Empty>Nobody owes you anything right now.</Empty>;
  return (
    <div>
      <div style={{ display: "flex", gap: 2, height: 22, borderRadius: 6, overflow: "hidden", background: "var(--surface-2)" }}>
        {BUCKETS.filter(([k]) => aging[k] > 0).map(([k, label, color]) => (
          <div key={k} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)}
            title={`${label}: ${money(aging[k])}`}
            style={{ flex: aging[k] / total, minWidth: 6, background: color, opacity: hover && hover !== k ? 0.45 : 1, transition: "opacity .15s", cursor: "default" }} />
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))", marginTop: 12, gap: 10 }}>
        {BUCKETS.map(([k, label, color]) => (
          <div key={k} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)}
            style={{ opacity: hover && hover !== k ? 0.5 : 1, transition: "opacity .15s" }}>
            <div className="row small muted" style={{ gap: 6 }}><span className="dot" style={{ background: color }} />{label}</div>
            <div className="num" style={{ fontWeight: 650, fontSize: 15, marginTop: 2, color: aging[k] ? "var(--ink)" : "var(--ink-3)" }}>{money(aging[k] || 0)}</div>
            <div className="muted small">{Math.round((100 * (aging[k] || 0)) / total)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Invoices() {
  const nav = useNavigate();
  const toast = useToast();
  const list = useApi("/api/invoices");
  const [tab, setTab] = useState("unpaid");
  const [q, setQ] = useState("");
  const [paying, setPaying] = useState(null);
  const [busy, setBusy] = useState(null);

  const rows = useMemo(() => (list.data || []).map((i) => ({ ...i, days_overdue: i.days_overdue ?? daysLate(i) })), [list.data]);
  const aging = useMemo(() => agingOf(rows), [rows]);
  const stats = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const sinceISO = localISODate(since);
    const open = rows.filter(isOpen);
    const overdue = open.filter((i) => i.days_overdue > 0);
    const recent = rows.filter((i) => i.issued_on >= sinceISO && i.status !== "void");
    return {
      collected: recent.reduce((s, i) => s + (i.amount_paid_cents || 0) + (i.deposits_applied_cents || 0), 0),
      recentCount: recent.length,
      outstanding: open.reduce((s, i) => s + i.balance_cents, 0), openCount: open.length,
      overdue: overdue.reduce((s, i) => s + i.balance_cents, 0), overdueCount: overdue.length, overdueList: overdue,
      notDue: open.filter((i) => !i.days_overdue).reduce((s, i) => s + i.balance_cents, 0),
      paidCount: rows.filter((i) => i.status === "paid").length,
    };
  }, [rows]);

  const shown = useMemo(() => {
    let r = rows;
    if (tab === "unpaid") r = r.filter(isOpen);
    if (tab === "overdue") r = r.filter((i) => isOpen(i) && i.days_overdue > 0).sort((a, b) => b.days_overdue - a.days_overdue);
    if (tab === "paid") r = r.filter((i) => i.status === "paid");
    const s = q.trim().toLowerCase();
    if (s) r = r.filter((i) => `${i.number} ${i.customer_name}`.toLowerCase().includes(s));
    return r;
  }, [rows, tab, q]);

  const reloadAll = () => list.reload();
  const remind = async (inv) => {
    setBusy(inv.id);
    try {
      await api.post(`/api/invoices/${inv.id}/remind`);
      toast(`Reminder texted to ${inv.customer_name} with a pay link`);
    } catch (e) { toast(e, true); } finally { setBusy(null); }
  };
  const remindAll = async () => {
    setBusy("all");
    let n = 0;
    for (const inv of stats.overdueList) {
      try { await api.post(`/api/invoices/${inv.id}/remind`); n++; } catch { /* keep going */ }
    }
    setBusy(null);
    toast(`${n} reminder${n === 1 ? "" : "s"} sent with pay links`);
  };

  return (
    <div className="page">
      <PageHead title="Invoices" sub="Who owes you, how late it is, and one click to chase it">
        {stats.overdueCount > 0 && (
          <Button onClick={remindAll} disabled={busy === "all"}>{busy === "all" ? "Sending…" : `Remind all overdue (${stats.overdueCount})`}</Button>
        )}
      </PageHead>

      {list.error ? <ErrorBox error={list.error} /> : (
        <>
          <div className="grid g4" style={{ marginBottom: 14 }}>
            <Tile k="Collected · last 30 days" v={list.loading && !list.data ? "…" : <Money cents={stats.collected} />} s={`across ${stats.recentCount} invoices issued`} />
            <Tile k="Outstanding" v={list.loading && !list.data ? "…" : <Money cents={stats.outstanding} />} s={`${stats.openCount} unpaid invoices`} onClick={() => setTab("unpaid")} />
            <Tile k="Overdue" v={list.loading && !list.data ? "…" : <span style={{ color: stats.overdue ? "var(--red)" : undefined }}><Money cents={stats.overdue} /></span>}
              s={stats.overdueCount ? `${stats.overdueCount} past their due date` : "Nothing is late"} onClick={() => setTab("overdue")} />
            <Tile k="Not due yet" v={list.loading && !list.data ? "…" : <Money cents={stats.notDue} />} s="sent, still inside terms" />
          </div>

          <Card title="Aging" actions={<span className="muted small">Unpaid balances by how late they are</span>} style={{ marginBottom: 14 }}>
            {list.data ? <AgingBar aging={aging} /> : <Loading />}
          </Card>

          <Card pad={false}>
            <div className="row" style={{ padding: "10px 16px 0", alignItems: "flex-end" }}>
              <Tabs value={tab} onChange={setTab} tabs={[
                ["unpaid", `Unpaid (${stats.openCount})`], ["overdue", `Overdue (${stats.overdueCount})`],
                ["paid", `Paid (${stats.paidCount})`], ["all", `All (${rows.length})`]]} />
              <div className="spacer" />
              <input placeholder="Search customer or number" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240, marginBottom: 10 }} />
            </div>
            {list.loading && !list.data ? <Loading /> : shown.length === 0 ? (
              <Empty>{q ? "No invoices match that search." : tab === "overdue" ? "No overdue invoices. Everyone has paid on time." : tab === "unpaid" ? "Every invoice is paid." : "No invoices yet."}</Empty>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="t">
                  <thead><tr>
                    <th>Invoice</th><th>Customer</th><th>Issued</th><th>Due</th><th className="r">Total</th><th className="r">Balance</th><th>Status</th><th></th><th className="r">Actions</th>
                  </tr></thead>
                  <tbody>
                    {shown.map((i) => (
                      <tr key={i.id} className="click" onClick={() => nav(`/invoices/${i.id}`)}>
                        <td style={{ fontWeight: 600 }}>{i.number}</td>
                        <td>{i.customer_name}</td>
                        <td className="muted">{day(i.issued_on)}</td>
                        <td className="muted">{day(i.due_on)}</td>
                        <td className="r"><Money cents={i.total_cents} /></td>
                        <td className="r" style={{ fontWeight: i.balance_cents ? 600 : 400, color: i.balance_cents ? "var(--ink)" : "var(--ink-3)" }}><Money cents={i.balance_cents} /></td>
                        <td><Status s={i.status} /></td>
                        <td><LateBadge inv={i} /></td>
                        <td className="r" onClick={(e) => e.stopPropagation()}>
                          {isOpen(i) ? (
                            <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                              <Button size="sm" disabled={busy === i.id} onClick={() => remind(i)}>{busy === i.id ? "Sending…" : "Remind"}</Button>
                              <Button size="sm" variant="primary" onClick={() => setPaying(i)}>Record payment</Button>
                            </div>
                          ) : <span className="muted small">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
      {paying && <PaymentModal invoice={paying} onClose={() => setPaying(null)} onDone={reloadAll} />}
    </div>
  );
}

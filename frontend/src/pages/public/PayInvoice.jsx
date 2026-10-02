// Customer invoice link (/pay/:token): see the bill, pay the balance (demo checkout), get a receipt. No login.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui";
import { api } from "../../lib/api";
import { day, localISODate, money, setCurrency } from "../../lib/format";
import { useApi } from "../../lib/useApi";

function tint(hex, a) {
  let h = String(hex || "#0b5cff").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const m = (c) => Math.round(255 - (255 - c) * a);
  return `rgb(${m((n >> 16) & 255)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
}
const telUrl = (p) => `tel:${String(p || "").replace(/[^0-9+]/g, "")}`;

export default function PayInvoice() {
  const { token } = useParams();
  const { data: inv, error, loading, reload } = useApi(`/api/public/invoices/${token}`);
  const [busy, setBusy] = useState(false);
  const [payErr, setPayErr] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (!inv) return;
    setCurrency(inv.currency);
    document.title = `${inv.number} · ${inv.org?.name || "Invoice"}`;
  }, [inv]);

  const org = inv?.org;
  const pay = async () => {
    setBusy(true); setPayErr(null);
    try {
      const amount = inv.balance_cents;
      const r = await api.post("/api/public/pay", { for: "invoice", token, amount_cents: amount });
      setReceipt({ amount, ref: r.payment_id, at: new Date() });
      await reload();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setPayErr(e); } finally { setBusy(false); }
  };

  const wrap = (children) => (
    <div className="phone" style={{ "--brand": org?.brand?.color || "#0b5cff", "--brand-soft": tint(org?.brand?.color, 0.1) }}>
      <style>{CSS}</style>
      {org && (
        <div className="phone-head" style={{ gap: 12 }}>
          <span className="pi-logo">{org.brand?.short || org.name[0]}</span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 650 }}>{org.name}</div><div className="muted small">Invoice {inv.number}</div></div>
          {org.phone && <a className="btn sm" href={telUrl(org.phone)}>Call</a>}
        </div>
      )}
      <div className="phone-body">{children}</div>
    </div>
  );

  if (loading && !inv) return wrap(<div className="empty">Loading your invoice…</div>);
  if (error) {
    return wrap(
      <div className="card pi-state">
        <div className="pi-ico" style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}>?</div>
        <h2>{error.status === 404 ? "This payment link isn't valid" : "Couldn't load your invoice"}</h2>
        <div className="muted">{error.status === 404 ? "Please contact the business for a new link." : error.message}</div>
        {error.status !== 404 && <Button onClick={reload}>Try again</Button>}
      </div>
    );
  }

  const paid = inv.status === "paid" || inv.balance_cents <= 0;
  const voided = inv.status === "void";
  const overdue = !paid && !voided && inv.due_on && inv.due_on < localISODate();
  const first = (inv.customer?.name || "").split(" ")[0];
  const otherPaid = inv.amount_paid_cents - (inv.deposits_applied_cents || 0);

  return wrap(
    <>
      {paid ? (
        <div className="card pi-state">
          <div className="pi-ico pop">✓</div>
          <h1 style={{ fontSize: 22 }}>{receipt ? `Thanks, ${first}! Payment received` : "Paid — thank you"}</h1>
          <div className="pi-big num">{money(receipt ? receipt.amount : inv.total_cents)}</div>
          <div className="muted">{receipt ? `Paid ${receipt.at.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} · Card` : `Invoice ${inv.number} is paid in full`}</div>
          {receipt?.ref && <div className="pi-ref">Receipt #{String(receipt.ref).slice(0, 8).toUpperCase()}</div>}
          {receipt && <div className="muted small">A receipt has been sent to you. We appreciate your business!</div>}
        </div>
      ) : voided ? (
        <div className="card pi-state">
          <div className="pi-ico" style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}>–</div>
          <h2>This invoice was cancelled</h2>
          <div className="muted">Nothing to pay. Questions? Call {org.phone}.</div>
        </div>
      ) : (
        <div className="card pi-due">
          <div className="muted">Hi {first}, your balance is</div>
          <div className="pi-big num">{money(inv.balance_cents)}</div>
          <div className="row" style={{ justifyContent: "center", gap: 8 }}>
            {overdue ? <span className="pill red">Overdue · was due {day(inv.due_on)}</span> : <span className="pill blue">Due {day(inv.due_on)}</span>}
            {inv.status === "partially_paid" && <span className="pill amber">Part paid</span>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="pi-sec">
          <div><div className="pi-mini">Invoice</div><div style={{ fontWeight: 650 }}>{inv.number}</div></div>
          <div style={{ textAlign: "right" }}><div className="pi-mini">Issued</div><div>{day(inv.issued_on)}</div></div>
        </div>
        <div className="pi-lines">
          {inv.lines.map((l, i) => (
            <div key={i} className="pi-line">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{l.name}</div>
                {(l.qty !== 1 || l.unit_price_cents != null) && <div className="muted small">{l.qty} × {money(l.unit_price_cents)}</div>}
              </div>
              <span className="num">{money(l.total_cents)}</span>
            </div>
          ))}
        </div>
        <div className="pi-tot">
          <Row k="Subtotal" v={inv.subtotal_cents} />
          {taxRows(inv).map((t) => <Row key={t.k} k={t.k} v={t.v} />)}
          <Row k="Total" v={inv.total_cents} strong />
          {inv.deposits_applied_cents > 0 && <Row k="Deposit paid" v={-inv.deposits_applied_cents} />}
          {otherPaid > 0 && <Row k="Payments" v={-otherPaid} />}
          <Row k="Balance due" v={inv.balance_cents} strong big />
        </div>
        {inv.custom_fields?.length > 0 && (
          <div className="pi-tot" style={{ background: "var(--surface-2)" }}>
            <div className="pi-mini">Service details</div>
            {inv.custom_fields.map((f) => <div key={f.label} className="row between small"><span className="muted">{f.label}</span><span>{f.value}</span></div>)}
          </div>
        )}
      </div>

      <div className="muted small" style={{ textAlign: "center" }}>
        {org.name}{org.phone ? <> · <a href={telUrl(org.phone)}>{org.phone}</a></> : null}
      </div>

      {!paid && !voided && (
        <div className="phone-foot">
          {payErr && <div className="err-box small" style={{ marginBottom: 8 }}>{payErr.message}</div>}
          <Button variant="primary" size="lg" block onClick={pay} disabled={busy} style={{ height: 54, fontSize: 17 }}>
            {busy ? "Processing…" : `Pay ${money(inv.balance_cents)}`}
          </Button>
          <div className="muted small" style={{ textAlign: "center", marginTop: 6 }}>Secure card checkout (demo, no card needed)</div>
        </div>
      )}
    </>
  );
}

const pct = (bp) => `${(bp / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
function taxRows(inv) {
  const label = inv.tax_label || "Tax";
  const lines = (inv.tax_lines || []).filter((t) => t.tax_cents);
  if (lines.length > 1) return lines.map((t) => ({ k: `${label} (${pct(t.rate_bp)})`, v: t.tax_cents }));
  return [{ k: lines[0] ? `${label} (${pct(lines[0].rate_bp)})` : label, v: inv.tax_cents || 0 }];
}

function Row({ k, v, strong, big }) {
  return (
    <div className="row between" style={{ fontWeight: strong ? 700 : 400, fontSize: big ? 16 : undefined }}>
      <span className={strong ? "" : "muted"}>{k}</span>
      <span className="num">{v < 0 ? `−${money(-v)}` : money(v)}</span>
    </div>
  );
}

const CSS = `
.toast { bottom: 132px; }
.pi-logo { width: 38px; height: 38px; border-radius: 10px; background: var(--brand); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 18px; flex: none; }
.pi-mini { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); }
.pi-state { padding: 28px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
.pi-ico { width: 64px; height: 64px; border-radius: 50%; background: var(--green); color: #fff; display: grid; place-items: center; font-size: 30px; font-weight: 800; margin-bottom: 4px; }
.pi-ico.pop { animation: pi-pop .4s ease-out; }
@keyframes pi-pop { from { transform: scale(.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
.pi-big { font-size: 40px; font-weight: 750; letter-spacing: -.02em; }
.pi-ref { background: var(--surface-2); border-radius: 99px; padding: 5px 12px; font-size: 13px; font-weight: 600; }
.pi-due { padding: 24px 18px; text-align: center; display: flex; flex-direction: column; gap: 6px; background: linear-gradient(180deg, var(--brand-soft), var(--surface)); }
.pi-sec { display: flex; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.pi-lines { padding: 6px 16px; }
.pi-line { display: flex; gap: 12px; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--line); }
.pi-line:last-child { border-bottom: 0; }
.pi-tot { padding: 12px 16px 14px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 6px; }
`;

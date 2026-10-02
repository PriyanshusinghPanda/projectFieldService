// Customer quote link (/q/:token): compare options, sign by typing a name, approve, pay the deposit. No login.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Modal, Money, useToast } from "../../components/ui";
import { api } from "../../lib/api";
import { day, localISODate, money, setCurrency } from "../../lib/format";
import { useApi } from "../../lib/useApi";

// brand colour → CSS variables for this page
function tint(hex, a) {
  let h = String(hex || "#0b5cff").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const mixc = (c) => Math.round(255 - (255 - c) * a);
  return `rgb(${mixc((n >> 16) & 255)}, ${mixc((n >> 8) & 255)}, ${mixc(n & 255)})`;
}
const brandVars = (c) => ({ "--brand": c || "#0b5cff", "--brand-soft": tint(c, 0.1) });
const telUrl = (p) => `tel:${String(p || "").replace(/[^0-9+]/g, "")}`;

function stagesText(stages, total) {
  const s = stages?.length ? stages : [100];
  if (s.length === 1) return [{ label: "Pay in full when the job is done", amount: total }];
  const names = s.length === 2 ? ["to get started", "on completion"] : ["to get started", ...s.slice(1, -1).map(() => "midway"), "on completion"];
  let left = total;
  return s.map((p, i) => {
    const amt = i === s.length - 1 ? left : Math.round((total * p) / 100);
    left -= amt;
    return { label: `${p}% ${names[i]}`, amount: amt };
  });
}

function BrandHead({ org, sub }) {
  return (
    <div className="phone-head qa-head">
      <span className="qa-logo">{org?.brand?.short || (org?.name || "?")[0]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 650 }}>{org?.name}</div>
        <div className="muted small">{sub || "Your quote"}</div>
      </div>
      {org?.phone && <a className="btn sm" href={telUrl(org.phone)}>Call</a>}
    </div>
  );
}

export default function QuoteApprove() {
  const { token } = useParams();
  const { data: q, error, loading, reload } = useApi(`/api/public/quotes/${token}`);
  const toast = useToast();
  const [pick, setPick] = useState(null);
  const [signing, setSigning] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // approve response
  const [depositPaid, setDepositPaid] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!q) return;
    setCurrency(q.org?.currency);
    if (!pick) setPick((q.options.find((o) => o.recommended) || q.options[0])?.id || null);
    document.title = `${q.number} · ${q.org?.name || "Quote"}`;
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !q) return <Shell><div className="empty">Loading your quote…</div></Shell>;
  if (error) {
    return (
      <Shell>
        <div className="card qa-state">
          <div className="qa-ico grey">?</div>
          <h2>{error.status === 404 ? "This link isn't valid anymore" : "Couldn't load your quote"}</h2>
          <div className="muted">{error.status === 404 ? "It may have been replaced by a newer quote. Please contact the business for an updated link." : error.message}</div>
          {error.status !== 404 && <Button onClick={reload}>Try again</Button>}
        </div>
      </Shell>
    );
  }

  const org = q.org;
  const first = (q.customer?.name || "").split(" ")[0];
  const expired = ["draft", "sent", "viewed"].includes(q.status) && q.expires_on && q.expires_on < localISODate();
  const chosen = q.options.find((o) => o.id === (result ? result.quote.chosen_option_id : q.chosen_option_id));
  const selected = q.options.find((o) => o.id === pick);

  const approve = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api.post(`/api/public/quotes/${token}/approve`, { option_id: pick, signature_name: name.trim() });
      setResult(r);
      setSigning(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  const payDeposit = async (amount) => {
    setBusy(true);
    try {
      await api.post("/api/public/pay", { for: "deposit", token, amount_cents: amount });
      setDepositPaid(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { toast(e, true); } finally { setBusy(false); }
  };

  // ----- approved (just now, or on a later visit) -----
  if (result || q.status === "approved") {
    const dq = result ? result.quote : q;
    const due = result?.deposit_link?.amount_cents ?? Math.max(0, (dq.deposit_due_cents || 0) - (dq.deposit_paid_cents || 0));
    const paidNow = depositPaid || (dq.deposit_due_cents > 0 && dq.deposit_paid_cents >= dq.deposit_due_cents);
    return (
      <Shell org={org}>
        <div className="card qa-state">
          <div className="qa-ico green">✓</div>
          <h1 style={{ fontSize: 22 }}>{result ? `Thanks, ${first}! You're all set` : "You approved this quote"}</h1>
          <div className="muted">
            {chosen ? <>You chose <b style={{ color: "var(--ink)" }}>{chosen.name}</b> for <Money cents={chosen.totals.total_cents} />.</> : "Your approval is on file."}
          </div>
          {result?.job_number && <div className="qa-ref">Job number <b>{result.job_number}</b></div>}
        </div>

        {due > 0 && !paidNow && (
          <div className="card" style={{ padding: 18 }}>
            <div className="qa-mini">Next step</div>
            <h2 style={{ marginTop: 4 }}>Pay your deposit to lock in the job</h2>
            <div className="muted" style={{ marginTop: 4 }}>The deposit comes off your final invoice.</div>
            <Button variant="primary" size="lg" block disabled={busy} onClick={() => payDeposit(due)} style={{ marginTop: 14, height: 54 }}>
              {busy ? "Processing…" : `Pay deposit ${money(due)}`}
            </Button>
            <div className="muted small" style={{ textAlign: "center", marginTop: 8 }}>Secure checkout (demo, no card needed)</div>
          </div>
        )}
        {paidNow && (
          <div className="card qa-state" style={{ background: "var(--green-soft)", borderColor: "transparent" }}>
            <h2 style={{ color: "var(--green)" }}>Deposit paid{depositPaid ? ` · ${money(due)}` : ""}</h2>
            <div style={{ color: "var(--green)" }}>We'll be in touch shortly to book your installation date.</div>
          </div>
        )}
        {(due <= 0 && !paidNow) && (
          <div className="card qa-state"><div className="muted">No deposit needed. We'll be in touch shortly to book a time that works for you.</div></div>
        )}
        <WhatsNext org={org} />
      </Shell>
    );
  }

  if (q.status === "declined") {
    return (
      <Shell org={org}>
        <div className="card qa-state">
          <div className="qa-ico grey">✕</div>
          <h2>You declined this quote</h2>
          <div className="muted">Changed your mind or have questions? We're happy to help.</div>
          {org?.phone && <a className="btn primary lg" href={telUrl(org.phone)}>Call {org.phone}</a>}
        </div>
      </Shell>
    );
  }

  if (expired) {
    return (
      <Shell org={org}>
        <div className="card qa-state">
          <div className="qa-ico amber">!</div>
          <h2>This quote expired on {day(q.expires_on)}</h2>
          <div className="muted">Prices may have changed. Give us a call and we'll send you an updated quote.</div>
          {org?.phone && <a className="btn primary lg" href={telUrl(org.phone)}>Call {org.phone}</a>}
        </div>
      </Shell>
    );
  }

  // ----- choose + sign -----
  return (
    <Shell org={org}>
      <div style={{ padding: "4px 2px" }}>
        <div className="qa-mini">{q.number} · {q.title}</div>
        <h1 style={{ fontSize: 24, marginTop: 6 }}>Hi {first}, here {q.options.length > 1 ? "are your options" : "is your quote"}</h1>
        <div className="muted" style={{ marginTop: 6 }}>
          {q.options.length > 1 ? "Pick the option that suits you best, then sign below." : "Review the details, then sign below."} Valid until {day(q.expires_on)}.
        </div>
      </div>

      {q.member_pricing && <div className="callout small">Member pricing applied to eligible items.</div>}

      {q.options.map((o) => (
        <OptionCard key={o.id} o={o} on={pick === o.id} onPick={() => setPick(o.id)} single={q.options.length === 1} />
      ))}

      {q.notes && <div className="card" style={{ padding: 14 }}><div className="qa-mini">Notes</div><div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{q.notes}</div></div>}

      <button className="qa-decline" onClick={() => setDeclineOpen(true)}>Not right now? Decline this quote</button>

      <div className="phone-foot">
        <Button variant="primary" size="lg" block disabled={!selected} onClick={() => setSigning(true)} style={{ height: 54 }}>
          {selected ? `Approve ${selected.name} · ${money(selected.totals.total_cents)}` : "Choose an option"}
        </Button>
      </div>

      {signing && selected && (
        <Modal title="Sign to approve" onClose={() => setSigning(false)}
          footer={<Button variant="primary" block disabled={busy || name.trim().length < 3} onClick={approve} style={{ height: 46 }}>{busy ? "Approving…" : "Approve and sign"}</Button>}>
          <div className="col">
            <div className="qa-sum">
              <div style={{ flex: 1 }}><div style={{ fontWeight: 650 }}>{selected.name}</div><div className="muted small">{q.title}</div></div>
              <b className="num"><Money cents={selected.totals.total_cents} /></b>
            </div>
            <label className="field">Type your full name to sign
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={q.customer?.name} style={{ height: 46, fontSize: 16 }} />
            </label>
            <div className="qa-sigbox">{name.trim() ? <span className="qa-sig">{name}</span> : <span className="muted">Your signature appears here</span>}</div>
            <div className="muted small">By signing you approve the work and price above{stagesText(selected.stages, selected.totals.total_cents).length > 1 ? " and the payment schedule" : ""}. {org?.name} will contact you to schedule.</div>
            {err && <div className="err-box">{err.message}</div>}
          </div>
        </Modal>
      )}
      {declineOpen && <Decline token={token} onClose={() => setDeclineOpen(false)} onDone={() => { setDeclineOpen(false); reload(); }} />}
    </Shell>
  );
}

function Shell({ org, children }) {
  return (
    <div className="phone" style={brandVars(org?.brand?.color)}>
      <style>{CSS}</style>
      {org && <BrandHead org={org} />}
      <div className="phone-body" style={{ paddingBottom: 110 }}>{children}</div>
    </div>
  );
}

function OptionCard({ o, on, onPick, single }) {
  const included = o.lines.filter((l) => !l.optional);
  const optional = o.lines.filter((l) => l.optional);
  const stages = stagesText(o.stages, o.totals.total_cents);
  return (
    <div className={`card qa-opt ${on ? "on" : ""}`} onClick={onPick} role="radio" aria-checked={on} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onPick()}>
      {o.recommended && <div className="qa-rec">★ Recommended</div>}
      <div style={{ padding: 16 }}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          {!single && <span className={`qa-radio ${on ? "on" : ""}`} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 18 }}>{o.name}</h2>
            {o.description && <div className="muted" style={{ marginTop: 4 }}>{o.description}</div>}
          </div>
        </div>
        <div className="qa-price num">{money(o.totals.total_cents)}</div>
        <div className="muted small">incl. {money(o.totals.tax_cents)} {o.totals.tax_label?.toLowerCase() || "tax"}</div>
      </div>
      <div className="qa-lines">
        {included.map((l, i) => (
          <div key={i} className="qa-line">
            <span className="qa-tick">✓</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {l.name}{l.qty > 1 && <span className="muted"> × {l.qty}</span>}
              {l.member_price_applied && <span className="pill green" style={{ marginLeft: 6 }}>Member price</span>}
            </div>
            <span className="num muted">{money(l.total_cents)}</span>
          </div>
        ))}
        {optional.map((l, i) => (
          <div key={`o${i}`} className="qa-line" style={{ opacity: 0.75 }}>
            <span className="qa-tick" style={{ color: "var(--ink-3)" }}>+</span>
            <div style={{ flex: 1, minWidth: 0 }}>{l.name} <span className="muted small">· optional add-on, not included</span></div>
            <span className="num muted">{money(l.total_cents)}</span>
          </div>
        ))}
        <div className="qa-line" style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 4 }}>
          <span style={{ flex: 1 }} className="muted">Subtotal</span><span className="num">{money(o.totals.subtotal_cents)}</span>
        </div>
        <div className="qa-line"><span style={{ flex: 1 }} className="muted">{o.totals.tax_label || "Tax"}</span><span className="num">{money(o.totals.tax_cents)}</span></div>
        <div className="qa-line" style={{ fontWeight: 700 }}><span style={{ flex: 1 }}>Total</span><span className="num">{money(o.totals.total_cents)}</span></div>
      </div>
      <div className="qa-stages">
        <div className="qa-mini" style={{ marginBottom: 6 }}>How you pay</div>
        {stages.map((s, i) => (
          <div key={i} className="row between small"><span>{s.label}</span><span className="num">{money(s.amount)}</span></div>
        ))}
      </div>
    </div>
  );
}

function Decline({ token, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await api.post(`/api/public/quotes/${token}/decline`, { reason }); onDone(); } catch (e) { toast(e, true); } finally { setBusy(false); }
  };
  return (
    <Modal title="Decline this quote?" onClose={onClose}
      footer={<><Button onClick={onClose}>Keep it</Button><Button variant="danger" onClick={go} disabled={busy}>{busy ? "Sending…" : "Decline quote"}</Button></>}>
      <div className="col">
        <div className="muted">No problem. Mind telling us why? It helps us do better (optional).</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {["Price is too high", "Going with someone else", "Not doing the work now"].map((r) => (
            <button key={r} className={`qa-chip ${reason === r ? "on" : ""}`} onClick={() => setReason(reason === r ? "" : r)}>{r}</button>
          ))}
        </div>
        <textarea rows={3} placeholder="Anything else?" value={["Price is too high", "Going with someone else", "Not doing the work now"].includes(reason) ? "" : reason}
          onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  );
}

function WhatsNext({ org }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="qa-mini" style={{ marginBottom: 10 }}>What happens next</div>
      {["We'll call or text you to pick an install date.", "Your technician texts you when they're on the way.", "Pay the balance by card when the job is done."].map((t, i) => (
        <div key={i} className="row" style={{ alignItems: "flex-start", marginBottom: 8 }}>
          <span className="qa-num">{i + 1}</span><span>{t}</span>
        </div>
      ))}
      {org?.phone && <div className="muted small" style={{ marginTop: 6 }}>Questions? Call <a href={telUrl(org.phone)}>{org.phone}</a></div>}
    </div>
  );
}

const CSS = `
.toast { bottom: 132px; }
.qa-head { gap: 12px; }
.qa-logo { width: 38px; height: 38px; border-radius: 10px; background: var(--brand); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 18px; flex: none; }
.qa-mini { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); }
.qa-opt { overflow: hidden; cursor: pointer; border: 2px solid var(--line); transition: border-color .15s, box-shadow .15s; }
.qa-opt.on { border-color: var(--brand); box-shadow: 0 6px 22px rgba(16,24,40,.10); }
.qa-rec { background: var(--brand); color: #fff; font-size: 12px; font-weight: 700; padding: 6px 16px; letter-spacing: .02em; }
.qa-radio { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line-2); flex: none; margin-top: 1px; display: grid; place-items: center; }
.qa-radio.on { border-color: var(--brand); }
.qa-radio.on::after { content: ""; width: 11px; height: 11px; border-radius: 50%; background: var(--brand); }
.qa-price { font-size: 30px; font-weight: 750; letter-spacing: -.02em; margin-top: 12px; }
.qa-lines { padding: 12px 16px; border-top: 1px solid var(--line); background: var(--surface); display: flex; flex-direction: column; gap: 6px; }
.qa-line { display: flex; align-items: baseline; gap: 10px; }
.qa-tick { color: var(--green); font-weight: 800; width: 14px; flex: none; }
.qa-stages { padding: 12px 16px 14px; background: var(--brand-soft); display: flex; flex-direction: column; gap: 4px; }
.qa-decline { background: none; border: 0; color: var(--ink-3); text-decoration: underline; font: inherit; padding: 10px; cursor: pointer; }
.qa-state { padding: 26px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
.qa-ico { width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; font-size: 28px; font-weight: 800; margin-bottom: 4px; }
.qa-ico.green { background: var(--green); color: #fff; }
.qa-ico.grey { background: var(--surface-2); color: var(--ink-3); }
.qa-ico.amber { background: var(--amber-soft); color: var(--amber); }
.qa-ref { margin-top: 6px; background: var(--surface-2); border-radius: 99px; padding: 6px 14px; }
.qa-sum { display: flex; align-items: center; gap: 10px; background: var(--brand-soft); border-radius: 10px; padding: 12px 14px; }
.qa-sigbox { height: 74px; border: 1px dashed var(--line-2); border-radius: 10px; display: grid; place-items: center; background: #fff; overflow: hidden; }
.qa-sig { font-family: "Brush Script MT", "Segoe Script", "Snell Roundhand", cursive; font-size: 34px; color: #1e3a8a; white-space: nowrap; }
.qa-chip { border: 1px solid var(--line-2); background: var(--surface); border-radius: 99px; padding: 8px 13px; font: inherit; cursor: pointer; color: var(--ink); }
.qa-chip.on { background: var(--brand); border-color: var(--brand); color: #fff; }
.qa-num { width: 22px; height: 22px; border-radius: 50%; background: var(--brand-soft); color: var(--brand); display: grid; place-items: center; font-size: 12px; font-weight: 700; flex: none; }
`;

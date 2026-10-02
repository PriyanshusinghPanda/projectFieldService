// Customer portal (/portal/:token): what needs doing, membership, equipment, visit history, contact. No login.
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Status } from "../../components/ui";
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
const ACTIVE_VISIT = ["scheduled", "en_route", "on_site", "in_progress"];

export default function Portal() {
  const { token } = useParams();
  const { data: p, error, loading, reload } = useApi(`/api/public/portal/${token}`);

  useEffect(() => {
    if (!p) return;
    setCurrency(p.org?.currency);
    document.title = `Your account · ${p.org?.name || ""}`;
  }, [p]);

  const org = p?.org;
  const shell = (children) => (
    <div className="phone" style={{ "--brand": org?.brand?.color || "#0b5cff", "--brand-soft": tint(org?.brand?.color, 0.1) }}>
      <style>{CSS}</style>
      {org && (
        <div className="phone-head" style={{ gap: 12 }}>
          <span className="po-logo">{org.brand?.short || org.name[0]}</span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 650 }}>{org.name}</div><div className="muted small">Customer portal</div></div>
          {org.phone && <a className="btn sm" href={telUrl(org.phone)}>Call</a>}
        </div>
      )}
      <div className="phone-body">{children}</div>
    </div>
  );

  if (loading && !p) return shell(<div className="empty">Loading your account…</div>);
  if (error) {
    return shell(
      <div className="card" style={{ padding: 28, textAlign: "center" }} >
        <h2>{error.status === 404 ? "This link isn't valid" : "Couldn't load your account"}</h2>
        <div className="muted" style={{ marginTop: 6 }}>{error.status === 404 ? "Ask the business to send you a fresh portal link." : error.message}</div>
        {error.status !== 404 && <Button onClick={reload} style={{ marginTop: 12 }}>Try again</Button>}
      </div>
    );
  }

  const first = (p.customer?.name || "").split(" ")[0];
  const today = localISODate();
  const unpaid = p.invoices.filter((i) => i.balance_cents > 0 && i.status !== "void");
  const owed = unpaid.reduce((s, i) => s + i.balance_cents, 0);
  const toApprove = p.quotes.filter((q) => ["sent", "viewed"].includes(q.status));
  const approved = p.quotes.filter((q) => q.status === "approved");
  const nextVisit = p.visits.filter((v) => ACTIVE_VISIT.includes(v.status)).sort((a, b) => a.date.localeCompare(b.date))[0];
  const history = [...p.visits].sort((a, b) => b.date.localeCompare(a.date));
  const paidInvoices = p.invoices.filter((i) => !(i.balance_cents > 0 && i.status !== "void"));
  const todo = unpaid.length + toApprove.length;
  const activePlan = p.memberships.find((m) => m.status === "active");

  return shell(
    <>
      <div className="po-hero">
        <h1 style={{ fontSize: 24 }}>Hi {first}</h1>
        <div className="muted" style={{ marginTop: 4 }}>
          {todo ? `You have ${todo} thing${todo === 1 ? "" : "s"} to take care of.` : "You're all caught up. Thanks for choosing us!"}
        </div>
        {activePlan && <span className="po-member">★ {activePlan.plan} member</span>}
      </div>

      {nextVisit && (
        <Link to={`/track/${token}`} className="card po-next">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="po-mini" style={{ color: "var(--brand)" }}>{nextVisit.date === today ? "Today" : "Upcoming visit"}</div>
            <div style={{ fontWeight: 650, marginTop: 2 }}>{nextVisit.title}</div>
            <div className="muted small">{day(nextVisit.date)} · Track your technician</div>
          </div>
          <Status s={nextVisit.status} />
          <span className="muted" aria-hidden>›</span>
        </Link>
      )}

      <Section title="To do" right={owed > 0 && <span className="pill amber">{money(owed)} due</span>}>
        {todo === 0 && <div className="po-row"><span className="po-check">✓</span><span className="muted">Nothing needs your attention.</span></div>}
        {unpaid.map((i) => {
          const overdue = i.due_on && i.due_on < today;
          return (
            <div key={i.number} className="po-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>Pay invoice {i.number}</div>
                <div className={`small ${overdue ? "" : "muted"}`} style={overdue ? { color: "var(--red)" } : undefined}>
                  {money(i.balance_cents)} · {overdue ? "overdue since" : "due"} {day(i.due_on)}
                </div>
              </div>
              <Link to={`/pay/${i.token}`} className="btn primary">Pay</Link>
            </div>
          );
        })}
        {toApprove.map((q) => (
          <div key={q.number} className="po-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>Review quote {q.number}</div>
              <div className="muted small">{q.title}</div>
            </div>
            <Link to={`/q/${q.token}`} className="btn primary">Review</Link>
          </div>
        ))}
      </Section>

      <Section title="Membership">
        {p.memberships.length ? p.memberships.map((m, i) => (
          <div key={i} className="po-row">
            <span className="po-badge">★</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{m.plan}</div><div className="muted small">{m.status === "active" ? "Priority service and member pricing" : m.status === "paused" ? "Paused for now" : "Not active"}</div></div>
            <Status s={m.status} />
          </div>
        )) : (
          <div className="po-row">
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Not a member yet</div>
              <div className="muted small">Members get yearly tune-ups, priority booking and member pricing. Ask us about our plans.</div>
            </div>
            {org.phone && <a className="btn" href={telUrl(org.phone)}>Ask</a>}
          </div>
        )}
      </Section>

      {approved.length > 0 && (
        <Section title="Approved quotes">
          {approved.map((q) => (
            <Link key={q.number} to={`/q/${q.token}`} className="po-row po-link">
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>{q.title}</div><div className="muted small">{q.number}</div></div>
              <Status s={q.status} /><span className="muted">›</span>
            </Link>
          ))}
        </Section>
      )}

      <Section title="Your equipment">
        {p.equipment.length === 0 ? <div className="po-row muted">We'll list your systems here after our first visit.</div> : p.equipment.map((e, i) => {
          const age = e.installed_on ? new Date().getFullYear() - Number(e.installed_on.slice(0, 4)) : null;
          return (
            <div key={i} className="po-row">
              <span className="po-badge" style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}>{eqIcon(e.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{e.type}</div>
                <div className="muted small">{[e.make, e.model].filter(Boolean).join(" ")}{e.installed_on ? ` · installed ${e.installed_on.slice(0, 4)}` : ""}</div>
              </div>
              {age != null && <span className="muted small">{age} yr{age === 1 ? "" : "s"}</span>}
            </div>
          );
        })}
      </Section>

      <Section title="Visit history">
        {history.length === 0 ? <div className="po-row muted">No visits yet.</div> : history.slice(0, 12).map((v, i) => (
          <div key={i} className="po-row">
            <div className="po-date"><b>{v.date ? new Date(v.date + "T12:00:00").getDate() : "–"}</b><span>{v.date ? new Date(v.date + "T12:00:00").toLocaleDateString([], { month: "short" }) : ""}</span></div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>{v.title}</div><div className="muted small">{v.date ? new Date(v.date + "T12:00:00").getFullYear() : "Not scheduled yet"}</div></div>
            <Status s={v.status} />
          </div>
        ))}
      </Section>

      {paidInvoices.length > 0 && (
        <Section title="Receipts">
          {paidInvoices.slice(0, 10).map((i) => (
            <Link key={i.number} to={`/pay/${i.token}`} className="po-row po-link">
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{i.number}</div><div className="muted small">{i.status === "void" ? "Cancelled" : "Paid"}</div></div>
              <span className="num">{money(i.total_cents)}</span><span className="muted">›</span>
            </Link>
          ))}
        </Section>
      )}

      <div className="card po-contact">
        <h2>Need something?</h2>
        <div className="muted">Call or text {org.name} and we'll get you sorted.</div>
        {org.phone && (
          <div className="grid g2" style={{ gap: 10, marginTop: 6 }}>
            <a className="btn primary lg" href={telUrl(org.phone)}>Call</a>
            <a className="btn lg" href={`sms:${String(org.phone).replace(/[^0-9+]/g, "")}`}>Text</a>
          </div>
        )}
        {org.phone && <div className="muted small">{org.phone}</div>}
      </div>
    </>
  );
}

function eqIcon(type = "") {
  const t = type.toLowerCase();
  const d = t.includes("water") ? "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"
    : t.includes("furnace") || t.includes("boiler") ? "M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5 .8 1.5 1.5 2 2.5 2C11 7.5 11 5 12 3z"
    : t.includes("ac") || t.includes("air") || t.includes("heat pump") ? "M12 2v20M4 7l16 10M4 17L20 7M9 4l3 2 3-2M9 20l3-2 3 2"
    : t.includes("panel") || t.includes("charger") || t.includes("electric") ? "M13 2L5 14h6l-1 8 8-12h-6z"
    : "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1";
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

function Section({ title, right, children }) {
  return (
    <section className="card">
      <div className="po-sec"><h2>{title}</h2><div className="spacer" />{right}</div>
      {children}
    </section>
  );
}

const CSS = `
.po-logo { width: 38px; height: 38px; border-radius: 10px; background: var(--brand); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 18px; flex: none; }
.po-mini { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); }
.po-hero { padding: 6px 4px 2px; }
.po-member { display: inline-block; margin-top: 10px; background: var(--brand); color: #fff; font-weight: 650; font-size: 12.5px; padding: 5px 12px; border-radius: 99px; }
.po-next { display: flex; align-items: center; gap: 12px; padding: 14px 16px; color: inherit; border-left: 4px solid var(--brand); }
.po-sec { display: flex; align-items: center; gap: 10px; padding: 14px 16px 6px; }
.po-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--line); min-height: 56px; color: inherit; }
.po-sec + .po-row { border-top: 0; }
.po-link:active { background: var(--surface-2); }
.po-row .btn { height: 40px; padding: 0 18px; }
.po-check { width: 26px; height: 26px; border-radius: 50%; background: var(--green-soft); color: var(--green); display: grid; place-items: center; font-weight: 800; flex: none; }
.po-badge { width: 36px; height: 36px; border-radius: 10px; background: var(--brand-soft); color: var(--brand); display: grid; place-items: center; font-size: 17px; flex: none; }
.po-date { width: 40px; flex: none; display: flex; flex-direction: column; align-items: center; line-height: 1.1; background: var(--surface-2); border-radius: 8px; padding: 5px 0; }
.po-date b { font-size: 16px; }
.po-date span { font-size: 11px; color: var(--ink-3); text-transform: uppercase; }
.po-contact { padding: 18px 16px; display: flex; flex-direction: column; gap: 4px; text-align: center; }
`;

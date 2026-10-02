import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Empty, ErrorBox, Field, Loading, Modal, Money, PageHead, Pill, Status, Tile, useToast } from "../components/ui";
import { api } from "../lib/api";
import { day, money, toCents } from "../lib/format";
import { useApi } from "../lib/useApi";

const Group = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}>{label}{children}</div>
);
const monthly = (p) => (p.interval === "year" ? p.price_cents / 12 : p.price_cents);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function PlanModal({ plan, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    name: plan?.name || "", price: plan ? (plan.price_cents / 100).toFixed(2) : "", interval: plan?.interval || "month",
    visits_per_year: plan?.visits_per_year ?? 2, perks: (plan?.perks || []).join("\n"), visit_title: plan?.visit_title || "",
    active: plan?.active ?? true,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const save = async () => {
    setBusy(true); setError(null);
    const body = {
      name: f.name.trim(), price_cents: toCents(f.price), interval: f.interval, visits_per_year: Number(f.visits_per_year) || 0,
      perks: f.perks.split("\n").map((x) => x.trim()).filter(Boolean), active: f.active,
      ...(f.visit_title.trim() ? { visit_title: f.visit_title.trim() } : {}),
    };
    try {
      if (plan) await api.patch(`/api/plans/${plan.id}`, body); else await api.post("/api/plans", body);
      toast(plan ? `${body.name} updated` : `${body.name} created — ready to sell`);
      onSaved(); onClose();
    } catch (e) { setError(e); setBusy(false); }
  };
  return (
    <Modal title={plan ? `Edit ${plan.name}` : "New plan"} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !f.name.trim()} onClick={save}>{busy ? "Saving…" : plan ? "Save plan" : "Create plan"}</Button></>}>
      <Field label="Plan name"><input value={f.name} onChange={set("name")} placeholder="e.g. Home Comfort Plan" autoFocus /></Field>
      <div className="grid g3">
        <Field label="Price">
          <div style={{ position: "relative" }}>
            <span className="muted" style={{ position: "absolute", left: 10, top: 8 }}>$</span>
            <input inputMode="decimal" value={f.price} onChange={set("price")} style={{ paddingLeft: 22 }} placeholder="19.00" />
          </div>
        </Field>
        <Field label="Billed"><select value={f.interval} onChange={set("interval")}><option value="month">Monthly</option><option value="year">Yearly</option></select></Field>
        <Field label="Visits per year"><input type="number" min="0" max="12" value={f.visits_per_year} onChange={set("visits_per_year")} /></Field>
      </div>
      <Field label="Visit name (shown on the job)"><input value={f.visit_title} onChange={set("visit_title")} placeholder={`${f.name || "Plan"} visit`} /></Field>
      <Field label="Perks (one per line)"><textarea value={f.perks} onChange={set("perks")} rows={4} placeholder={"2 tune-ups a year\n15% off repairs\nPriority booking"} /></Field>
      {plan && <label className="check small"><input type="checkbox" checked={f.active} onChange={set("active")} /> Available to sell</label>}
      <ErrorBox error={error} />
    </Modal>
  );
}

function SellModal({ plans, onClose, onDone }) {
  const toast = useToast();
  const customers = useApi("/api/customers");
  const [customerId, setCustomerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const detail = useApi(customerId ? `/api/customers/${customerId}` : null, [customerId]);
  const sites = customerId ? detail.data?.sites || [] : [];
  useEffect(() => { setSiteId(sites[0]?.id || ""); }, [detail.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = plans.find((p) => p.id === planId);
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.post("/api/memberships", { plan_id: planId, customer_id: customerId, site_id: siteId || undefined });
      const name = customers.data?.find((c) => c.id === customerId)?.name;
      toast(`${name} is on ${plan?.name} — ${plural(r.visits_created, "visit")} booked into Unscheduled`);
      onDone(); onClose();
    } catch (e) { setError(e); setBusy(false); }
  };
  return (
    <Modal title="Sell a plan" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !customerId || !planId} onClick={save}>{busy ? "Signing up…" : plan ? `Sign up · ${money(plan.price_cents)}/${plan.interval === "year" ? "yr" : "mo"}` : "Sign up"}</Button></>}>
      <Field label="Customer">
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={customers.loading}>
          <option value="">{customers.loading ? "Loading customers…" : "Choose a customer"}</option>
          {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.member ? " · already a member" : ""}</option>)}
        </select>
      </Field>
      <ErrorBox error={customers.error} />
      {customerId && (
        <Field label="Site">
          {detail.loading ? <div className="muted small">Loading sites…</div> : sites.length ? (
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.label ? `${s.label} · ` : ""}{s.address}, {s.city}</option>)}
            </select>
          ) : <div className="muted small">No site on file — visits will be booked without an address.</div>}
        </Field>
      )}
      <Group label="Plan">
        <div className="col" style={{ gap: 6 }}>
          {plans.map((p) => (
            <label key={p.id} className="check" style={{ border: `1px solid ${p.id === planId ? "var(--brand)" : "var(--line)"}`, background: p.id === planId ? "var(--brand-soft)" : "var(--surface)", borderRadius: 8, padding: "8px 10px" }}>
              <input type="radio" name="plan" checked={p.id === planId} onChange={() => setPlanId(p.id)} />
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
              <span className="muted small">{plural(p.visits_per_year, "visit")}/yr</span>
              <span className="spacer" />
              <span className="num" style={{ color: "var(--ink)" }}>{money(p.price_cents)}/{p.interval === "year" ? "yr" : "mo"}</span>
            </label>
          ))}
        </div>
      </Group>
      <ErrorBox error={error} />
    </Modal>
  );
}

export default function Plans() {
  const plans = useApi("/api/plans");
  const ms = useApi("/api/memberships");
  const unsched = useApi("/api/jobs?unscheduled=true");
  const [editing, setEditing] = useState(null); // plan object or "new"
  const [selling, setSelling] = useState(false);

  const allPlans = plans.data || [];
  const activePlans = allPlans.filter((p) => p.active !== false);
  const stats = useMemo(() => {
    const members = allPlans.reduce((s, p) => s + (p.members || 0), 0);
    const mrr = Math.round(allPlans.reduce((s, p) => s + monthly(p) * (p.members || 0), 0));
    const toBook = (unsched.data || []).filter((j) => j.source === "plan").length;
    return { members, mrr, toBook };
  }, [allPlans, unsched.data]);

  const reloadAll = () => { plans.reload(); ms.reload(); unsched.reload(); };

  const dash = (x) => (plans.loading && !plans.data ? "…" : x);
  return (
    <div className="page">
      <PageHead title="Plans & memberships" sub="Recurring revenue that books its own visits">
        <Button onClick={() => setEditing("new")}>+ New plan</Button>
        <Button variant="primary" onClick={() => setSelling(true)} disabled={!activePlans.length}>Sell a plan</Button>
      </PageHead>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Tile k="Active members" v={dash(stats.members)} s={`on ${plural(activePlans.length, "plan")}`} />
        <Tile k="Monthly recurring revenue" v={dash(<Money cents={stats.mrr} />)} s={dash(`${money(stats.mrr * 12)} a year`)} />
        <Tile k="Plan visits to book" v={unsched.loading && !unsched.data ? "…" : stats.toBook} s={<Link to="/schedule">Open Schedule → Unscheduled</Link>} />
        <Tile k="Memberships" v={ms.loading && !ms.data ? "…" : (ms.data || []).length} s="sold to date" />
      </div>

      <div className="callout" style={{ marginBottom: 16 }}>
        <b>Plans book their own visits.</b> Selling a plan creates its upcoming visits. They appear in <Link to="/schedule">Schedule → Unscheduled</Link>, ready to drag onto a technician.
      </div>

      {plans.error ? <ErrorBox error={plans.error} /> : plans.loading && !plans.data ? <Loading /> : !allPlans.length ? (
        <Card><Empty>No plans yet. Create your first maintenance plan to start earning recurring revenue.<div style={{ marginTop: 12 }}><Button variant="primary" onClick={() => setEditing("new")}>+ New plan</Button></div></Empty></Card>
      ) : (
        <div className="grid g3" style={{ marginBottom: 18 }}>
          {allPlans.map((p) => (
            <div key={p.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, opacity: p.active === false ? 0.65 : 1 }}>
              <div className="row" style={{ alignItems: "flex-start" }}>
                <div>
                  <h2>{p.name}</h2>
                  <div className="muted small" style={{ marginTop: 3 }}>{plural(p.visits_per_year, "visit")} a year{p.trade ? ` · ${p.trade}` : ""}</div>
                </div>
                <div className="spacer" />
                {p.active === false ? <Pill tone="grey">Not selling</Pill> : <Pill tone={p.members ? "green" : "grey"}>{plural(p.members || 0, "member")}</Pill>}
              </div>
              <div>
                <span className="num" style={{ fontSize: 26, fontWeight: 700 }}>{money(p.price_cents)}</span>
                <span className="muted"> / {p.interval === "year" ? "year" : "month"}</span>
                {p.members > 0 && <div className="muted small">{money(Math.round(monthly(p) * p.members))} per month from this plan</div>}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                {(p.perks || []).map((perk) => (
                  <li key={perk} className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span><span>{perk}</span>
                  </li>
                ))}
                {!p.perks?.length && <li className="muted small">No perks listed</li>}
              </ul>
              <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <Button size="sm" onClick={() => setEditing(p)}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card title="Memberships" pad={false} actions={ms.data && <span className="muted small">{ms.data.length} total</span>}>
        {ms.error ? <div className="card-body"><ErrorBox error={ms.error} /></div> : ms.loading && !ms.data ? <Loading /> : !ms.data.length ? (
          <Empty>No members yet. Use “Sell a plan” to sign up your first customer.</Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="t">
              <thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th>Started</th><th>Autopay</th></tr></thead>
              <tbody>
                {ms.data.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 550 }}><Link to={`/customers/${m.customer_id}`} style={{ color: "var(--ink)" }}>{m.customer_name}</Link></td>
                    <td>{m.plan_name}</td>
                    <td><Status s={m.status} /></td>
                    <td className="muted">{day(m.started_on)}</td>
                    <td className="muted small">{m.autopay ? "On" : "Off"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <PlanModal plan={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={plans.reload} />}
      {selling && <SellModal plans={activePlans} onClose={() => setSelling(false)} onDone={reloadAll} />}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Card, Empty, ErrorBox, Field, Loading, Modal, Money, PageHead, Pill, Status, useToast } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ago, day, money } from "../lib/format";
import { useApi } from "../lib/useApi";

const OPTION_NAMES = ["Good", "Better", "Best"];
const JOB_TYPES = [["repair", "Repair"], ["maintenance", "Tune-up / maintenance"], ["install", "Install / replacement"], ["estimate", "Estimate visit"]];
const TRADES = [["hvac", "HVAC"], ["plumbing", "Plumbing"], ["electrical", "Electrical"]];
const CATEGORIES = [["", "All"], ["repair", "Repair"], ["maintenance", "Maintenance"], ["install", "Install"], ["replacement", "Replacement"]];
const LOCKED = ["approved", "declined"];

let seq = 0;
const nextKey = () => `k${++seq}`;
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

// ---------- form <-> server ----------
const lineFromServer = (ln) => ({
  key: nextKey(), item_id: ln.item_id, code: ln.code, name: ln.name, qty: ln.qty, optional: !!ln.optional, category: ln.category,
  unit_price_cents: ln.unit_price_cents, list_price_cents: ln.list_price_cents, cost_cents: ln.cost_cents || 0, tax_code: ln.tax_code,
  member_price_applied: !!ln.member_price_applied,
});

function lineFromItem(item, member, rules) {
  let price = item.unit_price_cents;
  let applied = false;
  if (member) {
    const pct = rules?.membership?.discount_percent || 0;
    if (item.member_price_cents != null) { price = item.member_price_cents; applied = true; }
    else if (item.member_discount !== false && item.kind !== "plan" && pct && ["repair", "maintenance"].includes(item.category)) {
      price = price - Math.round((price * pct) / 100); applied = true;
    }
  }
  return { key: nextKey(), item_id: item.id, code: item.code, name: item.name, qty: 1, optional: false, category: item.category,
    unit_price_cents: price, list_price_cents: item.unit_price_cents, cost_cents: item.cost_cents || 0, tax_code: item.tax_code || "taxable",
    member_price_applied: applied };
}

const blankOption = (i) => ({ key: nextKey(), name: OPTION_NAMES[i] || `Option ${i + 1}`, description: "", recommended: false, lines: [] });

const formFromQuote = (q) => ({
  customer_id: q.customer_id, site_id: q.site_id || "", title: q.title || "", job_type: q.job_type || "repair", trade: q.trade || "hvac",
  options: q.options.map((o) => ({ key: nextKey(), id: o.id, name: o.name, description: o.description || "", recommended: !!o.recommended,
    lines: o.lines.map(lineFromServer) })),
});

const blankForm = (customer = "") => ({ customer_id: customer, site_id: "", title: "", job_type: "repair", trade: "hvac", options: [blankOption(0)] });

// Lines go back as item_id + qty: the server re-prices and snapshots them.
const payloadOf = (f) => ({
  title: f.title.trim() || "Quote", job_type: f.job_type, trade: f.trade, site_id: f.site_id || null,
  options: f.options.map((o) => ({
    ...(o.id ? { id: o.id } : {}), name: o.name.trim() || "Option", description: o.description, recommended: o.recommended,
    lines: o.lines.map((l) => l.item_id
      ? { item_id: l.item_id, qty: num(l.qty) || 1, optional: l.optional }
      : { name: l.name, unit_price_cents: l.unit_price_cents, cost_cents: l.cost_cents, tax_code: l.tax_code, qty: num(l.qty) || 1, optional: l.optional }),
  })),
});

// ---------- client-side estimate (mirrors the server's pricing.totals) ----------
function estimate(lines, rules, customer) {
  const rates = rules?.tax?.rates_bp || {};
  const exempt = !!customer?.tax_exempt;
  let subtotal = 0, cost = 0;
  const by = {};
  for (const l of lines) {
    if (l.optional) continue;
    const t = Math.round(l.unit_price_cents * num(l.qty));
    subtotal += t;
    cost += Math.round((l.cost_cents || 0) * num(l.qty));
    const code = exempt ? "exempt" : l.tax_code || "taxable";
    const rate = rates[code] || 0;
    const row = (by[code] ||= { code, rate_bp: rate, taxable_cents: 0, tax_cents: 0 });
    row.taxable_cents += t;
    row.tax_cents += Math.round((t * rate) / 10000);
  }
  const tax_lines = Object.values(by).filter((r) => r.tax_cents);
  const tax = tax_lines.reduce((s, r) => s + r.tax_cents, 0);
  return { subtotal_cents: subtotal, tax_lines, tax_cents: tax, total_cents: subtotal + tax, cost_cents: cost, tax_label: rules?.tax?.label || "Tax" };
}
function stagesFor(total, rules) {
  const ps = rules?.payment_schedule;
  if (!ps?.enabled) return [100];
  const tier = ps.tiers.find((t) => t.up_to_cents == null || total <= t.up_to_cents);
  return tier ? tier.stages : [100];
}
function depositFor(total, rules) {
  const d = rules?.deposit;
  return d?.enabled && total >= d.min_quote_total_cents ? Math.round((total * d.percent) / 100) : 0;
}
function splitStages(total, stages) {
  const parts = stages.map((p) => Math.floor((total * p) / 100));
  parts[parts.length - 1] += total - parts.reduce((s, x) => s + x, 0);
  return parts;
}

// ---------- page ----------
export default function QuoteBuilder() {
  const { id } = useParams();
  const isNew = !id;
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const { org, user } = useAuth();
  // Live estimate uses the org's single tax rate and deposit percent (Settings); the server re-prices on save.
  const rules = useMemo(() => ({
    tax: { label: "Tax", rates_bp: { taxable: org?.tax_rate_bp || 0 } },
    deposit: { enabled: !!org?.deposit_percent, percent: org?.deposit_percent || 0, min_quote_total_cents: 0 },
  }), [org]);
  const office = user?.role === "owner" || user?.role === "office";

  const quote = useApi(isNew ? null : `/api/quotes/${id}`);
  const customers = useApi("/api/customers");
  const [form, setForm] = useState(() => blankForm(params.get("customer") || ""));
  const [baseline, setBaseline] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState(null);
  const [picker, setPicker] = useState(null); // option key
  const [declining, setDeclining] = useState(false);

  const custDetail = useApi(form.customer_id ? `/api/customers/${form.customer_id}` : null);
  const q = isNew ? null : quote.data?.id === id ? quote.data : null;
  const locked = !!q && LOCKED.includes(q.status);

  // New quote: reset the form (also when coming back here from an existing quote).
  useEffect(() => {
    if (isNew) { setForm(blankForm(params.get("customer") || "")); setBaseline(null); setErr(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  // Existing quote: load it into the form whenever the server copy changes.
  useEffect(() => {
    if (q) { const f = formFromQuote(q); setForm(f); setBaseline(JSON.stringify(payloadOf(f))); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id, q?.updated_at, q?.status]);

  // Coming from a lead: prefill the title from what they asked for.
  const leadId = params.get("lead");
  useEffect(() => {
    if (!isNew || !leadId) return;
    api.get("/api/leads").then((leads) => {
      const lead = leads.find((l) => l.id === leadId);
      if (lead?.service) setForm((f) => (f.title ? f : { ...f, title: lead.service }));
    }).catch(() => {});
  }, [isNew, leadId]);

  // Default the site to the customer's first one.
  const sites = custDetail.data?.id === form.customer_id ? custDetail.data.sites || [] : [];
  useEffect(() => {
    if (sites.length && !sites.some((s) => s.id === form.site_id)) setForm((f) => ({ ...f, site_id: sites[0].id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites.map((s) => s.id).join()]);

  const customer = (customers.data || []).find((c) => c.id === form.customer_id) || (custDetail.data?.id === form.customer_id ? custDetail.data : null) || q?.customer;
  const member = q ? !!q.member_pricing : !!customer?.member;
  const dirty = isNew || baseline !== JSON.stringify(payloadOf(form));

  // Totals per option: server numbers when saved, estimates while editing.
  const views = useMemo(() => form.options.map((o) => {
    const server = !dirty && q ? q.options.find((x) => x.id === o.id) : null;
    if (server) return { totals: server.totals, margin_percent: server.margin_percent, stages: server.stages || [100], deposit_cents: server.deposit_cents || 0, estimated: false };
    const t = estimate(o.lines, rules, custDetail.data || customer);
    return { totals: t, margin_percent: t.subtotal_cents ? Math.round((100 * (t.subtotal_cents - t.cost_cents)) / t.subtotal_cents) : 0,
      stages: stagesFor(t.total_cents, rules), deposit_cents: depositFor(t.total_cents, rules), estimated: true };
  }), [form.options, dirty, q, rules, custDetail.data, customer]);

  // ---- form edits ----
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setOpt = (key, patch) => setForm((f) => ({ ...f, options: f.options.map((o) => (o.key === key ? { ...o, ...patch } : o)) }));
  const setRecommended = (key, on) => setForm((f) => ({ ...f, options: f.options.map((o) => ({ ...o, recommended: o.key === key ? on : on ? false : o.recommended })) }));
  const setLine = (okey, lkey, patch) => setForm((f) => ({ ...f, options: f.options.map((o) => (o.key !== okey ? o
    : { ...o, lines: o.lines.map((l) => (l.key === lkey ? { ...l, ...patch } : l)) })) }));
  const removeLine = (okey, lkey) => setForm((f) => ({ ...f, options: f.options.map((o) => (o.key !== okey ? o : { ...o, lines: o.lines.filter((l) => l.key !== lkey) })) }));
  const addItem = (okey, item) => setForm((f) => ({ ...f, options: f.options.map((o) => {
    if (o.key !== okey) return o;
    const existing = o.lines.find((l) => l.item_id === item.id);
    if (existing) return { ...o, lines: o.lines.map((l) => (l === existing ? { ...l, qty: num(l.qty) + 1 } : l)) };
    return { ...o, lines: [...o.lines, lineFromItem(item, member, rules)] };
  }) }));
  const addOption = () => setForm((f) => (f.options.length >= 3 ? f : { ...f, options: [...f.options, blankOption(f.options.length)] }));
  const copyOption = (o) => setForm((f) => (f.options.length >= 3 ? f : { ...f, options: [...f.options,
    { ...o, key: nextKey(), id: undefined, name: OPTION_NAMES[f.options.length] || `${o.name} copy`, recommended: false, lines: o.lines.map((l) => ({ ...l, key: nextKey() })) }] }));
  const removeOption = (key) => setForm((f) => ({ ...f, options: f.options.filter((o) => o.key !== key) }));

  // ---- server actions ----
  const refresh = async (qid) => {
    const fresh = await api.get(`/api/quotes/${qid}`);
    quote.setData(fresh);
    return fresh;
  };

  const save = async ({ quiet } = {}) => {
    if (!form.customer_id) throw new Error("Pick a customer first");
    if (!form.title.trim()) throw new Error("Give the quote a title");
    if (isNew) {
      const created = await api.post("/api/quotes", { customer_id: form.customer_id, lead_id: leadId || undefined, ...payloadOf(form) });
      if (!quiet) toast(`${created.number} saved as a draft`);
      nav(`/quotes/${created.id}`, { replace: true });
      return created;
    }
    await api.patch(`/api/quotes/${id}`, payloadOf(form));
    const fresh = await refresh(id);
    if (!quiet) toast("Saved · totals updated");
    return fresh;
  };

  const run = (name, fn) => async () => {
    setBusy(name); setErr(null);
    try { await fn(); } catch (e) { setErr(e); toast(e, true); } finally { setBusy(""); }
  };

  const onSave = run("save", () => save());
  const onSend = run("send", async () => {
    const saved = dirty ? await save({ quiet: true }) : q;
    await api.post(`/api/quotes/${saved.id}/send`);
    await refresh(saved.id).catch(() => {});
    toast(`Text sent to ${customer?.name?.split(" ")[0] || "the customer"}${customer?.phone ? ` at ${customer.phone}` : ""} with the quote link`);
  });
  const link = q ? `${window.location.origin}/q/${q.public_token}` : "";
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(link); toast("Customer link copied"); }
    catch { window.prompt("Copy the customer link", link); }
  };
  const onDecline = async (reason) => {
    setBusy("decline");
    try { await api.post(`/api/quotes/${id}/decline`, { reason }); await refresh(id); setDeclining(false); toast("Quote marked as declined"); }
    catch (e) { toast(e, true); } finally { setBusy(""); }
  };

  // ---- render ----
  if (!isNew && quote.error) return <div className="page"><PageHead title="Quote" /><ErrorBox error={quote.error} /></div>;
  if (!isNew && !q) return <div className="page"><PageHead title="Quote" /><Card><Loading /></Card></div>;

  const expires = q?.expires_on || (() => { const d = new Date(); d.setDate(d.getDate() + (rules?.quote?.expires_days || 30)); return d.toISOString().slice(0, 10); })();
  const canSend = !locked && form.customer_id && form.options.some((o) => o.lines.length);

  return (
    <div className="page qb-page">
      <style>{CSS}</style>
      <div className="small" style={{ marginBottom: 8 }}><Link to="/quotes">← Quotes</Link></div>
      <PageHead
        title={isNew ? "New quote" : <span className="row" style={{ gap: 10 }}>{q.number}<Status s={q.status} /></span>}
        sub={isNew ? "Build up to three options. The customer picks one, signs and pays the deposit from their phone."
          : <>{q.title} · {customer?.name}{q.sent_at ? ` · sent ${ago(q.sent_at)}` : ` · created ${ago(q.created_at)}`}</>}
      >
        <div className="row wrap" style={{ justifyContent: "flex-end" }}>
          {!isNew && <Button size="sm" variant="ghost" onClick={onCopy}>Copy customer link</Button>}
          {!isNew && <Button size="sm" variant="ghost" onClick={() => window.open(link, "_blank", "noopener")}>Open customer view ↗</Button>}
          {!isNew && !locked && <Button size="sm" variant="danger" onClick={() => setDeclining(true)}>Decline</Button>}
          {!locked && <Button onClick={onSave} disabled={!!busy || (!dirty && !isNew)}>{busy === "save" ? "Saving…" : dirty ? (isNew ? "Save draft" : "Save changes") : "Saved"}</Button>}
          {!locked && <Button variant="primary" onClick={onSend} disabled={!!busy || !canSend}>
            {busy === "send" ? "Sending…" : q && ["sent", "viewed"].includes(q.status) ? "Resend to customer" : "Send to customer"}</Button>}
        </div>
      </PageHead>

      {q?.status === "approved" && (
        <div className="qb-banner ok">
          <div>
            <b>Approved by {q.signature?.name || q.customer?.name}</b>{q.approved_at ? ` ${ago(q.approved_at)}` : ""} — locked; changes go on the job.
            {q.deposit_due_cents ? <div className="small" style={{ marginTop: 2 }}>Deposit <Money cents={q.deposit_due_cents} /> · {q.deposit_paid_cents >= q.deposit_due_cents ? "paid" : `${money(q.deposit_paid_cents || 0)} paid so far`}</div> : null}
          </div>
          <div className="spacer" />
          {q.job_id && <Link className="btn sm" to={`/jobs/${q.job_id}`}>Open the job →</Link>}
        </div>
      )}
      {q?.status === "declined" && (
        <div className="qb-banner bad"><div><b>Declined</b>{q.decline_reason ? ` — “${q.decline_reason}”` : ""}. This quote is closed; start a new one to re-quote.</div>
          <div className="spacer" /><Button size="sm" onClick={() => nav(`/quotes/new?customer=${q.customer_id}`)}>New quote for {q.customer?.name?.split(" ")[0]}</Button></div>
      )}
      {q?.status === "viewed" && <div className="qb-banner info"><div><b>{customer?.name?.split(" ")[0]} has opened this quote.</b> A good moment to call and answer questions.</div></div>}

      <ErrorBox error={err} />

      <div className="qb-split">
        {/* ---------------- builder ---------------- */}
        <div className="col" style={{ gap: 14, minWidth: 0 }}>
          <Card title="Customer & job">
            <div className="grid g2">
              <Field label="Customer">
                {isNew ? <CustomerPicker customers={customers.data} loading={customers.loading} value={form.customer_id}
                  onChange={(cid) => set({ customer_id: cid, site_id: "" })} />
                  : <div className="qb-static"><Link to={`/customers/${form.customer_id}`}>{customer?.name}</Link>{member && <Pill tone="green">Member pricing</Pill>}</div>}
              </Field>
              <Field label="Site">
                <select value={form.site_id} onChange={(e) => set({ site_id: e.target.value })} disabled={locked || !form.customer_id}>
                  {!form.customer_id && <option value="">Pick a customer first</option>}
                  {form.customer_id && !sites.length && <option value="">{custDetail.loading ? "Loading…" : "No sites on file"}</option>}
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.label ? `${s.label} · ` : ""}{s.address}{s.city ? `, ${s.city}` : ""}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Title the customer sees">
                <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. AC repair or replace" disabled={locked} />
              </Field>
            </div>
            <div className="grid g2" style={{ marginTop: 12 }}>
              <Field label="Job type">
                <select value={form.job_type} onChange={(e) => set({ job_type: e.target.value })} disabled={locked}>
                  {JOB_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
              <Field label="Trade">
                <select value={form.trade} onChange={(e) => set({ trade: e.target.value })} disabled={locked}>
                  {TRADES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
            </div>
            {isNew && member && <div className="small" style={{ marginTop: 10, color: "var(--green)" }}>✓ {customer?.name} is a plan member: member prices apply automatically.</div>}
          </Card>

          {form.options.map((o, i) => (
            <OptionEditor key={o.key} o={o} index={i} view={views[i]} locked={locked} office={office} canRemove={form.options.length > 1}
              canCopy={form.options.length < 3}
              onChange={(p) => setOpt(o.key, p)} onRecommended={(on) => setRecommended(o.key, on)}
              onLine={(lkey, p) => setLine(o.key, lkey, p)} onRemoveLine={(lkey) => removeLine(o.key, lkey)}
              onAdd={() => setPicker(o.key)} onCopy={() => copyOption(o)} onRemove={() => removeOption(o.key)} />
          ))}

          {!locked && form.options.length < 3 && (
            <button className="qb-add" onClick={addOption}>
              + Add “{OPTION_NAMES[form.options.length]}” option <span className="muted small">· customers pick the middle option most often</span>
            </button>
          )}
        </div>

        {/* ---------------- customer preview ---------------- */}
        <div className="qb-preview-wrap">
          <div className="row" style={{ marginBottom: 8 }}>
            <h3>What the customer sees</h3><div className="spacer" />
            {dirty && !locked && <span className="muted small">Live preview · estimates until saved</span>}
          </div>
          <CustomerPreview org={org} q={q} form={form} views={views} customer={customer} expires={expires} member={member} />
        </div>
      </div>

      {picker && <PricebookPicker trade={form.trade} member={member} option={form.options.find((o) => o.key === picker)}
        onAdd={(item) => addItem(picker, item)} onClose={() => setPicker(null)} />}
      {declining && <DeclineModal busy={busy === "decline"} onClose={() => setDeclining(false)} onConfirm={onDecline} />}
    </div>
  );
}

// ---------- option editor ----------
function OptionEditor({ o, index, view, locked, office, canRemove, canCopy, onChange, onRecommended, onLine, onRemoveLine, onAdd, onCopy, onRemove }) {
  const t = view.totals;
  const optionalLines = o.lines.filter((l) => l.optional);
  return (
    <div className={`card qb-opt ${o.recommended ? "rec" : ""}`}>
      <div className="qb-opt-head">
        <span className="qb-idx">{index + 1}</span>
        <input className="qb-name" value={o.name} onChange={(e) => onChange({ name: e.target.value })} disabled={locked} aria-label="Option name" />
        <label className="check small" style={{ whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={o.recommended} onChange={(e) => onRecommended(e.target.checked)} disabled={locked} /> Recommended
        </label>
        {!locked && canCopy && <Button size="sm" variant="ghost" onClick={onCopy} title="Duplicate this option">Duplicate</Button>}
        {!locked && canRemove && <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Remove option">✕</Button>}
      </div>
      <div className="card-body col" style={{ gap: 12 }}>
        {(!locked || o.description) && <textarea value={o.description} onChange={(e) => onChange({ description: e.target.value })} disabled={locked}
          placeholder="Why pick this option? Warranty, efficiency, what's included…" style={{ minHeight: 54 }} />}

        {o.lines.length === 0 ? (
          <div className="qb-empty-lines">No items yet. {!locked && <button className="linkbtn" onClick={onAdd}>Add from the price book</button>}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="t qb-lines">
              <thead><tr><th>Item</th><th className="r">Price</th><th style={{ width: 86 }}>Qty</th><th>Optional</th><th className="r">Total</th><th /></tr></thead>
              <tbody>
                {o.lines.map((l) => (
                  <tr key={l.key} className={l.optional ? "opt" : ""}>
                    <td>
                      <div style={{ fontWeight: 550 }}>{l.name}</div>
                      <div className="muted small">{l.code}{l.member_price_applied && <span style={{ color: "var(--green)" }}> · member price</span>}
                        {l.tax_code && l.tax_code !== "taxable" ? ` · ${l.tax_code === "labor" ? "labour, not taxed" : l.tax_code}` : ""}</div>
                    </td>
                    <td className="r num">
                      <Money cents={l.unit_price_cents} />
                      {l.member_price_applied && l.list_price_cents > l.unit_price_cents && <div className="muted small" style={{ textDecoration: "line-through" }}>{money(l.list_price_cents)}</div>}
                    </td>
                    <td><input type="number" min="0" step="any" value={l.qty} disabled={locked} onChange={(e) => onLine(l.key, { qty: e.target.value })} style={{ padding: "5px 8px" }} aria-label="Quantity" /></td>
                    <td><label className="check small"><input type="checkbox" checked={l.optional} disabled={locked} onChange={(e) => onLine(l.key, { optional: e.target.checked })} />{l.optional ? "Add-on" : ""}</label></td>
                    <td className="r num" style={{ fontWeight: 550, color: l.optional ? "var(--ink-3)" : undefined }}>{money(Math.round(l.unit_price_cents * num(l.qty)))}</td>
                    <td className="r">{!locked && <button className="btn ghost sm" onClick={() => onRemoveLine(l.key)} aria-label={`Remove ${l.name}`}>✕</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!locked && o.lines.length > 0 && <div><Button size="sm" onClick={onAdd}>+ Add from price book</Button></div>}

        <div className="qb-sum">
          <div className="qb-sum-l">
            {office && t.subtotal_cents > 0 && (
              <div className="qb-margin">
                <div className="muted small">Margin <span className="muted">(office only)</span></div>
                <div style={{ fontWeight: 650, fontSize: 18, color: view.margin_percent >= 40 ? "var(--green)" : view.margin_percent >= 20 ? "var(--amber)" : "var(--red)" }}>{view.margin_percent}%</div>
                <div className="muted small">cost <Money cents={t.cost_cents} /></div>
              </div>
            )}
            <div className="small col" style={{ gap: 3 }}>
              <div><span className="muted">Payment schedule:</span> {view.stages.length === 1 ? "in full" : view.stages.map((p) => `${p}%`).join(" / ")}</div>
              <div><span className="muted">Deposit to book:</span> {view.deposit_cents ? <Money cents={view.deposit_cents} /> : "none"}</div>
              {optionalLines.length > 0 && <div className="muted">{optionalLines.length} optional add-on{optionalLines.length > 1 ? "s" : ""} not in total</div>}
            </div>
          </div>
          <div className="qb-sum-r">
            <Row k="Subtotal" v={t.subtotal_cents} />
            {t.tax_lines.map((tl) => <Row key={tl.code} k={`${t.tax_label} ${(tl.rate_bp / 100).toFixed(2).replace(/\.?0+$/, "")}%`} v={tl.tax_cents} />)}
            <Row k="Total" v={t.total_cents} strong />
            {view.estimated && t.subtotal_cents > 0 && <div className="muted small" style={{ textAlign: "right" }}>Estimate · save to confirm</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const Row = ({ k, v, strong }) => (
  <div className={`row between ${strong ? "qb-total" : "small"}`}><span className={strong ? "" : "muted"}>{k}</span><Money cents={v} /></div>
);

// ---------- customer picker ----------
function CustomerPicker({ customers, loading, value, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const list = customers || [];
  const sel = list.find((c) => c.id === value);
  const hits = list.filter((c) => !q || `${c.name} ${c.phone || ""} ${c.email || ""}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div style={{ position: "relative" }}>
      <input value={open ? q : sel?.name || ""} placeholder={loading ? "Loading customers…" : "Search customers by name or phone"}
        onFocus={() => { setOpen(true); setQ(""); }} onBlur={() => setTimeout(() => setOpen(false), 120)} onChange={(e) => setQ(e.target.value)} />
      {open && (
        <div className="qb-drop">
          {hits.length === 0 ? <div className="muted small" style={{ padding: 10 }}>No customer matches “{q}”.</div> : hits.map((c) => (
            <button key={c.id} type="button" className={`qb-drop-item ${c.id === value ? "on" : ""}`} onMouseDown={(e) => { e.preventDefault(); onChange(c.id); setOpen(false); }}>
              <span style={{ fontWeight: 550 }}>{c.name}</span>
              {c.member && <Pill tone="green">Member</Pill>}
              <span className="spacer" /><span className="muted small">{c.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- price book picker ----------
function PricebookPicker({ trade, member, option, onAdd, onClose }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [cat, setCat] = useState("");
  const [onlyTrade, setOnlyTrade] = useState(true);
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 200); return () => clearTimeout(t); }, [q]);
  const { data, loading, error } = useApi(`/api/pricebook?q=${encodeURIComponent(dq)}&category=${cat}`);
  const items = (data || []).filter((x) => !onlyTrade || !x.trade || x.trade === trade);
  const inOption = (itemId) => option?.lines.find((l) => l.item_id === itemId);
  return (
    <Modal title={`Add to “${option?.name || "option"}”`} onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <input autoFocus placeholder="Search the price book (e.g. capacitor, tune-up, water heater)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row wrap" style={{ gap: 6 }}>
        {CATEGORIES.map(([k, l]) => <button key={k} className={`qb-chip ${cat === k ? "on" : ""}`} onClick={() => setCat(k)}>{l}</button>)}
        <span className="spacer" />
        <label className="check small"><input type="checkbox" checked={onlyTrade} onChange={(e) => setOnlyTrade(e.target.checked)} /> {TRADES.find((t) => t[0] === trade)?.[1]} only</label>
      </div>
      <ErrorBox error={error} />
      <div className="qb-pb">
        {loading && !data ? <Loading /> : items.length === 0 ? <Empty>Nothing matches. Try another word or category.</Empty> : items.map((it) => {
          const added = inOption(it.id);
          return (
            <button key={it.id} className="qb-pb-item" onClick={() => onAdd(it)}>
              <div style={{ minWidth: 0, textAlign: "left" }}>
                <div style={{ fontWeight: 550 }}>{it.name}</div>
                <div className="muted small">{it.code} · {it.category} · {it.kind}{it.trade ? ` · ${it.trade}` : ""}</div>
              </div>
              <div className="spacer" />
              <div style={{ textAlign: "right" }}>
                <div className="num" style={{ fontWeight: 600 }}>{money(member && it.member_price_cents != null ? it.member_price_cents : it.unit_price_cents)}</div>
                {member && it.member_price_cents != null && <div className="muted small" style={{ textDecoration: "line-through" }}>{money(it.unit_price_cents)}</div>}
              </div>
              <span className={`qb-plus ${added ? "on" : ""}`}>{added ? `✓ ${added.qty}` : "+"}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

const REASONS = ["Price too high", "Went with another company", "Decided to wait", "Repaired it themselves"];
function DeclineModal({ busy, onClose, onConfirm }) {
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState("");
  const reason = choice === "other" ? other.trim() : choice;
  return (
    <Modal title="Mark quote as declined" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy} onClick={() => onConfirm(reason)}>{busy ? "Saving…" : "Mark declined"}</Button></>}>
      <p className="muted" style={{ margin: 0 }}>Follow-ups stop and the quote is closed. Knowing why helps your win rate.</p>
      <Field label="Reason (optional)">
        <select value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Choose a reason…</option>
          {REASONS.map((r) => <option key={r}>{r}</option>)}
          <option value="other">Other…</option>
        </select>
      </Field>
      {choice === "other" && <textarea autoFocus value={other} onChange={(e) => setOther(e.target.value)} placeholder="What did they say?" />}
    </Modal>
  );
}

// ---------- customer preview ----------
function CustomerPreview({ org, q, form, views, customer, expires, member }) {
  const brand = org?.brand?.color || "var(--brand)";
  const shown = form.options.map((o, i) => ({ o, v: views[i] })).filter(({ o }) => o.lines.length || o.description);
  return (
    <div className="qb-phone">
      <div className="qb-phone-head" style={{ background: brand }}>
        <div className="qb-logo">{org?.brand?.short || org?.name?.[0]}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 650 }}>{org?.name}</div>
          <div style={{ opacity: 0.85, fontSize: 12 }}>{org?.phone}</div>
        </div>
      </div>
      <div className="qb-phone-body">
        <div>
          <div className="muted small">{q ? `Quote ${q.number}` : "Quote"} · valid until {day(expires)}</div>
          <div style={{ fontSize: 18, fontWeight: 650, marginTop: 2 }}>{form.title || "Your quote"}</div>
          <div className="muted small" style={{ marginTop: 2 }}>Prepared for {customer?.name || "your customer"}</div>
          {member && <div className="small" style={{ marginTop: 6, color: "var(--green)", fontWeight: 550 }}>★ Member prices applied</div>}
        </div>
        {shown.length > 1 && <div className="small muted">Choose the option that suits you:</div>}
        {shown.length === 0 ? (
          <div className="qb-pv-empty">Options you add appear here exactly as the customer will see them.</div>
        ) : shown.map(({ o, v }) => {
          const chosen = q?.chosen_option_id && q.chosen_option_id === o.id;
          const stages = v.stages.length > 1 ? splitStages(v.totals.total_cents, v.stages) : null;
          return (
            <div key={o.key} className={`qb-pv-opt ${o.recommended ? "rec" : ""} ${chosen ? "chosen" : ""}`} style={o.recommended || chosen ? { borderColor: brand } : undefined}>
              {(o.recommended || chosen) && <div className="qb-pv-badge" style={{ background: brand }}>{chosen ? "✓ Approved" : "Recommended"}</div>}
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div style={{ fontWeight: 650, fontSize: 15 }}>{o.name || "Option"}</div>
                <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{money(v.totals.total_cents)}</div>
              </div>
              {o.description && <div className="small" style={{ color: "var(--ink-2)", marginTop: 4 }}>{o.description}</div>}
              <div className="qb-pv-lines">
                {o.lines.filter((l) => !l.optional).map((l) => (
                  <div key={l.key} className="row between small"><span>{l.name}{num(l.qty) !== 1 ? ` × ${num(l.qty)}` : ""}</span><span className="num">{money(Math.round(l.unit_price_cents * num(l.qty)))}</span></div>
                ))}
                {o.lines.filter((l) => l.optional).map((l) => (
                  <div key={l.key} className="row between small muted"><span>Optional: {l.name}</span><span className="num">+{money(Math.round(l.unit_price_cents * num(l.qty)))}</span></div>
                ))}
              </div>
              <div className="qb-pv-tot small">
                <div className="row between"><span className="muted">Subtotal</span><span className="num">{money(v.totals.subtotal_cents)}</span></div>
                {v.totals.tax_cents > 0 && <div className="row between"><span className="muted">{v.totals.tax_label}</span><span className="num">{money(v.totals.tax_cents)}</span></div>}
              </div>
              {(v.deposit_cents > 0 || stages) && (
                <div className="qb-pv-pay small">
                  {v.deposit_cents > 0 && <div><b>{money(v.deposit_cents)}</b> deposit to book your install</div>}
                  {stages && <div className="muted">Then pay in stages: {stages.map((a, i) => `${v.stages[i]}% (${money(a)})`).join(" · ")}</div>}
                </div>
              )}
              <button className="btn block" disabled style={{ marginTop: 10, background: brand, borderColor: brand, color: "#fff" }}>
                {chosen ? "Approved" : `Approve ${o.name || "this option"}`}
              </button>
            </div>
          );
        })}
        <div className="muted small" style={{ textAlign: "center" }}>Questions? Call {org?.name} at {org?.phone}.</div>
      </div>
    </div>
  );
}

const CSS = `
.qb-page { max-width: 1440px; }
.qb-split { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(330px, 0.85fr); gap: 20px; align-items: start; margin-top: 4px; }
.qb-preview-wrap { position: sticky; top: 16px; }
@media (max-width: 1100px) { .qb-split { grid-template-columns: 1fr; } .qb-preview-wrap { position: static; } }
.qb-static { display: flex; align-items: center; gap: 8px; min-height: 36px; font-size: 14px; color: var(--ink); font-weight: 550; }
.qb-banner { display: flex; align-items: center; gap: 12px; border-radius: var(--radius); padding: 12px 14px; margin-bottom: 14px; }
.qb-banner.ok { background: var(--green-soft); color: #0f5130; }
.qb-banner.bad { background: var(--red-soft); color: var(--red); }
.qb-banner.info { background: var(--amber-soft); color: #7a3d06; }
.qb-opt { overflow: visible; }
.qb-opt.rec { border-color: var(--brand); box-shadow: 0 0 0 1px var(--brand), var(--shadow); }
.qb-opt-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px 10px 16px; border-bottom: 1px solid var(--line); }
.qb-idx { width: 24px; height: 24px; border-radius: 50%; background: var(--surface-2); color: var(--ink-2); display: grid; place-items: center; font-size: 12px; font-weight: 650; flex: none; }
.qb-opt.rec .qb-idx { background: var(--brand); color: var(--brand-ink); }
.qb-name { border-color: transparent; font-weight: 650; font-size: 15px; padding: 5px 8px; }
.qb-name:hover:not(:disabled) { border-color: var(--line-2); }
.qb-name:disabled { background: transparent; }
.qb-lines td, .qb-lines th { padding: 8px 8px; }
.qb-lines tr.opt td { background: var(--surface-2); }
.qb-empty-lines { border: 1px dashed var(--line-2); border-radius: 8px; padding: 18px; text-align: center; color: var(--ink-3); }
.linkbtn { border: 0; background: none; color: var(--brand); font: inherit; font-weight: 550; cursor: pointer; padding: 0; }
.qb-sum { display: flex; gap: 16px; justify-content: space-between; align-items: flex-end; border-top: 1px solid var(--line); padding-top: 12px; flex-wrap: wrap; }
.qb-sum-l { display: flex; gap: 18px; align-items: flex-end; }
.qb-margin { border-right: 1px solid var(--line); padding-right: 18px; }
.qb-sum-r { min-width: 220px; display: flex; flex-direction: column; gap: 3px; }
.qb-total { font-weight: 700; font-size: 16px; border-top: 1px solid var(--line); padding-top: 6px; margin-top: 2px; }
.qb-add { width: 100%; border: 1.5px dashed var(--line-2); background: transparent; border-radius: var(--radius); padding: 14px; font: inherit; font-weight: 600; color: var(--brand); cursor: pointer; }
.qb-add:hover { background: var(--brand-soft); border-color: var(--brand); }
.qb-drop { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.12); z-index: 20; padding: 4px; max-height: 300px; overflow: auto; }
.qb-drop-item { display: flex; align-items: center; gap: 8px; width: 100%; border: 0; background: none; font: inherit; color: inherit; padding: 8px 10px; border-radius: 7px; cursor: pointer; text-align: left; }
.qb-drop-item:hover, .qb-drop-item.on { background: var(--surface-2); }
.qb-chip { border: 1px solid var(--line-2); background: var(--surface); border-radius: 999px; padding: 3px 11px; font: inherit; font-size: 12.5px; cursor: pointer; color: var(--ink-2); }
.qb-chip.on { background: var(--ink); color: #fff; border-color: var(--ink); }
.qb-pb { display: flex; flex-direction: column; gap: 4px; max-height: 46vh; overflow: auto; margin: 0 -4px; padding: 0 4px; }
.qb-pb-item { display: flex; align-items: center; gap: 12px; border: 1px solid var(--line); background: var(--surface); border-radius: 9px; padding: 9px 12px; font: inherit; color: inherit; cursor: pointer; }
.qb-pb-item:hover { border-color: var(--brand); background: var(--brand-soft); }
.qb-plus { min-width: 34px; height: 26px; border-radius: 7px; background: var(--surface-2); display: grid; place-items: center; font-weight: 650; color: var(--ink-2); font-size: 12.5px; padding: 0 6px; }
.qb-plus.on { background: var(--green-soft); color: var(--green); }
.qb-phone { border: 1px solid var(--line); border-radius: 22px; overflow: hidden; background: var(--bg); box-shadow: 0 12px 40px rgba(16,24,40,.12); max-width: 420px; margin: 0 auto; }
.qb-phone-head { color: #fff; padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
.qb-logo { width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,.2); display: grid; place-items: center; font-weight: 700; flex: none; }
.qb-phone-body { padding: 14px; display: flex; flex-direction: column; gap: 12px; max-height: calc(100vh - 150px); overflow: auto; }
.qb-pv-empty { border: 1px dashed var(--line-2); border-radius: 12px; padding: 26px 16px; text-align: center; color: var(--ink-3); font-size: 13px; background: var(--surface); }
.qb-pv-opt { position: relative; background: var(--surface); border: 1.5px solid var(--line); border-radius: 14px; padding: 14px; }
.qb-pv-opt.rec, .qb-pv-opt.chosen { padding-top: 20px; }
.qb-pv-badge { position: absolute; top: -10px; left: 12px; color: #fff; font-size: 11px; font-weight: 650; padding: 2px 9px; border-radius: 999px; }
.qb-pv-lines { display: flex; flex-direction: column; gap: 3px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
.qb-pv-tot { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--line); }
.qb-pv-pay { margin-top: 10px; background: var(--surface-2); border-radius: 9px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
`;

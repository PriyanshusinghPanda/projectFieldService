import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar, Button, Card, Empty, ErrorBox, Field, Loading, Modal, Money, PageHead, Pill, Status, useToast } from "../components/ui";
import { api } from "../lib/api";
import { day, money, statusLabel, time } from "../lib/format";
import { useApi } from "../lib/useApi";
import { ScheduleModal } from "./Schedule";

const STEPS = [
  ["new", "New"], ["scheduled", "Scheduled"], ["en_route", "On the way"], ["on_site", "On site"],
  ["in_progress", "Working"], ["completed", "Done"], ["invoiced", "Invoiced"], ["paid", "Paid"],
];
const STEP_INDEX = { ...Object.fromEntries(STEPS.map(([k], i) => [k, i])), paused: 4 };
const FORWARD = ["en_route", "on_site", "in_progress", "completed", "scheduled"]; // nearest next step wins
const LOCKED_LINES = ["completed", "invoiced", "paid"];
const STAGES = [["before", "Before"], ["during", "During"], ["after", "After"]];

const actionLabel = (to, from) => ({
  scheduled: from === "new" || from === "non_complete" ? "Schedule" : "Back to scheduled",
  en_route: "Mark on the way", on_site: "Arrived on site", in_progress: from === "paused" ? "Resume work" : "Start work",
  paused: "Pause", completed: "Mark job done", non_complete: "Couldn't complete", new: "Unschedule", cancelled: "Cancel job",
}[to]);

const when = (iso) => (iso ? `${day(iso)}, ${time(iso)}` : "");
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

function resizeImage(file, max = 1024) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image")); };
    img.src = url;
  });
}

export default function JobDetail() {
  const { id } = useParams();
  const toast = useToast();
  const job = useApi(`/api/jobs/${id}`);
  const team = useApi("/api/team");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState("");
  const [modal, setModal] = useState(null); // schedule | reason:<to> | part | photo:<obj>

  const people = useMemo(() => Object.fromEntries((team.data || []).map((u) => [u.id, u])), [team.data]);
  const j = job.data?.id === id ? job.data : null;

  useEffect(() => { setErr(null); setModal(null); }, [id]);

  const act = async (name, fn, ok) => {
    setBusy(name); setErr(null);
    try { const r = await fn(); if (ok) toast(typeof ok === "function" ? ok(r) : ok); await job.reload(); return r; }
    catch (e) { setErr(e); toast(e.errors?.length ? `${e.message}: ${e.errors.length} thing${e.errors.length > 1 ? "s" : ""} left to do` : e, true); }
    finally { setBusy(""); }
  };

  if (job.error && !j) return <div className="page"><PageHead title="Job" /><ErrorBox error={job.error} /></div>;
  if (!j) return <div className="page"><PageHead title="Job" /><Card><Loading /></Card></div>;

  const status = j.status;
  const setStatus = (to, reason) => act(`st:${to}`, () => api.post(`/api/jobs/${id}/status`, { to, reason }), `${j.number}: ${statusLabel(to)}`);
  const onAction = (to) => {
    if (to === "scheduled" && (status === "new" || status === "non_complete")) return setModal("schedule");
    if (to === "non_complete" || to === "cancelled") return setModal(`reason:${to}`);
    return setStatus(to);
  };
  const actions = j.allowed_next.filter((to) => actionLabel(to, status));
  const primary = FORWARD.find((to) => actions.includes(to));
  const techs = j.assigned_tech_ids.map((tid) => people[tid]).filter(Boolean);
  const site = j.site;
  const address = site ? [site.address, site.city].filter(Boolean).join(", ") : "";
  const linesLocked = LOCKED_LINES.includes(status);

  return (
    <div className="page jd-page">
      <style>{CSS}</style>
      <div className="small" style={{ marginBottom: 8 }}><Link to="/jobs">← Jobs</Link></div>
      <PageHead
        title={<span className="row" style={{ gap: 10, flexWrap: "wrap" }}><span className="muted num">{j.number}</span>{j.title}<Status s={status} /></span>}
        sub={
          <span className="jd-sub">
            <Link to={`/customers/${j.customer_id}`} style={{ fontWeight: 600 }}>{j.customer?.name}</Link>
            {j.customer?.phone && <a href={`tel:${j.customer.phone}`} className="muted">{j.customer.phone}</a>}
            {address && <span>{address}</span>}
            {j.scheduled_start ? <span>{when(j.scheduled_start)}–{time(j.scheduled_end)}</span> : j.due_date ? <span>Due {day(j.due_date)}</span> : <span>Not scheduled</span>}
            {techs.length > 0 && <span className="row" style={{ gap: 6 }}>{techs.map((t) => <span key={t.id} className="row" style={{ gap: 5 }}><Avatar name={t.name} color={t.color || undefined} size={20} />{t.name}</span>)}</span>}
          </span>
        }
      >
        <div className="row wrap" style={{ justifyContent: "flex-end" }}>
          {["scheduled", "en_route"].includes(status) && <Button onClick={() => setModal("schedule")}>Reschedule</Button>}
          {actions.filter((to) => to !== primary).map((to) => (
            <Button key={to} variant={to === "cancelled" || to === "non_complete" ? "danger" : undefined} disabled={!!busy} onClick={() => onAction(to)}>{actionLabel(to, status)}</Button>
          ))}
          {primary && <Button variant="primary" disabled={!!busy} onClick={() => onAction(primary)}>{busy === `st:${primary}` ? "Saving…" : actionLabel(primary, status)}</Button>}
          {status === "completed" && !j.invoice && <Button variant="primary" disabled={!!busy} onClick={() => act("inv", () => api.post(`/api/jobs/${id}/invoice`), (r) => `Invoice ${r.number} created`)}>Create invoice</Button>}
          {j.invoice && <Link className="btn primary" to={`/invoices/${j.invoice.id}`}>Open invoice {j.invoice.number}</Link>}
        </div>
      </PageHead>

      <Stepper job={j} />

      {(status === "non_complete" || status === "cancelled") && (
        <div className="jd-banner bad"><b>{statusLabel(status)}</b>{j.non_complete_reason ? ` — ${j.non_complete_reason}` : ""}</div>
      )}
      <ErrorBox error={err} />
      {j.completion_errors?.length > 0 && (
        <div className="jd-banner warn">
          <div style={{ fontWeight: 650 }}>Before this job can be marked done</div>
          <ul>{j.completion_errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="jd-grid">
        <div className="col" style={{ gap: 14, minWidth: 0 }}>
          <LineItems job={j} locked={linesLocked} onAdd={() => setModal("part")} />
          <Checklist job={j} people={people} onToggle={(item) => act(`ck:${item.id}`, () => api.post(`/api/jobs/${id}/checklist/${item.id}`, { done: !item.done }))} busy={busy} />
          <Photos job={j} people={people} onOpen={(p) => setModal({ photo: p })}
            onAdd={async (stage, file) => {
              setBusy(`ph:${stage}`);
              try {
                const url = await resizeImage(file);
                await api.post(`/api/jobs/${id}/photos`, { stage, url, caption: file.name.replace(/\.[^.]+$/, "") });
                toast(`${stage[0].toUpperCase() + stage.slice(1)} photo added`);
                await job.reload();
              } catch (e) { toast(e, true); } finally { setBusy(""); }
            }} busy={busy} />
          <Notes job={j} onAdd={(text, customer) => act("note", () => api.post(`/api/jobs/${id}/notes`, { text, customer }), customer ? "Note added for the customer" : "Internal note added")} busy={busy === "note"} />
          <Timeline job={j} people={people} />
        </div>

        <div className="col" style={{ gap: 14, minWidth: 0 }}>
          <InvoiceBox job={j} busy={busy === "inv"} onCreate={() => act("inv", () => api.post(`/api/jobs/${id}/invoice`), (r) => `Invoice ${r.number} created`)} />
          <Profit job={j} />
          <SiteCard job={j} />
          <Equipment job={j} />
          <Signature job={j} onSign={(name, image) => act("sig", () => api.post(`/api/jobs/${id}/signature`, { name, image }), `Signed by ${name}`)} busy={busy === "sig"} />
          {j.history?.length > 0 && (
            <Card title="Earlier visits at this site" pad={false}>
              {j.history.map((h) => (
                <div key={h.number} className="jd-hist"><span className="muted small num">{h.number}</span><span style={{ flex: 1, minWidth: 0 }}>{h.title}</span><span className="muted small">{day(h.date)}</span></div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {modal === "schedule" && (
        <ScheduleModal job={j} date={j.scheduled_start?.slice(0, 10)} onClose={() => setModal(null)}
          onDone={(msg) => { setModal(null); toast(msg); job.reload(); }} />
      )}
      {typeof modal === "string" && modal.startsWith("reason:") && (
        <ReasonModal to={modal.slice(7)} busy={!!busy} onClose={() => setModal(null)}
          onConfirm={async (reason) => { await setStatus(modal.slice(7), reason); setModal(null); }} />
      )}
      {modal === "part" && <AddPartModal job={j} onClose={() => setModal(null)}
        onAdd={async (item, qty) => { const r = await act("part", () => api.post(`/api/jobs/${id}/parts`, { item_id: item.id, qty }), `Added ${item.name}`); if (r) setModal(null); }} busy={busy === "part"} />}
      {modal?.photo && (
        <Modal title={`${modal.photo.stage[0].toUpperCase() + modal.photo.stage.slice(1)} photo${modal.photo.caption ? ` · ${modal.photo.caption}` : ""}`} onClose={() => setModal(null)}>
          {modal.photo.url ? <img src={modal.photo.url} alt={modal.photo.caption || modal.photo.stage} style={{ width: "100%", borderRadius: 8 }} /> : <Empty>No image file attached.</Empty>}
          <div className="muted small">{people[modal.photo.by]?.name || "Team"} · {when(modal.photo.at)}</div>
        </Modal>
      )}
    </div>
  );
}

// ---------- stepper ----------
function Stepper({ job }) {
  const cur = STEP_INDEX[job.status];
  const off = cur == null;
  const stamp = {
    scheduled: job.scheduled_start, en_route: job.en_route_at, on_site: job.arrived_at, in_progress: job.started_at,
    completed: job.completed_at, invoiced: job.invoice?.issued_on, paid: job.status === "paid" ? job.invoice?.updated_at : null,
  };
  return (
    <div className="card jd-steps">
      {STEPS.map(([k, label], i) => {
        const state = off ? "todo" : i < cur ? "done" : i === cur ? "cur" : "todo";
        return (
          <div key={k} className={`jd-step ${state}`}>
            <div className="jd-dot">{state === "done" ? "✓" : i + 1}</div>
            <div className="jd-step-l">{i === cur && job.status === "paused" ? "Paused" : label}</div>
            {stamp[k] && state !== "todo" && <div className="jd-step-t">{stamp[k].length === 10 ? day(stamp[k]) : time(stamp[k])}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ---------- lines ----------
function LineItems({ job, locked, onAdd }) {
  const t = job.totals;
  return (
    <Card title="Line items" pad={false}
      actions={locked ? <span className="muted small">Locked once the job is done</span> : <Button size="sm" onClick={onAdd}>+ Add part</Button>}>
      {job.lines.length === 0 ? <Empty>No items yet. Add parts and services from the price book.</Empty> : (
        <div style={{ overflowX: "auto" }}>
          <table className="t">
            <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Total</th></tr></thead>
            <tbody>
              {job.lines.map((l) => (
                <tr key={l.id}>
                  <td><div style={{ fontWeight: 550 }}>{l.name}{l.optional && <span className="muted small"> (optional)</span>}</div>
                    <div className="muted small">{l.code}{l.member_price_applied ? <span style={{ color: "var(--green)" }}> · member price</span> : ""}</div></td>
                  <td className="r num">{l.qty}</td>
                  <td className="r"><Money cents={l.unit_price_cents} /></td>
                  <td className="r" style={{ fontWeight: 550 }}><Money cents={l.total_cents} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="jd-totals">
        <div className="row between small"><span className="muted">Subtotal</span><Money cents={t.subtotal_cents} /></div>
        {t.tax_lines.map((tl) => <div key={tl.code} className="row between small"><span className="muted">{t.tax_label} {tl.rate_bp / 100}%</span><Money cents={tl.tax_cents} /></div>)}
        <div className="row between" style={{ fontWeight: 700, fontSize: 16, borderTop: "1px solid var(--line)", paddingTop: 6 }}><span>Total</span><Money cents={t.total_cents} /></div>
      </div>
    </Card>
  );
}

function AddPartModal({ job, onClose, onAdd, busy }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState(1);
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 200); return () => clearTimeout(t); }, [q]);
  const { data, loading, error } = useApi(`/api/pricebook?q=${encodeURIComponent(dq)}`);
  const items = (data || []).slice().sort((a, b) => (b.trade === job.trade) - (a.trade === job.trade));
  return (
    <Modal title={`Add to ${job.number}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!sel || busy || !(qty > 0)} onClick={() => onAdd(sel, Number(qty))}>
        {busy ? "Adding…" : sel ? `Add ${sel.name} · ${money(Math.round(sel.unit_price_cents * (Number(qty) || 0)))}` : "Pick an item"}</Button></>}>
      <input autoFocus placeholder="Search parts and services" value={q} onChange={(e) => setQ(e.target.value)} />
      <ErrorBox error={error} />
      <div className="jd-pb">
        {loading && !data ? <Loading /> : items.length === 0 ? <Empty>No match in the price book.</Empty> : items.map((it) => (
          <button key={it.id} className={`jd-pb-item ${sel?.id === it.id ? "on" : ""}`} onClick={() => setSel(it)}>
            <div style={{ textAlign: "left", minWidth: 0 }}><div style={{ fontWeight: 550 }}>{it.name}</div><div className="muted small">{it.code} · {it.kind} · {it.trade}</div></div>
            <div className="spacer" /><Money cents={it.unit_price_cents} />
          </button>
        ))}
      </div>
      <Field label="Quantity"><input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} style={{ maxWidth: 120 }} /></Field>
      <div className="muted small">Member pricing is applied automatically for plan members.</div>
    </Modal>
  );
}

// ---------- profit ----------
function Profit({ job }) {
  const p = job.profit;
  if (!p) return null;
  const margin = pct(p.profit_cents, p.price_cents);
  const tone = margin >= 40 ? "var(--green)" : margin >= 20 ? "var(--amber)" : "var(--red)";
  const w = (v) => `${Math.max(0, pct(v, p.price_cents))}%`;
  return (
    <Card title="Job profit" actions={<span className="muted small">Office only</span>}>
      <div className="row between" style={{ alignItems: "flex-end" }}>
        <div><div className="muted small">Profit</div><div style={{ fontSize: 24, fontWeight: 700, color: p.profit_cents < 0 ? "var(--red)" : undefined }}><Money cents={p.profit_cents} /></div></div>
        <div style={{ textAlign: "right" }}><div className="muted small">Margin</div><div style={{ fontSize: 20, fontWeight: 700, color: tone }}>{margin}%</div></div>
      </div>
      {p.price_cents > 0 && (
        <div className="jd-bar">
          <span style={{ width: w(p.parts_cost_cents), background: "var(--amber)" }} title="Parts" />
          <span style={{ width: w(p.labor_cost_cents), background: "var(--blue)" }} title="Labour" />
          <span style={{ width: w(p.profit_cents), background: "var(--green)" }} title="Profit" />
        </div>
      )}
      <div className="col" style={{ gap: 4, marginTop: 10 }}>
        <div className="row between small"><span className="muted">Price (before tax)</span><Money cents={p.price_cents} /></div>
        <div className="row between small"><span><span className="dot" style={{ background: "var(--amber)" }} /> <span className="muted">Parts cost</span></span><span>−<Money cents={p.parts_cost_cents} /></span></div>
        <div className="row between small"><span><span className="dot" style={{ background: "var(--blue)" }} /> <span className="muted">Labour cost{job.labor_minutes ? ` (${job.labor_minutes < 60 ? `${job.labor_minutes} min` : `${Math.round(job.labor_minutes / 6) / 10} h`})` : ""}</span></span><span>−<Money cents={p.labor_cost_cents} /></span></div>
      </div>
      {!job.labor_minutes && !["completed", "invoiced", "paid"].includes(job.status) && <div className="muted small" style={{ marginTop: 8 }}>Labour is counted from the tech's clock when the job is finished.</div>}
    </Card>
  );
}

// ---------- invoice ----------
function InvoiceBox({ job, onCreate, busy }) {
  const inv = job.invoice;
  if (inv) {
    return (
      <Card title="Invoice" actions={<Status s={inv.status} />}>
        <div className="row between"><Link to={`/invoices/${inv.id}`} style={{ fontWeight: 650, fontSize: 15 }}>{inv.number} →</Link><span className="muted small">due {day(inv.due_on)}</span></div>
        <div className="grid g2" style={{ marginTop: 10, gap: 8 }}>
          <div><div className="muted small">Total</div><div style={{ fontWeight: 650 }}><Money cents={inv.total_cents} /></div></div>
          <div><div className="muted small">Balance</div><div style={{ fontWeight: 650, color: inv.balance_cents > 0 ? "var(--amber)" : "var(--green)" }}><Money cents={inv.balance_cents} /></div></div>
        </div>
        {inv.deposits_applied_cents > 0 && <div className="muted small" style={{ marginTop: 6 }}>Includes <Money cents={inv.deposits_applied_cents} /> deposit already paid</div>}
      </Card>
    );
  }
  if (job.status === "completed") {
    return (
      <div className="card pad jd-cta">
        <div style={{ fontWeight: 650 }}>Ready to bill</div>
        <div className="muted small" style={{ margin: "2px 0 10px" }}>Turn this job into an invoice with one click. Lines, photos and signature carry over.</div>
        <Button variant="primary" block onClick={onCreate} disabled={busy}>{busy ? "Creating…" : `Create invoice · ${money(job.totals.total_cents)}`}</Button>
      </div>
    );
  }
  return null;
}

// ---------- checklist ----------
function Checklist({ job, people, onToggle, busy }) {
  const done = job.checklist.filter((i) => i.done).length;
  return (
    <Card title="Checklist" actions={<span className="muted small">{done}/{job.checklist.length} done</span>}>
      {job.checklist.length === 0 ? <div className="muted">No checklist for this job type.</div> : (
        <div className="col" style={{ gap: 2 }}>
          {job.checklist.map((i) => (
            <label key={i.id} className={`jd-check ${i.done ? "done" : ""}`}>
              <input type="checkbox" checked={!!i.done} disabled={busy === `ck:${i.id}`} onChange={() => onToggle(i)} />
              <span style={{ flex: 1 }}>{i.label}</span>
              {i.required && !i.done && <Pill tone="amber">Required</Pill>}
              {i.done && i.done_by && <span className="muted small">{people[i.done_by]?.name?.split(" ")[0] || ""}{i.done_at ? ` · ${time(i.done_at)}` : ""}</span>}
            </label>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------- photos ----------
function Photos({ job, people, onAdd, onOpen, busy }) {
  const inputs = useRef({});
  return (
    <Card title="Photos" actions={<span className="muted small">{job.photos.length} photo{job.photos.length === 1 ? "" : "s"}</span>}>
      <div className="jd-photo-groups">
        {STAGES.map(([stage, label]) => {
          const list = job.photos.filter((p) => p.stage === stage);
          return (
            <div key={stage}>
              <div className="row" style={{ marginBottom: 6 }}><h3>{label}</h3><span className="muted small">{list.length}</span></div>
              <div className="jd-photos">
                {list.map((p) => (
                  <button key={p.id} className="jd-photo" onClick={() => onOpen(p)} title={`${p.caption || label} · ${people[p.by]?.name || ""}`}>
                    {p.url ? <img src={p.url} alt={p.caption || label} /> : <span className="jd-photo-ph">📷<span>{p.caption || label}</span></span>}
                  </button>
                ))}
                <button className="jd-photo add" onClick={() => inputs.current[stage]?.click()} disabled={busy === `ph:${stage}`}>
                  {busy === `ph:${stage}` ? "Uploading…" : "+ Add"}
                </button>
                <input ref={(el) => { inputs.current[stage] = el; }} type="file" accept="image/*" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onAdd(stage, f); }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- signature ----------
function Signature({ job, onSign, busy }) {
  const [name, setName] = useState(job.customer?.name || "");
  const canvas = useRef(null);
  const drawing = useRef(false);
  const [inked, setInked] = useState(false);
  const sig = job.signature;

  const pos = (e) => { const r = canvas.current.getBoundingClientRect(); return [(e.clientX - r.left) * (canvas.current.width / r.width), (e.clientY - r.top) * (canvas.current.height / r.height)]; };
  const down = (e) => { drawing.current = true; const ctx = canvas.current.getContext("2d"); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#15181d"; ctx.beginPath(); ctx.moveTo(...pos(e)); canvas.current.setPointerCapture(e.pointerId); };
  const move = (e) => { if (!drawing.current) return; const ctx = canvas.current.getContext("2d"); ctx.lineTo(...pos(e)); ctx.stroke(); setInked(true); };
  const up = () => { drawing.current = false; };
  const clear = () => { canvas.current.getContext("2d").clearRect(0, 0, canvas.current.width, canvas.current.height); setInked(false); };

  if (sig) {
    return (
      <Card title="Customer signature" actions={<Pill tone="green">Signed</Pill>}>
        {sig.image ? <img src={sig.image} alt={`Signature of ${sig.name}`} className="jd-sig-img" /> : <div className="jd-sig-name">{sig.name}</div>}
        <div className="muted small" style={{ marginTop: 6 }}>Signed by <b style={{ color: "var(--ink)" }}>{sig.name}</b>{sig.at ? ` · ${when(sig.at)}` : ""}</div>
      </Card>
    );
  }
  return (
    <Card title="Customer signature" actions={job.status === "in_progress" || job.status === "on_site" ? <Pill tone="amber">Needed to finish</Pill> : null}>
      <div className="col">
        <div className="jd-pad">
          <canvas ref={canvas} width={600} height={160} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
          {!inked && <span className="jd-pad-hint">Sign here</span>}
          {inked && <button className="btn ghost sm jd-pad-clear" onClick={clear}>Clear</button>}
        </div>
        <Field label="Signer's name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer's full name" /></Field>
        <Button disabled={!name.trim() || busy} onClick={() => onSign(name.trim(), inked ? canvas.current.toDataURL("image/png") : "")}>{busy ? "Saving…" : "Save signature"}</Button>
      </div>
    </Card>
  );
}

// ---------- site & equipment ----------
function SiteCard({ job }) {
  const s = job.site;
  if (!s) return null;
  return (
    <Card title="Site">
      <div style={{ fontWeight: 600 }}>{s.label || "Site"}</div>
      <div className="small">{s.address}{s.city ? `, ${s.city}` : ""}{s.postcode ? ` ${s.postcode}` : ""}</div>
      <a className="small" href={`https://maps.google.com/?q=${encodeURIComponent([s.address, s.city, s.postcode].filter(Boolean).join(", "))}`} target="_blank" rel="noreferrer">Open in Maps ↗</a>
      <div className="jd-note" style={{ marginTop: 10 }}>
        <div className="muted small" style={{ fontWeight: 600 }}>Site notes</div>
        <div className="small" style={{ whiteSpace: "pre-wrap" }}>{s.access_notes || <span className="muted">No access notes yet.</span>}</div>
      </div>
    </Card>
  );
}

function Equipment({ job }) {
  if (!job.equipment?.length) return <Card title="Equipment"><div className="muted small">No equipment linked to this job.</div></Card>;
  return (
    <Card title="Equipment" pad={false}>
      {job.equipment.map((eq) => <EquipmentRow key={eq.id} eq={eq} />)}
    </Card>
  );
}

function EquipmentRow({ eq }) {
  const today = new Date().toISOString().slice(0, 10);
  const age = eq.installed_on ? Math.floor((Date.now() - new Date(eq.installed_on).getTime()) / (365.25 * 864e5)) : null;
  const warrantyOk = eq.warranty_until && eq.warranty_until >= today;
  return (
    <div className="jd-eq">
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div><div style={{ fontWeight: 600 }}>{eq.type}</div><div className="small">{[eq.make, eq.model].filter(Boolean).join(" ")}</div></div>
        {eq.warranty_until && <Pill tone={warrantyOk ? "green" : "grey"}>{warrantyOk ? `Warranty to ${eq.warranty_until.slice(0, 4)}` : "Out of warranty"}</Pill>}
      </div>
      <div className="muted small" style={{ marginTop: 4 }}>
        {eq.serial && <>S/N {eq.serial}</>}{eq.installed_on && <> · installed {eq.installed_on.slice(0, 4)}{age != null ? ` (${age} yr${age === 1 ? "" : "s"})` : ""}</>}
      </div>
    </div>
  );
}

// ---------- notes & timeline ----------
function Notes({ job, onAdd, busy }) {
  const [text, setText] = useState("");
  const [forCustomer, setForCustomer] = useState(false);
  const submit = async () => { if (!text.trim()) return; await onAdd(text.trim(), forCustomer); setText(""); };
  return (
    <Card title="Notes">
      <div className="grid g2">
        <div className="jd-note">
          <div className="muted small" style={{ fontWeight: 600 }}>Internal <span style={{ fontWeight: 400 }}>· team only</span></div>
          <div className="small" style={{ whiteSpace: "pre-wrap" }}>{job.notes_internal || <span className="muted">Nothing yet.</span>}</div>
        </div>
        <div className="jd-note cust">
          <div className="muted small" style={{ fontWeight: 600 }}>For the customer <span style={{ fontWeight: 400 }}>· on their invoice</span></div>
          <div className="small" style={{ whiteSpace: "pre-wrap" }}>{job.notes_customer || <span className="muted">Nothing yet.</span>}</div>
        </div>
      </div>
      <div className="col" style={{ marginTop: 12, gap: 8 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={forCustomer ? "Write a note the customer will see…" : "Add an internal note…"} style={{ minHeight: 56 }} />
        <div className="row">
          <label className="check small"><input type="checkbox" checked={forCustomer} onChange={(e) => setForCustomer(e.target.checked)} /> Visible to customer</label>
          <div className="spacer" />
          <Button size="sm" onClick={submit} disabled={busy || !text.trim()}>{busy ? "Adding…" : "Add note"}</Button>
        </div>
      </div>
    </Card>
  );
}

function Timeline({ job, people }) {
  const items = [...(job.timeline || [])].reverse();
  const who = (by) => people[by]?.name || (by === "customer" ? "Customer" : by === "system" ? "Job OS" : "Team");
  return (
    <Card title="Timeline">
      {items.length === 0 ? <div className="muted">No activity yet.</div> : (
        <div className="jd-tl">
          {items.map((t, i) => (
            <div key={i} className="jd-tl-item">
              <span className="jd-tl-dot" />
              <div style={{ minWidth: 0 }}>
                <div>{t.text}</div>
                <div className="muted small">{who(t.by)} · {when(t.at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ReasonModal({ to, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const cancel = to === "cancelled";
  const presets = cancel ? ["Customer cancelled", "Duplicate job", "Rebooked as a new job"] : ["Customer not home", "Needs a part we don't carry", "Needs a quote first", "Access problem"];
  return (
    <Modal title={cancel ? "Cancel this job?" : "Couldn't complete the job"} onClose={onClose}
      footer={<><Button onClick={onClose}>Back</Button><Button variant="primary" disabled={busy || (!cancel && !reason.trim())} onClick={() => onConfirm(reason.trim())}>{cancel ? "Cancel job" : "Save"}</Button></>}>
      <div className="muted small">{cancel ? "The customer won't be charged. You can reopen it later." : "Tell the office why, so they can rebook or follow up."}</div>
      <div className="row wrap" style={{ gap: 6 }}>{presets.map((p) => <button key={p} className={`pill ${reason === p ? "blue" : "grey"}`} style={{ border: 0, cursor: "pointer" }} onClick={() => setReason(p)}>{p}</button>)}</div>
      <Field label={cancel ? "Reason (optional)" : "Reason"}><textarea value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}

const CSS = `
.jd-page { max-width: 1360px; }
.jd-sub { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; margin-top: 4px; }
.jd-steps { display: flex; padding: 14px 10px; margin-bottom: 14px; overflow-x: auto; }
.jd-step { flex: 1; min-width: 86px; display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; text-align: center; }
.jd-step:not(:first-child)::before { content: ""; position: absolute; top: 12px; right: 50%; width: 100%; height: 2px; background: var(--line); z-index: 0; }
.jd-step.done:not(:first-child)::before, .jd-step.cur:not(:first-child)::before { background: var(--brand); }
.jd-dot { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 650; background: var(--surface-2); color: var(--ink-3); position: relative; z-index: 1; border: 2px solid var(--surface); }
.jd-step.done .jd-dot { background: var(--brand); color: var(--brand-ink); }
.jd-step.cur .jd-dot { background: var(--brand); color: var(--brand-ink); box-shadow: 0 0 0 4px var(--brand-soft); }
.jd-step-l { font-size: 12.5px; font-weight: 550; color: var(--ink-3); }
.jd-step.cur .jd-step-l, .jd-step.done .jd-step-l { color: var(--ink); }
.jd-step-t { font-size: 11px; color: var(--ink-3); }
.jd-banner { border-radius: var(--radius); padding: 12px 14px; margin-bottom: 14px; }
.jd-banner ul { margin: 6px 0 0 18px; padding: 0; }
.jd-banner.warn { background: var(--amber-soft); color: #7a3d06; }
.jd-banner.bad { background: var(--red-soft); color: var(--red); }
.jd-grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(300px, 1fr); gap: 14px; align-items: start; margin-top: 14px; }
@media (max-width: 1050px) { .jd-grid { grid-template-columns: 1fr; } }
.jd-totals { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; margin-left: auto; max-width: 320px; }
.jd-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--surface-2); margin-top: 12px; }
.jd-bar span { display: block; height: 100%; }
.jd-cta { border-color: var(--green); background: linear-gradient(0deg, var(--surface), var(--green-soft)); }
.jd-check { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-radius: 8px; cursor: pointer; }
.jd-check:hover { background: var(--surface-2); }
.jd-check input { width: 18px; height: 18px; flex: none; accent-color: var(--brand); }
.jd-check.done span:first-of-type { color: var(--ink-3); text-decoration: line-through; }
.jd-photo-groups { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 700px) { .jd-photo-groups { grid-template-columns: 1fr; } }
.jd-photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px; }
.jd-photo { aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--line); background: var(--surface-2); padding: 0; cursor: pointer; font: inherit; }
.jd-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.jd-photo-ph { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; font-size: 20px; gap: 2px; }
.jd-photo-ph span { font-size: 10.5px; color: var(--ink-3); max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jd-photo.add { border: 1.5px dashed var(--line-2); background: var(--surface); color: var(--brand); font-weight: 600; font-size: 12px; }
.jd-photo.add:hover { background: var(--brand-soft); border-color: var(--brand); }
.jd-pad { position: relative; border: 1.5px dashed var(--line-2); border-radius: 10px; background: var(--surface); }
.jd-pad canvas { width: 100%; height: 110px; display: block; touch-action: none; cursor: crosshair; }
.jd-pad-hint { position: absolute; left: 14px; bottom: 10px; color: var(--ink-3); font-size: 12px; pointer-events: none; }
.jd-pad-clear { position: absolute; right: 6px; top: 6px; }
.jd-sig-img { width: 100%; max-height: 110px; object-fit: contain; background: var(--surface-2); border-radius: 8px; }
.jd-sig-name { font-family: "Brush Script MT", "Segoe Script", cursive; font-size: 30px; padding: 6px 10px; background: var(--surface-2); border-radius: 8px; }
.jd-note { background: var(--surface-2); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
.jd-note.cust { background: var(--brand-soft); }
.jd-eq { padding: 12px 16px; border-bottom: 1px solid var(--line); }
.jd-eq:last-child { border-bottom: 0; }
.jd-hist { display: flex; gap: 10px; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--line); font-size: 13px; }
.jd-hist:last-child { border-bottom: 0; }
.jd-tl { display: flex; flex-direction: column; gap: 0; max-height: 380px; overflow: auto; }
.jd-tl-item { display: flex; gap: 12px; padding: 6px 0; position: relative; }
.jd-tl-item:not(:last-child)::after { content: ""; position: absolute; left: 4px; top: 18px; bottom: -6px; width: 2px; background: var(--line); }
.jd-tl-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--brand); margin-top: 5px; flex: none; }
.jd-pb { display: flex; flex-direction: column; gap: 4px; max-height: 40vh; overflow: auto; }
.jd-pb-item { display: flex; align-items: center; gap: 10px; border: 1px solid var(--line); border-radius: 9px; padding: 8px 12px; background: var(--surface); font: inherit; color: inherit; cursor: pointer; }
.jd-pb-item:hover { background: var(--surface-2); }
.jd-pb-item.on { border-color: var(--brand); background: var(--brand-soft); }
`;

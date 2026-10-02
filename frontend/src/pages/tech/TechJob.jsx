// Technician job screen: everything needed on site, then "Get paid". Works offline: writes go through api.techWrite,
// a queued write updates the screen optimistically and syncs later.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, ErrorBox, Modal, Money, Status, useToast } from "../../components/ui";
import { api, flushQueue, queueSize } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { day, money, time } from "../../lib/format";
import { useApi } from "../../lib/useApi";

// ---------- small helpers (page-local) ----------
function readCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}
function writeCache(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full: photos are big, skip caching */ }
}
const tmpId = () => "tmp" + Math.random().toString(16).slice(2, 10);
const mapsUrl = (a) => `https://maps.google.com/?q=${encodeURIComponent(a || "")}`;
const telUrl = (p) => `tel:${String(p || "").replace(/[^0-9+]/g, "")}`;
const smsUrl = (p) => `sms:${String(p || "").replace(/[^0-9+]/g, "")}`;
const FINISHED = ["completed", "invoiced", "paid"];

function resizeImage(file, max = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("Couldn't read that photo")); };
    img.src = src;
  });
}

function useQueueSize() {
  const [n, setN] = useState(queueSize());
  useEffect(() => {
    const f = () => setN(queueSize());
    window.addEventListener("jobos-queue", f);
    return () => window.removeEventListener("jobos-queue", f);
  }, []);
  return n;
}

// ---------- icons ----------
const I = {
  back: <path d="M15 6l-6 6 6 6" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  msg: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  nav: <path d="M3 11l18-8-8 18-2-8-8-2z" />,
  key: <><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2" /></>,
  cam: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  tool: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />,
  card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  cash: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
};
const Ico = ({ n, size = 18, sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none" }}>{I[n]}</svg>
);

// ---------- page ----------
export default function TechJob() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { rules } = useAuth();
  const seePrices = !!rules?.visibility?.tech_sees_prices;
  const cacheKey = `jobos.tech.job.${id}`;
  const { data, error, reload } = useApi(`/api/jobs/${id}`);
  const [job, setJob] = useState(() => readCache(cacheKey));
  const [stale, setStale] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finishErrors, setFinishErrors] = useState(null);
  const [ncOpen, setNcOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const queued = useQueueSize();
  const jobRef = useRef(job);
  jobRef.current = job;

  useEffect(() => {
    if (data) { setJob(data); setStale(false); writeCache(cacheKey, data); }
  }, [data, cacheKey]);
  useEffect(() => {
    if (error && error.status === undefined && readCache(cacheKey)) setStale(true);
  }, [error, cacheKey]);
  useEffect(() => { if (!queued) setSavedOffline(false); }, [queued]);
  useEffect(() => {
    if (queueSize() && navigator.onLine) flushQueue().then((n) => n && reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // One write path for the whole screen. `optimistic(job)` returns the job as it will look after the write.
  const write = useCallback(async (path, body, { optimistic, eager = true, ok } = {}) => {
    const before = jobRef.current;
    if (optimistic && eager) setJob((j) => optimistic(j));
    try {
      const r = await api.techWrite(`/api/jobs/${id}${path}`, body);
      if (r?.queued) {
        setJob((j) => {
          const n = optimistic && !eager ? optimistic(j) : j;
          writeCache(cacheKey, n);
          return n;
        });
        setSavedOffline(true);
        toast("Saved offline, will sync");
      } else {
        if (ok) toast(ok);
        reload();
      }
      return r;
    } catch (e) {
      if (optimistic && eager && before) setJob(before);
      throw e;
    }
  }, [id, cacheKey, reload, toast]);

  const setStatus = async (to, reason) => {
    setBusy(true);
    setFinishErrors(null);
    const ok = { en_route: "Customer texted: you're on the way", on_site: "Arrived. Clock started", in_progress: "Work started",
      paused: "Job paused", completed: "Job finished", non_complete: "Marked as not completed" }[to];
    try {
      const r = await write("/status", reason ? { to, reason } : { to }, { optimistic: (j) => ({ ...j, status: to }), eager: false, ok });
      if (to === "completed") setPayOpen(true);
      if (to === "non_complete") setNcOpen(false);
      return r;
    } catch (e) {
      if (e.status === 422) setFinishErrors(e.errors?.length ? e.errors : [e.message]);
      else toast(e, true);
    } finally { setBusy(false); }
  };

  if (!job) {
    return (
      <div className="phone">
        <div className="phone-head"><Link to="/tech" className="btn ghost sm" aria-label="Back"><Ico n="back" /></Link><h2>Job</h2></div>
        <div className="phone-body">{error ? <ErrorBox error={error} /> : <div className="empty">Loading job…</div>}</div>
      </div>
    );
  }

  if (payOpen) {
    return <GetPaid job={job} seePrices={seePrices} onBack={() => { setPayOpen(false); reload(); }} />;
  }

  const working = ["on_site", "in_progress", "paused"].includes(job.status);
  const finished = FINISHED.includes(job.status);
  const custFirst = (job.customer?.name || "").split(" ")[0];
  const address = job.site ? [job.site.address, job.site.city].filter(Boolean).join(", ") : "";

  return (
    <div className="phone">
      <style>{CSS}</style>
      <div className="phone-head">
        <Link to="/tech" className="tj-back" aria-label="Back to today"><Ico n="back" size={22} /></Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 650, fontSize: 15 }} className="tj-ellipsis">{job.customer?.name}</div>
          <div className="muted small">{job.number} · {job.scheduled_start ? `${day(job.scheduled_start)}, ${time(job.scheduled_start)}–${time(job.scheduled_end)}` : "Not scheduled"}</div>
        </div>
        <Status s={job.status} />
      </div>

      <div className="phone-body">
        {stale && <div className="callout small">Offline: showing this job as of your last sync.</div>}
        {savedOffline && queued > 0 && (
          <div className="tj-offline"><span className="dot" style={{ background: "var(--amber)" }} /> Saved offline, will sync ({queued} waiting)</div>
        )}

        <div className="tj-hero">
          <div className="tj-eyebrow">{(job.job_type || "").replace(/_/g, " ")}{job.trade ? ` · ${job.trade.toUpperCase()}` : ""}</div>
          <h1 style={{ fontSize: 23, marginTop: 4 }}>{job.title}</h1>
          {job.priority && job.priority !== "normal" && <span className="pill red" style={{ marginTop: 8 }}>{job.priority}</span>}
        </div>

        {/* customer + site */}
        <div className="card">
          <div style={{ padding: 16 }}>
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 650, fontSize: 16 }}>{job.customer?.name}</div>
                {job.customer?.phone && <div className="muted">{job.customer.phone}</div>}
                {address && <div style={{ marginTop: 6, color: "var(--ink-2)" }}>{address}{job.site?.postcode ? ` ${job.site.postcode}` : ""}</div>}
              </div>
              {job.customer?.type === "commercial" && <span className="pill blue">Commercial</span>}
            </div>
            {job.site?.access_notes && (
              <div className="tj-access"><Ico n="key" /><div><div className="tj-mini">Access notes</div>{job.site.access_notes}</div></div>
            )}
          </div>
          <div className="tj-actions">
            <a className="tj-act" href={telUrl(job.customer?.phone)} aria-disabled={!job.customer?.phone}><Ico n="phone" /> Call</a>
            <a className="tj-act" href={smsUrl(job.customer?.phone)}><Ico n="msg" /> Text</a>
            <a className="tj-act" href={mapsUrl(address)} target="_blank" rel="noreferrer"><Ico n="nav" /> Navigate</a>
          </div>
        </div>

        {/* what's left before finishing */}
        {working && (
          job.completion_errors?.length ? (
            <div className="card tj-todo">
              <div className="tj-mini" style={{ color: "var(--amber)" }}>Before you can finish</div>
              {job.completion_errors.map((e) => <div key={e} className="tj-todo-row"><span className="dot" style={{ background: "var(--amber)" }} />{e}</div>)}
            </div>
          ) : (
            <div className="card tj-todo" style={{ background: "var(--green-soft)", borderColor: "transparent" }}>
              <div className="row" style={{ color: "var(--green)", fontWeight: 650 }}><Ico n="check" /> Proof of work complete. Ready to finish.</div>
            </div>
          )
        )}

        <Equipment job={job} />
        <Checklist job={job} write={write} toast={toast} locked={finished} />
        <Photos job={job} write={write} toast={toast} />
        <Parts job={job} write={write} toast={toast} seePrices={seePrices} locked={finished} />
        <Notes job={job} write={write} toast={toast} />
        <Signature job={job} write={write} toast={toast} />

        {job.history?.length > 0 && (
          <Section title="Past visits here">
            {job.history.map((h) => (
              <div key={h.number} className="tj-line">
                <div style={{ flex: 1, minWidth: 0 }}><div className="tj-ellipsis">{h.title}</div><div className="muted small">{h.number} · {day(h.date)}</div></div>
                <Status s={h.status} />
              </div>
            ))}
          </Section>
        )}
        {job.status === "non_complete" && job.non_complete_reason && (
          <div className="callout">Not completed: {job.non_complete_reason}</div>
        )}
        <div style={{ height: 40 }} />
      </div>

      <Footer job={job} busy={busy} custFirst={custFirst}
        onStatus={setStatus} onNC={() => setNcOpen(true)} onPay={() => setPayOpen(true)} onHome={() => nav("/tech")} />

      {finishErrors && (
        <Modal title="Can't finish yet" onClose={() => setFinishErrors(null)}
          footer={<Button variant="primary" onClick={() => setFinishErrors(null)}>Got it</Button>}>
          <div className="col">
            <div className="muted">Finish these first, then tap <b>Finish job</b> again:</div>
            {finishErrors.map((e) => (
              <div key={e} className="tj-err-row"><span className="tj-err-x">!</span>{e}</div>
            ))}
          </div>
        </Modal>
      )}
      {ncOpen && <NonComplete busy={busy} onClose={() => setNcOpen(false)} onSubmit={(reason) => setStatus("non_complete", reason)} />}
    </div>
  );
}

function Section({ title, right, children, id }) {
  return (
    <section className="card" id={id}>
      <div className="tj-sec-head"><h2>{title}</h2><div className="spacer" />{right}</div>
      <div>{children}</div>
    </section>
  );
}

// ---------- footer: the one big button ----------
function Footer({ job, busy, custFirst, onStatus, onNC, onPay, onHome }) {
  const s = job.status;
  const main = {
    scheduled: { label: "On my way", go: () => onStatus("en_route"), sub: `Texts ${custFirst || "the customer"} that you're coming` },
    en_route: { label: "Arrived", go: () => onStatus("on_site") },
    on_site: { label: "Start work", go: () => onStatus("in_progress") },
    in_progress: { label: "Finish job", go: () => onStatus("completed"), green: true },
    paused: { label: "Resume work", go: () => onStatus("in_progress") },
    completed: { label: "Get paid", go: onPay, green: true },
    invoiced: { label: "Get paid", go: onPay, green: true },
    paid: { label: "Paid ✓  Back to today", go: onHome },
  }[s] || { label: "Back to today", go: onHome };
  return (
    <div className="phone-foot">
      <Button variant="primary" size="lg" block disabled={busy} onClick={main.go}
        style={{ height: 54, fontSize: 17, ...(main.green ? { background: "var(--green)", borderColor: "var(--green)" } : {}) }}>
        {busy ? "Saving…" : main.label}
      </Button>
      {(["on_site", "in_progress", "paused"].includes(s) || main.sub) && (
        <div className="row" style={{ justifyContent: "center", gap: 6, marginTop: 6 }}>
          {main.sub && <span className="muted small">{main.sub}</span>}
          {s === "in_progress" && <button className="btn ghost sm" disabled={busy} onClick={() => onStatus("paused")}>Pause</button>}
          {["on_site", "in_progress", "paused"].includes(s) && <button className="btn ghost sm danger" disabled={busy} onClick={onNC}>Couldn't complete</button>}
        </div>
      )}
    </div>
  );
}

function NonComplete({ busy, onClose, onSubmit }) {
  const REASONS = ["Customer not home", "Needs parts", "Needs a quote for bigger work", "Out of time", "Unsafe to work"];
  const [pick, setPick] = useState("");
  const [more, setMore] = useState("");
  const reason = [pick, more.trim()].filter(Boolean).join(": ");
  return (
    <Modal title="Couldn't complete the job?" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!reason || busy} onClick={() => onSubmit(reason)}>Save</Button></>}>
      <div className="col">
        <div className="muted">The office will see the reason and rebook it.</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {REASONS.map((r) => (
            <button key={r} className={`tj-chip ${pick === r ? "on" : ""}`} onClick={() => setPick(pick === r ? "" : r)}>{r}</button>
          ))}
        </div>
        <textarea rows={3} placeholder="Add details (optional)" value={more} onChange={(e) => setMore(e.target.value)} />
      </div>
    </Modal>
  );
}

// ---------- equipment ----------
function Equipment({ job }) {
  if (!job.equipment?.length) return null;
  const year = new Date().getFullYear();
  return (
    <Section title="Equipment">
      {job.equipment.map((e) => {
        const age = e.installed_on ? year - Number(e.installed_on.slice(0, 4)) : null;
        const inWarranty = e.warranty_until && e.warranty_until >= new Date().toISOString().slice(0, 10);
        return (
          <div key={e.id} className="tj-eq">
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 650 }}>{e.type}</div>
                <div className="muted small">{[e.make, e.model].filter(Boolean).join(" ")}{e.serial ? ` · SN ${e.serial}` : ""}</div>
              </div>
              {e.warranty_until && <span className={`pill ${inWarranty ? "green" : "grey"}`}>{inWarranty ? "In warranty" : "Warranty expired"}</span>}
            </div>
            {age != null && <div className="small" style={{ marginTop: 4, color: age >= 12 ? "var(--amber)" : "var(--ink-3)" }}>Installed {e.installed_on.slice(0, 4)} · {age} yr{age === 1 ? "" : "s"} old{age >= 12 ? " (replacement candidate)" : ""}</div>}
          </div>
        );
      })}
    </Section>
  );
}

// ---------- checklist ----------
function Checklist({ job, write, toast, locked }) {
  const items = job.checklist || [];
  if (!items.length) return null;
  const done = items.filter((i) => i.done).length;
  const toggle = async (item) => {
    if (locked) return;
    try {
      await write(`/checklist/${item.id}`, { done: !item.done },
        { optimistic: (j) => ({ ...j, checklist: j.checklist.map((i) => (i.id === item.id ? { ...i, done: !item.done } : i)) }) });
    } catch (e) { toast(e, true); }
  };
  return (
    <Section title="Checklist" id="tj-checklist" right={<span className={`pill ${done === items.length ? "green" : "grey"}`}>{done}/{items.length}</span>}>
      {items.map((i) => (
        <button key={i.id} className={`tj-check ${i.done ? "on" : ""}`} onClick={() => toggle(i)} disabled={locked} aria-pressed={i.done}>
          <span className="tj-box">{i.done && <Ico n="check" size={16} sw={3} />}</span>
          <span style={{ flex: 1, textAlign: "left" }}>{i.label}</span>
          {i.required && !i.done && <span className="tj-req">Required</span>}
        </button>
      ))}
    </Section>
  );
}

// ---------- photos ----------
function Photos({ job, write, toast }) {
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState("");
  const add = async (stage, file) => {
    if (!file) return;
    setBusy(stage);
    try {
      const url = await resizeImage(file);
      const photo = { id: tmpId(), stage, url, caption: "", at: new Date().toISOString() };
      await write("/photos", { stage, url }, { optimistic: (j) => ({ ...j, photos: [...(j.photos || []), photo] }) });
    } catch (e) { toast(e, true); } finally { setBusy(""); }
  };
  const photos = job.photos || [];
  return (
    <Section title="Photos" id="tj-photos" right={<span className="muted small">{photos.length} total</span>}>
      {["before", "during", "after"].map((stage) => {
        const list = photos.filter((p) => p.stage === stage);
        return (
          <div key={stage} className="tj-stage">
            <div className="tj-mini" style={{ textTransform: "capitalize", marginBottom: 8 }}>{stage} <span style={{ fontWeight: 500 }}>· {list.length}</span></div>
            <div className="tj-thumbs">
              {list.map((p) => (
                <button key={p.id} className="tj-thumb" onClick={() => setView(p)} aria-label={`${stage} photo`}>
                  {p.url ? <img src={p.url} alt={p.caption || `${stage} photo`} /> : <span className="tj-ph"><Ico n="cam" size={20} /><span>{p.caption || "Photo"}</span></span>}
                </button>
              ))}
              <label className="tj-thumb tj-add">
                <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(stage, e.target.files?.[0]); e.target.value = ""; }} />
                {busy === stage ? <span className="small">Saving…</span> : <><Ico n="cam" size={22} /><span className="small">Add</span></>}
              </label>
            </div>
          </div>
        );
      })}
      {view && (
        <Modal title={`${view.stage[0].toUpperCase()}${view.stage.slice(1)} photo`} onClose={() => setView(null)}>
          {view.url ? <img src={view.url} alt="" style={{ width: "100%", borderRadius: 10, display: "block" }} />
            : <div className="empty">This photo was taken on another device and isn't stored in the demo.</div>}
          <div className="muted small" style={{ marginTop: 8 }}>{view.caption ? `${view.caption} · ` : ""}{view.at ? `${day(view.at)} ${time(view.at)}` : ""}</div>
        </Modal>
      )}
    </Section>
  );
}

// ---------- parts ----------
function Parts({ job, write, toast, seePrices, locked }) {
  const [open, setOpen] = useState(false);
  const lines = job.lines || [];
  const showPrice = seePrices && lines.some((l) => l.total_cents != null);
  const sum = lines.filter((l) => !l.optional).reduce((s, l) => s + (l.total_cents || 0), 0);
  return (
    <Section title="Parts & services" right={!locked && <button className="btn sm" onClick={() => setOpen(true)}><Ico n="plus" size={15} /> Add</button>}>
      {lines.length === 0 && <div className="tj-line muted">Nothing added yet. Add parts as you use them.</div>}
      {lines.map((l) => (
        <div key={l.id} className="tj-line">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="tj-ellipsis">{l.name}{l.pending && <span className="muted small"> · syncing</span>}</div>
            <div className="muted small">Qty {l.qty}{l.code ? ` · ${l.code}` : ""}{l.member_price_applied ? " · member price" : ""}</div>
          </div>
          {showPrice && l.total_cents != null && <Money cents={l.total_cents} />}
        </div>
      ))}
      {showPrice && lines.length > 0 && (
        <div className="tj-line" style={{ fontWeight: 650 }}><span style={{ flex: 1 }}>Subtotal (before tax)</span><Money cents={sum} /></div>
      )}
      {open && <PartPicker seePrices={seePrices} onClose={() => setOpen(false)} onAdd={async (item, qty) => {
        try {
          await write("/parts", { item_id: item.id, qty }, {
            optimistic: (j) => ({ ...j, lines: [...(j.lines || []), { id: tmpId(), name: item.name, code: item.code, qty, pending: true,
              ...(seePrices && item.unit_price_cents != null ? { unit_price_cents: item.unit_price_cents, total_cents: item.unit_price_cents * qty } : {}) }] }),
            ok: `Added ${item.name}`,
          });
          setOpen(false);
        } catch (e) { toast(e, true); }
      }} />}
    </Section>
  );
}

const PB_CACHE = "jobos.tech.pricebook";
function PartPicker({ seePrices, onClose, onAdd }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [offline, setOffline] = useState(false);
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState(1);
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      try {
        const r = await api.get(`/api/pricebook${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
        if (!live) return;
        if (!q.trim()) writeCache(PB_CACHE, r);
        setRows(r); setOffline(false);
      } catch (e) {
        if (!live) return;
        const all = readCache(PB_CACHE) || [];
        const s = q.trim().toLowerCase();
        setRows(all.filter((x) => !s || x.name.toLowerCase().includes(s) || (x.code || "").toLowerCase().includes(s)));
        setOffline(!e.status);
      }
    }, 220);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  return (
    <Modal title={sel ? "How many?" : "Add part or service"} onClose={onClose}
      footer={sel ? <><Button onClick={() => setSel(null)}>Back</Button><Button variant="primary" onClick={() => onAdd(sel, qty)}>Add {qty} to job</Button></> : null}>
      {sel ? (
        <div className="col" style={{ alignItems: "center", gap: 14, padding: "8px 0" }}>
          <div style={{ fontWeight: 650, fontSize: 16, textAlign: "center" }}>{sel.name}</div>
          {seePrices && sel.unit_price_cents != null && <div className="muted"><Money cents={sel.unit_price_cents} /> each</div>}
          <div className="row" style={{ gap: 18 }}>
            <button className="tj-step" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Less">−</button>
            <div style={{ fontSize: 30, fontWeight: 700, minWidth: 40, textAlign: "center" }} className="num">{qty}</div>
            <button className="tj-step" onClick={() => setQty(qty + 1)} aria-label="More">+</button>
          </div>
          {seePrices && sel.unit_price_cents != null && <div style={{ fontWeight: 650 }}>Line total <Money cents={sel.unit_price_cents * qty} /></div>}
        </div>
      ) : (
        <div className="col">
          <input autoFocus placeholder="Search: capacitor, filter, drain…" value={q} onChange={(e) => setQ(e.target.value)} style={{ height: 46, fontSize: 16 }} />
          {offline && <div className="muted small">Offline: searching your saved price book.</div>}
          {rows === null ? <div className="empty">Loading price book…</div> : rows.length === 0 ? <div className="empty">No matches for "{q}"</div> : (
            <div style={{ maxHeight: "50vh", overflowY: "auto", margin: "0 -4px" }}>
              {rows.map((r) => (
                <button key={r.id} className="tj-pb" onClick={() => { setSel(r); setQty(1); }}>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div className="tj-ellipsis" style={{ fontWeight: 600 }}>{r.name}</div>
                    <div className="muted small">{[r.code, r.category, r.kind].filter(Boolean).join(" · ")}</div>
                  </div>
                  {seePrices && r.unit_price_cents != null && <Money cents={r.unit_price_cents} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---------- notes with dictation ----------
function Notes({ job, write, toast }) {
  const [text, setText] = useState("");
  const [forCustomer, setForCustomer] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef(null);
  const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* already stopped */ } }, []);

  const dictate = () => {
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      let said = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) said += ev.results[i][0].transcript;
      if (said) setText((t) => (t ? t.trimEnd() + " " : "") + said.trim());
    };
    rec.onerror = (ev) => { if (ev.error !== "aborted") toast(ev.error === "not-allowed" ? "Microphone permission is off" : "Couldn't hear that, try again", true); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  };

  const save = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    const field = forCustomer ? "notes_customer" : "notes_internal";
    try {
      await write("/notes", { text: t, customer: forCustomer },
        { optimistic: (j) => ({ ...j, [field]: ((j[field] || "") + "\n" + t).trim() }), ok: "Note saved" });
      setText("");
    } catch (e) { toast(e, true); } finally { setBusy(false); }
  };

  return (
    <Section title="Notes">
      <div style={{ padding: "4px 16px 16px" }} className="col">
        {job.notes_customer && <div className="tj-note"><div className="tj-mini">For the customer</div>{job.notes_customer}</div>}
        {job.notes_internal && <div className="tj-note internal"><div className="tj-mini">Internal</div>{job.notes_internal}</div>}
        <textarea rows={3} placeholder={listening ? "Listening… speak now" : "What did you find? What did you do?"} value={text}
          onChange={(e) => setText(e.target.value)} style={{ fontSize: 16, ...(listening ? { borderColor: "var(--red)" } : {}) }} />
        <label className="check small"><input type="checkbox" checked={forCustomer} onChange={(e) => setForCustomer(e.target.checked)} /> Show this note to the customer</label>
        <div className="row">
          {SR ? (
            <button className={`btn ${listening ? "tj-rec" : ""}`} onClick={dictate} style={{ height: 44 }}>
              <Ico n="mic" /> {listening ? "Stop" : "Dictate"}
            </button>
          ) : <span className="muted small" style={{ flex: 1 }}>Tip: use your keyboard's mic to dictate.</span>}
          <div className="spacer" />
          <Button variant="primary" onClick={save} disabled={!text.trim() || busy} style={{ height: 44 }}>{busy ? "Saving…" : "Save note"}</Button>
        </div>
      </div>
    </Section>
  );
}

// ---------- signature ----------
function Signature({ job, write, toast }) {
  const [redo, setRedo] = useState(false);
  const sig = job.signature;
  if (sig && !redo) {
    return (
      <Section title="Customer signature" id="tj-sign" right={<button className="btn ghost sm" onClick={() => setRedo(true)}>Re-sign</button>}>
        <div style={{ padding: "0 16px 16px" }}>
          {sig.image ? <img src={sig.image} alt={`Signature of ${sig.name}`} className="tj-sig-img" /> : <div className="tj-sig-img tj-sig-name">{sig.name}</div>}
          <div className="row small" style={{ marginTop: 8, color: "var(--green)", fontWeight: 600 }}><Ico n="check" size={16} /> Signed by {sig.name}{sig.at ? ` · ${time(sig.at)}` : ""}</div>
        </div>
      </Section>
    );
  }
  return (
    <Section title="Customer signature" id="tj-sign">
      <SignaturePad defaultName={job.customer?.name || ""} onCancel={sig ? () => setRedo(false) : null}
        onSave={async (name, image) => {
          try {
            await write("/signature", { name, image }, { optimistic: (j) => ({ ...j, signature: { name, image, at: new Date().toISOString() } }), ok: "Signature saved" });
            setRedo(false);
          } catch (e) { toast(e, true); }
        }} />
    </Section>
  );
}

function SignaturePad({ defaultName, onSave, onCancel }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [inked, setInked] = useState(false);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);

  const setup = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    setInked(false);
  }, []);
  useEffect(() => { setup(); }, [setup]);

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e) => {
    e.preventDefault();
    ref.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    const ctx = ref.current.getContext("2d");
    ctx.beginPath(); ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = "#111827"; ctx.fill();
  };
  const move = (e) => {
    if (!drawing.current) return;
    const p = pos(e);
    const ctx = ref.current.getContext("2d");
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
    if (!inked) setInked(true);
  };
  const up = () => { drawing.current = false; };

  const save = async () => {
    setBusy(true);
    try { await onSave(name.trim(), ref.current.toDataURL("image/png")); } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: "0 16px 16px" }} className="col">
      <div className="tj-pad-wrap">
        <canvas ref={ref} className="tj-pad" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} />
        {!inked && <div className="tj-pad-hint">Customer signs here</div>}
        <div className="tj-pad-line" />
      </div>
      <div className="row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer's full name" style={{ height: 44, fontSize: 16 }} aria-label="Signer name" />
        <button className="btn" onClick={setup} style={{ height: 44 }}>Clear</button>
      </div>
      <div className="row">
        {onCancel && <Button onClick={onCancel} style={{ height: 44 }}>Cancel</Button>}
        <Button variant="primary" block disabled={!inked || !name.trim() || busy} onClick={save} style={{ height: 44 }}>{busy ? "Saving…" : "Save signature"}</Button>
      </div>
      <div className="muted small">By signing, the customer confirms the work described above was completed.</div>
    </div>
  );
}

// ---------- get paid ----------
const TIPS = [0, 10, 15, 20];
function GetPaid({ job, seePrices, onBack }) {
  const nav = useNavigate();
  const toast = useToast();
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState(null);
  const [tip, setTip] = useState(0);
  const [stage, setStage] = useState("choose"); // choose | tapping | cashcheck | done
  const [paid, setPaid] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try { setInv(await api.post(`/api/jobs/${job.id}/invoice`)); } catch (e) {
      setErr(e.status ? e : new Error("You need a signal to take payment. Move somewhere with coverage and try again."));
    }
  }, [job.id]);
  useEffect(() => { load(); }, [load]);

  const balance = inv?.balance_cents ?? 0;
  const tipCents = Math.round((balance * tip) / 100);
  const first = (job.customer?.name || "").split(" ")[0] || "the customer";

  const take = async (method) => {
    setBusy(true);
    if (method === "card") setStage("tapping");
    try {
      if (method === "card") await new Promise((r) => setTimeout(r, 1400));
      const r = await api.post(`/api/invoices/${inv.id}/payments`, { amount_cents: balance, method });
      if (tip) {
        api.techWrite(`/api/jobs/${job.id}/notes`, { text: `Customer added a ${tip}% tip (${money(tipCents)}) when paying ${inv.number}.` }).catch(() => {});
      }
      setPaid({ amount: balance, method, tipCents });
      setInv(r.invoice || inv);
      setStage("done");
    } catch (e) {
      setStage("choose");
      toast(e.status ? e : "Payment needs a connection. Try again when you have signal.", true);
    } finally { setBusy(false); }
  };

  const sendLink = async () => {
    setBusy(true);
    try {
      await api.post(`/api/invoices/${inv.id}/send`);
      toast(`Payment link texted to ${first}`);
    } catch (e) {
      if (e.status === 403) toast("Payment links are sent by the office. They've got this invoice and can text it.");
      else toast(e.status ? e : "No signal. Try again in a moment.", true);
    } finally { setBusy(false); }
  };

  const alreadyPaid = inv && (inv.status === "paid" || inv.balance_cents <= 0) && stage !== "done";

  return (
    <div className="phone">
      <style>{CSS}</style>
      <div className="phone-head">
        <button className="tj-back" onClick={onBack} aria-label="Back to job"><Ico n="back" size={22} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650, fontSize: 15 }}>Get paid</div>
          <div className="muted small tj-ellipsis">{job.customer?.name} · {job.number}</div>
        </div>
        {inv && <Status s={stage === "done" ? "paid" : inv.status} />}
      </div>
      <div className="phone-body">
        {err && <><ErrorBox error={err} /><Button onClick={load}>Try again</Button></>}
        {!inv && !err && <div className="empty">Preparing the invoice…</div>}

        {inv && (stage === "done" || alreadyPaid) && (
          <div className="card tj-paid">
            <div className="tj-paid-ico"><Ico n="check" size={34} sw={3} /></div>
            <h1 style={{ fontSize: 24 }}>{stage === "done" ? "Payment received" : "Paid in full"}</h1>
            <div style={{ fontSize: 34, fontWeight: 750, letterSpacing: "-.02em" }} className="num">{money(paid ? paid.amount : inv.total_cents)}</div>
            {paid && <div className="muted">{paid.method === "card" ? "Card · Tap to Pay" : paid.method === "cash" ? "Cash" : "Check"} · {inv.number}</div>}
            {paid?.tipCents > 0 && <div className="muted small">Tip of {money(paid.tipCents)} noted on the job</div>}
            <div className="tj-sent">
              <div className="row"><Ico n="msg" size={16} /> Receipt sent to {first}</div>
              <div className="row"><Ico n="star" size={16} /> Review request sent automatically</div>
            </div>
            <Button variant="primary" size="lg" block onClick={() => nav("/tech")} style={{ height: 52 }}>Back to today</Button>
          </div>
        )}

        {inv && stage === "tapping" && (
          <div className="card tj-tap">
            <div className="tj-tap-ring"><Ico n="card" size={40} /></div>
            <h2>Hold card near the phone</h2>
            <div className="muted">Charging {money(balance)}…</div>
          </div>
        )}

        {inv && !alreadyPaid && (stage === "choose" || stage === "cashcheck") && (
          <>
            <div className="card" style={{ padding: 18, textAlign: "center" }}>
              <div className="muted small">Amount due · {inv.number}</div>
              <div style={{ fontSize: 40, fontWeight: 750, letterSpacing: "-.02em", margin: "4px 0" }} className="num">{money(balance + tipCents)}</div>
              {tip > 0 && <div className="muted small">{money(balance)} + {money(tipCents)} tip</div>}
            </div>

            <div className="card">
              {(inv.lines || []).map((l, i) => (
                <div key={l.id || i} className="tj-line">
                  <div style={{ flex: 1, minWidth: 0 }}><div className="tj-ellipsis">{l.name}</div><div className="muted small">Qty {l.qty}</div></div>
                  {seePrices && l.total_cents != null && <Money cents={l.total_cents} />}
                </div>
              ))}
              <div className="tj-tot">
                {inv.subtotal_cents != null && <div className="row between"><span className="muted">Subtotal</span><Money cents={inv.subtotal_cents} /></div>}
                {inv.tax_cents > 0 && <div className="row between"><span className="muted">{inv.tax_label || "Tax"}</span><Money cents={inv.tax_cents} /></div>}
                <div className="row between" style={{ fontWeight: 650 }}><span>Total</span><Money cents={inv.total_cents} /></div>
                {inv.deposits_applied_cents > 0 && <div className="row between"><span className="muted">Deposit paid</span><span>−<Money cents={inv.deposits_applied_cents} /></span></div>}
                {inv.amount_paid_cents - (inv.deposits_applied_cents || 0) > 0 && <div className="row between"><span className="muted">Paid</span><span>−<Money cents={inv.amount_paid_cents - (inv.deposits_applied_cents || 0)} /></span></div>}
                <div className="row between" style={{ fontWeight: 700, fontSize: 16 }}><span>Balance</span><Money cents={balance} /></div>
              </div>
              {inv.custom_fields?.length > 0 && (
                <div className="tj-tot" style={{ borderTop: "1px solid var(--line)" }}>
                  {inv.custom_fields.map((f) => <div key={f.label} className="row between small"><span className="muted">{f.label}</span><span>{f.value}</span></div>)}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="tj-mini" style={{ marginBottom: 8 }}>Add a tip?</div>
              <div className="tj-tips">
                {TIPS.map((t) => (
                  <button key={t} className={`tj-tip ${tip === t ? "on" : ""}`} onClick={() => setTip(t)}>
                    <b>{t ? `${t}%` : "None"}</b>
                    {t > 0 && <span className="small">{money(Math.round((balance * t) / 100))}</span>}
                  </button>
                ))}
              </div>
            </div>

            {stage === "cashcheck" ? (
              <div className="card col" style={{ padding: 14 }}>
                <div style={{ fontWeight: 650 }}>Collected {money(balance)} by:</div>
                <div className="grid g2" style={{ gap: 10 }}>
                  <Button size="lg" onClick={() => take("cash")} disabled={busy}><Ico n="cash" /> Cash</Button>
                  <Button size="lg" onClick={() => take("check")} disabled={busy}>Check</Button>
                </div>
                <button className="btn ghost sm" onClick={() => setStage("choose")}>Cancel</button>
              </div>
            ) : (
              <div className="col">
                <Button variant="primary" size="lg" block onClick={() => take("card")} disabled={busy || balance <= 0} style={{ height: 58, fontSize: 17 }}>
                  <Ico n="card" /> Tap to Pay (demo) · {money(balance)}
                </Button>
                <div className="grid g2" style={{ gap: 10 }}>
                  <Button size="lg" onClick={sendLink} disabled={busy}><Ico n="link" /> Send link</Button>
                  <Button size="lg" onClick={() => setStage("cashcheck")} disabled={busy}><Ico n="cash" /> Cash / check</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
.toast { bottom: 132px; }
.tj-back { width: 40px; height: 40px; margin-left: -8px; display: grid; place-items: center; border-radius: 10px; color: var(--ink); background: none; border: 0; cursor: pointer; }
.tj-back:active { background: var(--surface-2); }
.tj-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tj-hero { padding: 4px 4px 0; }
.tj-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--brand); }
.tj-mini { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); }
.tj-offline { display: flex; align-items: center; gap: 8px; background: var(--amber-soft); color: var(--amber); border-radius: 10px; padding: 10px 12px; font-weight: 600; font-size: 13.5px; }
.tj-access { display: flex; gap: 10px; align-items: flex-start; margin-top: 12px; background: var(--amber-soft); color: #7c3a06; border-radius: 10px; padding: 10px 12px; font-weight: 550; }
.tj-access .tj-mini { color: var(--amber); }
.tj-actions { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--line); }
.tj-act { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 52px; font-weight: 600; color: var(--brand); border-right: 1px solid var(--line); }
.tj-act:last-child { border-right: 0; }
.tj-act:active { background: var(--surface-2); }
.tj-todo { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.tj-todo-row { display: flex; gap: 10px; align-items: baseline; color: var(--ink-2); }
.tj-todo-row .dot { flex: none; transform: translateY(-1px); }
.tj-sec-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px 8px; }
.tj-sec-head h2 { font-size: 16px; }
.tj-eq { padding: 10px 16px 14px; border-top: 1px solid var(--line); }
.tj-eq:first-child { border-top: 0; }
.tj-eqf { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.tj-check { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 58px; padding: 10px 16px; border: 0; border-top: 1px solid var(--line); background: none; font: inherit; font-size: 15.5px; color: var(--ink); cursor: pointer; }
.tj-check:active { background: var(--surface-2); }
.tj-check.on span:nth-child(2) { color: var(--ink-3); text-decoration: line-through; }
.tj-box { width: 28px; height: 28px; flex: none; border-radius: 8px; border: 2px solid var(--line-2); display: grid; place-items: center; color: #fff; transition: all .15s; }
.tj-check.on .tj-box { background: var(--green); border-color: var(--green); }
.tj-req { font-size: 11px; font-weight: 650; color: var(--amber); background: var(--amber-soft); padding: 2px 7px; border-radius: 99px; }
.tj-stage { padding: 6px 16px 14px; }
.tj-thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.tj-thumb { aspect-ratio: 1; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); background: var(--surface-2); padding: 0; cursor: pointer; display: grid; place-items: center; color: var(--ink-3); font: inherit; }
.tj-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tj-ph { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; }
.tj-add { border: 2px dashed var(--line-2); background: var(--surface); color: var(--brand); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-weight: 600; }
.tj-line { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--line); }
.tj-pb { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 8px; min-height: 56px; border: 0; border-bottom: 1px solid var(--line); background: none; font: inherit; color: inherit; cursor: pointer; }
.tj-pb:active { background: var(--surface-2); }
.tj-step { width: 52px; height: 52px; border-radius: 50%; border: 1px solid var(--line-2); background: var(--surface); font-size: 26px; cursor: pointer; color: var(--ink); }
.tj-note { white-space: pre-wrap; background: var(--brand-soft); border-radius: 10px; padding: 10px 12px; }
.tj-note.internal { background: var(--surface-2); }
.tj-note .tj-mini { margin-bottom: 4px; }
.tj-rec { border-color: var(--red); color: var(--red); animation: tj-pulse 1.2s infinite; }
@keyframes tj-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(185,28,28,.35) } 50% { box-shadow: 0 0 0 6px rgba(185,28,28,0) } }
.tj-pad-wrap { position: relative; }
.tj-pad { width: 100%; height: 170px; display: block; border: 1px solid var(--line-2); border-radius: 12px; background: #fff; touch-action: none; cursor: crosshair; }
.tj-pad-hint { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ink-3); pointer-events: none; font-size: 15px; }
.tj-pad-line { position: absolute; left: 18px; right: 18px; bottom: 34px; border-bottom: 1px dashed var(--line-2); pointer-events: none; }
.tj-sig-img { width: 100%; height: 140px; object-fit: contain; background: #fff; border: 1px solid var(--line); border-radius: 12px; display: block; }
.tj-sig-name { display: grid; place-items: center; font-family: "Brush Script MT", "Segoe Script", cursive; font-size: 34px; color: #1f2937; }
.tj-chip { border: 1px solid var(--line-2); background: var(--surface); border-radius: 99px; padding: 9px 14px; font: inherit; font-weight: 550; cursor: pointer; color: var(--ink); }
.tj-chip.on { background: var(--brand); border-color: var(--brand); color: var(--brand-ink); }
.tj-err-row { display: flex; gap: 10px; align-items: flex-start; background: var(--red-soft); color: var(--red); border-radius: 10px; padding: 10px 12px; font-weight: 550; }
.tj-err-x { width: 20px; height: 20px; flex: none; border-radius: 50%; background: var(--red); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 800; }
.tj-tot { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--line); }
.tj-tips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.tj-tip { border: 1.5px solid var(--line-2); background: var(--surface); border-radius: 12px; min-height: 58px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; font: inherit; cursor: pointer; color: var(--ink); }
.tj-tip.on { border-color: var(--brand); background: var(--brand-soft); color: var(--brand); }
.tj-tip span { color: var(--ink-3); }
.tj-paid { padding: 28px 20px 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.tj-paid-ico { width: 72px; height: 72px; border-radius: 50%; background: var(--green); color: #fff; display: grid; place-items: center; margin-bottom: 8px; animation: tj-pop .4s ease-out; }
@keyframes tj-pop { from { transform: scale(.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
.tj-sent { width: 100%; background: var(--green-soft); color: var(--green); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; font-weight: 600; margin: 10px 0 8px; text-align: left; }
.tj-tap { padding: 40px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.tj-tap-ring { width: 110px; height: 110px; border-radius: 50%; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); animation: tj-ring 1.2s infinite; margin-bottom: 8px; }
@keyframes tj-ring { 0% { box-shadow: 0 0 0 0 rgba(11,92,255,.35) } 100% { box-shadow: 0 0 0 26px rgba(11,92,255,0) } }
`;

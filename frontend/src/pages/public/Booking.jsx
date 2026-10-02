// Online booking (/book/:slug): service → what's wrong → time window → contact → confirmation. Creates a lead. No login.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Field } from "../../components/ui";
import { api } from "../../lib/api";
import { money, setCurrency } from "../../lib/format";
import { useApi } from "../../lib/useApi";

function tint(hex, a) {
  let h = String(hex || "#0b5cff").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const m = (c) => Math.round(255 - (255 - c) * a);
  return `rgb(${m((n >> 16) & 255)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
}
const telUrl = (p) => `tel:${String(p || "").replace(/[^0-9+]/g, "")}`;

const URGENCY = [
  ["emergency", "Emergency: no heat, no cooling, active leak"],
  ["soon", "Soon: in the next day or two"],
  ["flexible", "Flexible: any time this week"],
];
function windows() {
  const t = new Date();
  const tm = new Date(t); tm.setDate(t.getDate() + 1);
  const d = (x) => x.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return [
    ...(t.getHours() < 15 ? [["today_pm", "Today PM", `${d(t)} · 12–5 pm`]] : []),
    ["tomorrow_am", "Tomorrow AM", `${d(tm)} · 8 am–12`],
    ["tomorrow_pm", "Tomorrow PM", `${d(tm)} · 12–5 pm`],
    ["later", "Pick later", "We'll call to find a time"],
  ];
}
const STEP_TITLES = ["What do you need?", "Tell us a bit more", "When suits you?", "Your details"];

export default function Booking() {
  const { slug } = useParams();
  const { data, error, loading, reload } = useApi(`/api/public/booking/${slug}`);
  const [step, setStep] = useState(0);
  const [svc, setSvc] = useState(null); // {id,name,from_cents} | {id:"other"}
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState("soon");
  const [win, setWin] = useState("");
  const [c, setC] = useState({ name: "", phone: "", email: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!data) return;
    setCurrency(data.org?.currency);
    document.title = `Book online · ${data.org?.name || ""}`;
  }, [data]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step, done]);

  const org = data?.org;
  const brand = org?.brand?.color || "#0b5cff";
  const W = windows();

  const canNext = [!!svc, message.trim().length > 2, !!win, c.name.trim() && (c.phone.trim() || c.email.trim()) && c.address.trim()][step];

  const submit = async () => {
    setBusy(true); setErr(null);
    const winObj = W.find(([k]) => k === win);
    const urg = URGENCY.find(([k]) => k === urgency);
    try {
      const r = await api.post(`/api/public/booking/${slug}`, {
        name: c.name.trim(), phone: c.phone.trim(), email: c.email.trim(), address: c.address.trim(),
        service: svc.id === "other" ? "Something else" : svc.name,
        message: `${message.trim()}\n\nUrgency: ${urg[1]}`,
        window: winObj ? `${winObj[1]} (${winObj[2]})` : win,
      });
      setDone({ ...r, window: winObj });
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  const shell = (children, foot) => (
    <div className="phone" style={{ "--brand": brand, "--brand-soft": tint(brand, 0.1) }}>
      <style>{CSS}</style>
      <div className="phone-head" style={{ gap: 12 }}>
        <span className="bk-logo">{org?.brand?.short || (org?.name || "•")[0]}</span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 650 }}>{org?.name || "Book online"}</div><div className="muted small">Book online in 1 minute</div></div>
        {org?.phone && <a className="btn sm" href={telUrl(org.phone)}>Call</a>}
      </div>
      <div className="phone-body" style={{ paddingBottom: foot ? 110 : 30 }}>{children}</div>
      {foot && <div className="phone-foot">{foot}</div>}
    </div>
  );

  if (loading && !data) return shell(<div className="empty">Loading…</div>);
  if (error) {
    return shell(
      <div className="card bk-state">
        <h2>{error.status === 404 ? "We couldn't find this business" : "Booking is unavailable right now"}</h2>
        <div className="muted">{error.status === 404 ? "Check the link and try again." : error.message}</div>
        {error.status !== 404 && <Button onClick={reload}>Try again</Button>}
      </div>
    );
  }

  if (done) {
    const first = c.name.trim().split(" ")[0];
    return shell(
      <>
        <div className="card bk-state">
          <div className="bk-ok">✓</div>
          <h1 style={{ fontSize: 23 }}>Thanks, {first}! Request received</h1>
          <div className="muted">
            {c.phone ? `We'll text ${c.phone} shortly to confirm your exact time.` : `We'll email ${c.email} shortly to confirm your exact time.`}
          </div>
          <div className="bk-ref">Reference <b>{done.reference}</b></div>
        </div>
        <div className="card" style={{ padding: "4px 0" }}>
          <Sum k="Service" v={svc.id === "other" ? "Something else" : svc.name} />
          <Sum k="Preferred time" v={done.window ? `${done.window[1]}${done.window[0] !== "later" ? ` · ${done.window[2]}` : ""}` : "To be arranged"} />
          <Sum k="Address" v={c.address} />
          <Sum k="Urgency" v={URGENCY.find(([k]) => k === urgency)?.[1].split(":")[0]} />
        </div>
        {urgency === "emergency" && org?.phone && (
          <div className="callout">Emergency? For the fastest response, call us now at <a href={telUrl(org.phone)} style={{ fontWeight: 650 }}>{org.phone}</a>.</div>
        )}
      </>
    );
  }

  const foot = (
    <div className="row" style={{ gap: 10 }}>
      {step > 0 && <Button size="lg" onClick={() => setStep(step - 1)} style={{ height: 52 }}>Back</Button>}
      {step < 3 ? (
        <Button variant="primary" size="lg" block disabled={!canNext} onClick={() => setStep(step + 1)} style={{ height: 52 }}>Continue</Button>
      ) : (
        <Button variant="primary" size="lg" block disabled={!canNext || busy} onClick={submit} style={{ height: 52 }}>{busy ? "Sending…" : "Request booking"}</Button>
      )}
    </div>
  );

  return shell(
    <>
      <div>
        <div className="bk-bar"><span style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
        <div className="muted small" style={{ marginTop: 8 }}>Step {step + 1} of 4</div>
        <h1 style={{ fontSize: 23, marginTop: 2 }}>{STEP_TITLES[step]}</h1>
      </div>

      {step === 0 && (
        <div className="bk-grid">
          {data.services.map((s) => (
            <button key={s.id} className={`bk-svc ${svc?.id === s.id ? "on" : ""}`} onClick={() => setSvc(s)}>
              <span className="bk-svc-name">{s.name}</span>
              {s.description && <span className="muted small">{s.description}</span>}
              <span className="bk-from">from <b>{money(s.from_cents)}</b></span>
            </button>
          ))}
          <button className={`bk-svc ${svc?.id === "other" ? "on" : ""}`} onClick={() => setSvc({ id: "other", name: "Something else" })}>
            <span className="bk-svc-name">Something else</span>
            <span className="bk-from">Tell us what you need</span>
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="card col" style={{ padding: 16, gap: 14 }}>
          <Field label="What's going on?">
            <textarea rows={4} autoFocus value={message} onChange={(e) => setMessage(e.target.value)} style={{ fontSize: 16 }}
              placeholder={svc?.name?.toLowerCase().includes("drain") ? "e.g. Kitchen sink drains slowly and gurgles" : "e.g. Furnace runs but blows cold air, started yesterday"} />
          </Field>
          <Field label="How urgent is it?">
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={{ height: 46, fontSize: 16 }}>
              {URGENCY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          {urgency === "emergency" && org?.phone && (
            <div className="callout small">For emergencies, calling is fastest: <a href={telUrl(org.phone)} style={{ fontWeight: 650 }}>{org.phone}</a></div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="col">
          {W.map(([k, label, sub]) => (
            <button key={k} className={`bk-win ${win === k ? "on" : ""}`} onClick={() => setWin(k)}>
              <span className={`bk-radio ${win === k ? "on" : ""}`} />
              <span style={{ flex: 1, textAlign: "left" }}><b>{label}</b><br /><span className="muted small">{sub}</span></span>
            </button>
          ))}
          <div className="muted small" style={{ textAlign: "center" }}>We'll confirm the exact arrival time by text.</div>
        </div>
      )}

      {step === 3 && (
        <div className="card col" style={{ padding: 16, gap: 12 }}>
          <Field label="Full name"><input autoComplete="name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} style={{ height: 46, fontSize: 16 }} /></Field>
          <Field label="Mobile phone"><input type="tel" autoComplete="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="For your confirmation text" style={{ height: 46, fontSize: 16 }} /></Field>
          <Field label="Email"><input type="email" autoComplete="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} style={{ height: 46, fontSize: 16 }} /></Field>
          <Field label="Service address"><input autoComplete="street-address" value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} placeholder="Street, city" style={{ height: 46, fontSize: 16 }} /></Field>
          {!c.phone.trim() && !c.email.trim() && <div className="muted small">Add a phone or email so we can confirm.</div>}
          {err && <div className="err-box">{err.message}</div>}
          <div className="bk-recap">
            <div><span className="muted">Service:</span> {svc?.name}</div>
            <div><span className="muted">When:</span> {W.find(([k]) => k === win)?.[1]}</div>
          </div>
        </div>
      )}
    </>,
    foot
  );
}

function Sum({ k, v }) {
  return <div className="bk-sum"><span className="muted">{k}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span></div>;
}

const CSS = `
.toast { bottom: 132px; }
.bk-logo { width: 38px; height: 38px; border-radius: 10px; background: var(--brand); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 18px; flex: none; }
.bk-bar { height: 5px; background: var(--line); border-radius: 99px; overflow: hidden; }
.bk-bar span { display: block; height: 100%; background: var(--brand); border-radius: 99px; transition: width .3s; }
.bk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bk-svc { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 14px; min-height: 96px; border: 2px solid var(--line); border-radius: 14px; background: var(--surface); font: inherit; color: var(--ink); cursor: pointer; box-shadow: var(--shadow); }
.bk-svc.on { border-color: var(--brand); background: var(--brand-soft); }
.bk-svc-name { font-weight: 650; font-size: 15px; line-height: 1.25; }
.bk-from { margin-top: auto; font-size: 13px; color: var(--ink-3); }
.bk-svc.on .bk-from b { color: var(--brand); }
.bk-win { display: flex; align-items: center; gap: 14px; padding: 14px 16px; min-height: 64px; border: 2px solid var(--line); border-radius: 14px; background: var(--surface); font: inherit; color: var(--ink); cursor: pointer; }
.bk-win.on { border-color: var(--brand); background: var(--brand-soft); }
.bk-radio { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line-2); flex: none; display: grid; place-items: center; }
.bk-radio.on { border-color: var(--brand); }
.bk-radio.on::after { content: ""; width: 11px; height: 11px; border-radius: 50%; background: var(--brand); }
.bk-state { padding: 28px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
.bk-ok { width: 64px; height: 64px; border-radius: 50%; background: var(--green); color: #fff; display: grid; place-items: center; font-size: 30px; font-weight: 800; margin-bottom: 4px; }
.bk-ref { background: var(--surface-2); border-radius: 99px; padding: 6px 14px; margin-top: 4px; }
.bk-sum { display: flex; justify-content: space-between; gap: 14px; padding: 11px 16px; border-bottom: 1px solid var(--line); }
.bk-sum:last-child { border-bottom: 0; }
.bk-recap { background: var(--surface-2); border-radius: 10px; padding: 10px 12px; font-size: 13.5px; }
`;

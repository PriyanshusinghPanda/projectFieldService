// "Your technician is on the way" (/track/:token). Polls every 20 s. No login.
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui";
import { api } from "../../lib/api";
import { localISODate, time } from "../../lib/format";

function tint(hex, a) {
  let h = String(hex || "#0b5cff").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const m = (c) => Math.round(255 - (255 - c) * a);
  return `rgb(${m((n >> 16) & 255)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
}
const telUrl = (p) => `tel:${String(p || "").replace(/[^0-9+]/g, "")}`;
const STEPS = [
  ["scheduled", "Booked"],
  ["en_route", "On the way"],
  ["on_site", "Arrived"],
  ["in_progress", "Working"],
  ["done", "Done"],
];
const TRADE = { hvac: "HVAC", plumbing: "plumbing", electrical: "electrical", roofing: "roofing", appliance: "appliance", garage: "garage door" };
const POLL_MS = 20000;

export default function Track() {
  const { token } = useParams();
  const [job, setJob] = useState(undefined); // undefined = loading, null = nothing scheduled
  const [org, setOrg] = useState(null);
  const [err, setErr] = useState(null);
  const [checked, setChecked] = useState(null);
  const lastSeen = useRef(null);
  const [finished, setFinished] = useState(null);

  useEffect(() => {
    let live = true;
    // business name + brand come from the portal endpoint (same customer token)
    api.get(`/api/public/portal/${token}`).then((p) => live && setOrg(p.org)).catch(() => {});
    const load = async () => {
      try {
        const r = await api.get(`/api/public/track/${token}`);
        if (!live) return;
        if (!r.job && lastSeen.current && ["on_site", "in_progress"].includes(lastSeen.current.status)) setFinished(lastSeen.current);
        if (r.job) { lastSeen.current = r.job; setFinished(null); }
        setJob(r.job);
        setErr(null);
        setChecked(new Date());
      } catch (e) { if (live) setErr(e); }
    };
    load();
    const t = setInterval(() => { if (document.visibilityState !== "hidden") load(); }, POLL_MS);
    return () => { live = false; clearInterval(t); };
  }, [token]);

  useEffect(() => { document.title = org ? `Track your visit · ${org.name}` : "Track your visit"; }, [org]);

  const brand = org?.brand?.color || "#0b5cff";
  const shown = job || finished;
  const status = job ? job.status : finished ? "done" : null;
  const idx = STEPS.findIndex(([k]) => k === status);
  const first = shown?.tech?.first_name || "Your technician";
  const trade = (shown?.tech?.trade || "").split(",").map((s) => s.trim()).filter(Boolean).map((t) => TRADE[t] || t)[0];
  const [ws, we] = shown?.window || [];
  const isToday = ws && ws.startsWith(localISODate());
  const dateText = ws ? (isToday ? "today" : new Date(ws).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })) : "";

  const headline = {
    scheduled: isToday ? `${first} is coming today` : "Your visit is booked",
    en_route: `${first} is on the way`,
    on_site: `${first} has arrived`,
    in_progress: `${first} is working on it`,
    done: "All done!",
  }[status];
  const sub = {
    scheduled: ws ? `Arriving ${dateText} between ${time(ws)} and ${time(we)}` : "We'll confirm your time shortly",
    en_route: "We'll be at your door shortly. Please make sure we can get in.",
    on_site: "Your technician is at your home and getting started.",
    in_progress: "We'll walk you through everything before we leave.",
    done: "Thanks for having us. Your receipt is on its way.",
  }[status];

  return (
    <div className="phone" style={{ "--brand": brand, "--brand-soft": tint(brand, 0.1) }}>
      <style>{CSS}</style>
      <div className="phone-head" style={{ gap: 12 }}>
        <span className="tr-logo">{org?.brand?.short || (org?.name || "•")[0]}</span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 650 }}>{org?.name || "Your visit"}</div><div className="muted small">Live visit tracker</div></div>
        {org?.phone && <a className="btn sm" href={telUrl(org.phone)}>Call</a>}
      </div>
      <div className="phone-body">
        {job === undefined && !err && <div className="empty">Checking on your visit…</div>}
        {err && job === undefined && (
          <div className="card tr-state">
            <h2>{err.status === 404 ? "This tracking link isn't valid" : "Couldn't load your visit"}</h2>
            <div className="muted">{err.status === 404 ? "Ask the business for a fresh link." : "Check your connection and try again."}</div>
            {err.status !== 404 && <Button onClick={() => location.reload()}>Try again</Button>}
          </div>
        )}

        {job === null && !finished && (
          <div className="card tr-state">
            <div className="tr-cal"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg></div>
            <h2>No visits scheduled</h2>
            <div className="muted">When we book your next visit, you'll be able to follow your technician here.</div>
            {org?.phone && <a className="btn primary lg" href={telUrl(org.phone)} style={{ marginTop: 6 }}>Book a visit: {org.phone}</a>}
          </div>
        )}

        {shown && (
          <>
            <div className={`card tr-hero ${status}`}>
              {status === "en_route" && <div className="tr-live"><span className="tr-pulse" /> Live</div>}
              <h1 style={{ fontSize: 25, letterSpacing: "-.01em" }}>{headline}</h1>
              <div className="muted" style={{ marginTop: 6, fontSize: 15 }}>{sub}</div>
              <div className="tr-steps">
                <span className="tr-fill" style={{ width: `${(Math.max(0, idx) / (STEPS.length - 1)) * 80}%` }} />
                {STEPS.map(([k, label], i) => (
                  <div key={k} className={`tr-step ${i < idx ? "past" : i === idx ? "now" : ""}`}>
                    <span className="tr-dot">{i < idx || (i === idx && k === "done") ? "✓" : ""}</span>
                    <span className="tr-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card tr-tech">
              <span className="tr-avatar">{first[0]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 650, fontSize: 16 }}>{first}</div>
                <div className="muted small">{trade ? `${trade[0].toUpperCase()}${trade.slice(1)} technician` : "Technician"}</div>
              </div>
            </div>

            <div className="card" style={{ padding: "4px 0" }}>
              <div className="tr-row"><span className="muted">Visit</span><span style={{ fontWeight: 600, textAlign: "right" }}>{shown.title}</span></div>
              {ws && <div className="tr-row"><span className="muted">Arrival window</span><span style={{ fontWeight: 600 }}>{isToday ? "Today" : new Date(ws).toLocaleDateString([], { month: "short", day: "numeric" })}, {time(ws)} – {time(we)}</span></div>}
            </div>

            {["scheduled", "en_route"].includes(status) && (
              <div className="card" style={{ padding: 14 }}>
                <div className="tr-mini">Before we arrive</div>
                <ul style={{ margin: "8px 0 0 18px", padding: 0, color: "var(--ink-2)" }}>
                  <li>Clear a path to the equipment</li>
                  <li>Secure pets in another room</li>
                  <li>Let us know about gate codes or parking</li>
                </ul>
              </div>
            )}
          </>
        )}

        <div className="muted small" style={{ textAlign: "center" }}>
          {checked && <>Updated {time(checked.toISOString())} · refreshes automatically</>}
          {org && <> · <Link to={`/portal/${token}`}>Your account</Link></>}
        </div>
      </div>
    </div>
  );
}

const CSS = `
.tr-logo { width: 38px; height: 38px; border-radius: 10px; background: var(--brand); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 18px; flex: none; }
.tr-mini { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); }
.tr-state { padding: 28px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
.tr-cal { width: 60px; height: 60px; border-radius: 50%; background: var(--brand-soft); color: var(--brand); display: grid; place-items: center; margin-bottom: 4px; }
.tr-hero { padding: 22px 18px 18px; background: linear-gradient(180deg, var(--brand-soft), var(--surface) 70%); position: relative; }
.tr-hero.done { background: linear-gradient(180deg, var(--green-soft), var(--surface) 70%); }
.tr-live { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--brand); text-transform: uppercase; letter-spacing: .06em; }
.tr-pulse { width: 9px; height: 9px; border-radius: 50%; background: var(--brand); animation: tr-p 1.4s infinite; }
@keyframes tr-p { 0% { box-shadow: 0 0 0 0 var(--brand) } 100% { box-shadow: 0 0 0 9px transparent } }
.tr-steps { display: grid; grid-template-columns: repeat(5, 1fr); margin-top: 22px; position: relative; }
.tr-steps::before { content: ""; position: absolute; top: 13px; left: 10%; right: 10%; height: 3px; background: var(--line); border-radius: 2px; }
.tr-fill { position: absolute; top: 13px; left: 10%; height: 3px; background: var(--brand); border-radius: 2px; transition: width .5s; }
.tr-hero.done .tr-fill { background: var(--green); }
.tr-step { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; z-index: 1; }
.tr-dot { width: 28px; height: 28px; border-radius: 50%; background: var(--surface); border: 3px solid var(--line-2); display: grid; place-items: center; color: #fff; font-size: 13px; font-weight: 800; }
.tr-step.past .tr-dot { background: var(--brand); border-color: var(--brand); }
.tr-step.now .tr-dot { background: var(--surface); border-color: var(--brand); box-shadow: 0 0 0 5px var(--brand-soft); }
.tr-step.now .tr-dot::after { content: ""; width: 10px; height: 10px; border-radius: 50%; background: var(--brand); }
.tr-hero.done .tr-step .tr-dot { background: var(--green); border-color: var(--green); box-shadow: none; }
.tr-hero.done .tr-step.now .tr-dot::after { display: none; }
.tr-label { font-size: 11.5px; color: var(--ink-3); font-weight: 600; text-align: center; }
.tr-step.past .tr-label, .tr-step.now .tr-label { color: var(--ink); }
.tr-tech { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
.tr-avatar { width: 52px; height: 52px; border-radius: 50%; background: var(--brand); color: #fff; display: grid; place-items: center; font-weight: 750; font-size: 22px; flex: none; }
.tr-row { display: flex; justify-content: space-between; gap: 12px; padding: 11px 16px; border-bottom: 1px solid var(--line); }
.tr-row:last-child { border-bottom: 0; }
`;

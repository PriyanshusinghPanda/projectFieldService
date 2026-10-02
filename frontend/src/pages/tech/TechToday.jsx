// Technician home: today's route, the next job with one big next-step button, and the offline sync state.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, Button, ErrorBox, Status, useToast } from "../../components/ui";
import { api, flushQueue, queueSize } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { day, localISODate, time } from "../../lib/format";
import { useApi } from "../../lib/useApi";

const CACHE_KEY = "jobos.tech.jobs";
const ACTIVE = ["scheduled", "en_route", "on_site", "in_progress", "paused"];
const DONE = ["completed", "invoiced", "paid"];

// The single next step for a job, by status.
const NEXT = {
  scheduled: { label: "On my way", to: "en_route", hint: "We'll text the customer that you're on the way" },
  en_route: { label: "Arrived", to: "on_site", hint: "Starts the on-site clock" },
  on_site: { label: "Start work", to: "in_progress", hint: "Checklist, photos and parts are on the job screen" },
  in_progress: { label: "Open job", open: true, hint: "Finish the checklist, photos and signature" },
  paused: { label: "Open job", open: true, hint: "Resume when you're back on it" },
};

function readCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}
function writeCache(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full or blocked */ }
}

// Queue size + online state, kept live by the "jobos-queue" event the API client fires.
function useSyncState() {
  const [n, setN] = useState(queueSize());
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const q = () => setN(queueSize());
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("jobos-queue", q);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("jobos-queue", q);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return { n, online };
}

function SyncBadge({ onSynced }) {
  const { n, online } = useSyncState();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const sync = async () => {
    setBusy(true);
    try {
      const sent = await flushQueue();
      const left = queueSize();
      if (sent && onSynced) onSynced();
      toast(left ? `Still offline: ${left} waiting` : sent ? `Synced ${sent} update${sent === 1 ? "" : "s"}` : "All synced");
    } finally { setBusy(false); }
  };
  if (!n) {
    return (
      <span className="tt-sync" style={{ color: online ? "var(--green)" : "var(--amber)" }}>
        <span className="dot" style={{ background: online ? "var(--green)" : "var(--amber)" }} />
        {online ? "Synced" : "Offline"}
      </span>
    );
  }
  return (
    <button className="tt-sync warn" onClick={sync} disabled={busy}>
      <span className="dot" style={{ background: "var(--amber)" }} />
      {busy ? "Syncing…" : `${n} waiting to sync`}
      <span style={{ textDecoration: "underline", fontWeight: 650 }}>{busy ? "" : "Sync now"}</span>
    </button>
  );
}

const Pin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
);

const windowText = (j) => j.scheduled_start ? `${time(j.scheduled_start)}${j.scheduled_end ? " – " + time(j.scheduled_end) : ""}` : "Not scheduled";
const mapsUrl = (address) => `https://maps.google.com/?q=${encodeURIComponent(address || "")}`;

export default function TechToday() {
  const { user, org, signOut } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi("/api/jobs");
  const [jobs, setJobs] = useState(() => readCache(CACHE_KEY));
  const [fromCache, setFromCache] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) { setJobs(data); setFromCache(false); writeCache(CACHE_KEY, data); }
  }, [data]);
  useEffect(() => {
    // network failure (not a server answer): keep showing the last list we saw
    if (error && error.status === undefined && readCache(CACHE_KEY)) setFromCache(true);
  }, [error]);
  // Replay queued writes on open, then refresh.
  useEffect(() => {
    if (queueSize() && navigator.onLine) flushQueue().then((sent) => sent && reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = localISODate();
  const { todays, next, upcoming } = useMemo(() => {
    const list = (jobs || []).filter((j) => j.status !== "cancelled");
    const todays = list.filter((j) => (j.scheduled_start || "").startsWith(today))
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
    const next = todays.find((j) => ["en_route", "on_site", "in_progress", "paused"].includes(j.status))
      || todays.find((j) => ACTIVE.includes(j.status)) || null;
    const upcoming = list.filter((j) => (j.scheduled_start || "").slice(0, 10) > today && ACTIVE.includes(j.status))
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start)).slice(0, 12);
    return { todays, next, upcoming };
  }, [jobs, today]);

  const first = (user?.name || "").split(" ")[0] || "there";
  const doneCount = todays.filter((j) => DONE.includes(j.status)).length;
  const dateText = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const step = async (job) => {
    const s = NEXT[job.status];
    if (!s) return;
    if (s.open) return nav(`/tech/job/${job.id}`);
    setBusy(true);
    try {
      const r = await api.techWrite(`/api/jobs/${job.id}/status`, { to: s.to });
      if (r?.queued) {
        const upd = (jobs || []).map((j) => (j.id === job.id ? { ...j, status: s.to } : j));
        setJobs(upd); writeCache(CACHE_KEY, upd); setData(upd);
        toast("Saved offline, will sync");
      } else {
        toast(s.to === "en_route" ? `Texted ${job.customer_name.split(" ")[0]} that you're on the way` : s.to === "on_site" ? "Arrived. Clock started" : "Work started");
        if (s.to === "in_progress") nav(`/tech/job/${job.id}`); else reload();
      }
    } catch (e) {
      toast(e, true);
    } finally { setBusy(false); }
  };

  const others = todays.filter((j) => j.id !== next?.id);

  return (
    <div className="phone">
      <style>{CSS}</style>
      <div className="phone-head" style={{ flexDirection: "column", alignItems: "stretch", gap: 8, paddingBottom: 14 }}>
        <div className="row">
          <Avatar name={user?.name || ""} color={user?.color || "var(--brand)"} size={36} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 21 }}>Today, {first}</h1>
            <div className="muted small">{dateText}</div>
          </div>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={() => { signOut(); nav("/login"); }}>Sign out</button>
        </div>
        <div className="row between">
          <SyncBadge onSynced={reload} />
          {todays.length > 0 && <span className="muted small">{doneCount} of {todays.length} done</span>}
        </div>
        {todays.length > 0 && (
          <div className="tt-progress"><span style={{ width: `${(doneCount / todays.length) * 100}%` }} /></div>
        )}
      </div>

      <div className="phone-body">
        {fromCache && <div className="callout small">You're offline. Showing your jobs from the last sync.</div>}
        {error && !jobs && <ErrorBox error={error} />}
        {loading && !jobs && <SkeletonList />}

        {jobs && (
          <>
            {next ? (
              <NextCard job={next} busy={busy} onStep={() => step(next)} onOpen={() => nav(`/tech/job/${next.id}`)} />
            ) : todays.length > 0 ? (
              <div className="card tt-done">
                <div className="tt-done-ico">✓</div>
                <h2>All done for today</h2>
                <div className="muted">Nice work, {first}. {doneCount} job{doneCount === 1 ? "" : "s"} wrapped up.</div>
              </div>
            ) : (
              <div className="card tt-done">
                <div className="tt-done-ico" style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}>☀</div>
                <h2>No jobs today</h2>
                <div className="muted">The office will add jobs to your day as they come in.</div>
              </div>
            )}

            {others.length > 0 && (
              <section>
                <div className="tt-sec">Rest of today</div>
                <div className="card">
                  {others.map((j) => <JobRow key={j.id} job={j} />)}
                </div>
              </section>
            )}

            <section>
              <div className="tt-sec">Upcoming</div>
              {upcoming.length ? (
                <div className="card">
                  {upcoming.map((j) => <JobRow key={j.id} job={j} showDay />)}
                </div>
              ) : (
                <div className="card" style={{ padding: "18px 16px" }}><span className="muted">Nothing else on your calendar yet.</span></div>
              )}
            </section>
          </>
        )}
        <div className="muted small" style={{ textAlign: "center", marginTop: 6 }}>{org?.name} · Job OS</div>
      </div>
    </div>
  );
}

function NextCard({ job, busy, onStep, onOpen }) {
  const s = NEXT[job.status];
  const label = { scheduled: "Next job", en_route: "Heading to", on_site: "On site now", in_progress: "Working now", paused: "Paused" }[job.status] || "Next job";
  return (
    <div className="card tt-next">
      <div className="tt-next-top" onClick={onOpen} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
        <div className="row between">
          <span className="tt-eyebrow">{label}</span>
          <Status s={job.status} />
        </div>
        <div className="tt-window">{windowText(job)}</div>
        <div className="tt-cust">{job.customer_name}</div>
        <div className="tt-title">{job.title} <span className="muted">· {job.number}</span></div>
        {job.priority && job.priority !== "normal" && <span className="pill red" style={{ marginTop: 8 }}>{job.priority === "emergency" ? "Emergency" : job.priority}</span>}
      </div>
      {job.address && (
        <div className="tt-addr">
          <Pin />
          <span style={{ flex: 1, minWidth: 0 }}>{job.address}</span>
          <a className="btn sm" href={mapsUrl(job.address)} target="_blank" rel="noreferrer">Navigate</a>
        </div>
      )}
      <div style={{ padding: "4px 16px 16px" }}>
        <Button variant="primary" size="lg" block onClick={onStep} disabled={busy} style={{ height: 56, fontSize: 17 }}>
          {busy ? "Saving…" : s?.label || "Open job"}
        </Button>
        {s?.hint && <div className="muted small" style={{ textAlign: "center", marginTop: 8 }}>{s.hint}</div>}
      </div>
    </div>
  );
}

function JobRow({ job, showDay }) {
  const done = DONE.includes(job.status);
  return (
    <Link to={`/tech/job/${job.id}`} className="tt-row">
      <div className="tt-time">
        {showDay && <div className="small muted">{day(job.scheduled_start)}</div>}
        <div style={{ fontWeight: 650, color: done ? "var(--ink-3)" : "var(--ink)" }}>{time(job.scheduled_start)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tt-row-title" style={done ? { color: "var(--ink-3)" } : undefined}>{job.customer_name}</div>
        <div className="small muted tt-ellipsis">{job.title}{job.address ? ` · ${job.address}` : ""}</div>
      </div>
      <Status s={job.status} />
      <span className="muted"><Chevron /></span>
    </Link>
  );
}

function SkeletonList() {
  return (
    <div className="col">
      <div className="card tt-skel" style={{ height: 230 }} />
      <div className="card tt-skel" style={{ height: 64 }} />
      <div className="card tt-skel" style={{ height: 64 }} />
    </div>
  );
}

const CSS = `
.tt-sync { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; background: none; border: 0; padding: 0; font-family: inherit; }
.tt-sync.warn { background: var(--amber-soft); color: var(--amber); border-radius: 999px; padding: 6px 12px; cursor: pointer; min-height: 32px; }
.tt-progress { height: 5px; border-radius: 99px; background: var(--surface-2); overflow: hidden; }
.tt-progress span { display: block; height: 100%; background: var(--green); border-radius: 99px; transition: width .4s; }
.tt-sec { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); font-weight: 650; margin: 6px 4px 8px; }
.tt-next { overflow: hidden; border: 0; box-shadow: 0 6px 24px rgba(16,24,40,.10), 0 1px 3px rgba(16,24,40,.08); }
.tt-next-top { padding: 16px 16px 12px; cursor: pointer; background: linear-gradient(180deg, var(--brand-soft), var(--surface)); }
.tt-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--brand); }
.tt-window { font-size: 26px; font-weight: 750; letter-spacing: -.02em; margin-top: 10px; font-variant-numeric: tabular-nums; }
.tt-cust { font-size: 18px; font-weight: 650; margin-top: 4px; }
.tt-title { color: var(--ink-2); margin-top: 2px; font-size: 15px; }
.tt-addr { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--line); color: var(--ink-2); font-size: 14.5px; }
.tt-addr .btn { height: 36px; padding: 0 14px; font-size: 14px; }
.tt-row { display: flex; align-items: center; gap: 12px; padding: 14px 14px; min-height: 64px; color: inherit; border-bottom: 1px solid var(--line); }
.tt-row:last-child { border-bottom: 0; }
.tt-row:active { background: var(--surface-2); }
.tt-time { width: 62px; flex: none; font-variant-numeric: tabular-nums; }
.tt-row-title { font-weight: 600; font-size: 15px; }
.tt-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tt-done { padding: 28px 18px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.tt-done-ico { width: 52px; height: 52px; border-radius: 50%; background: var(--green-soft); color: var(--green); display: grid; place-items: center; font-size: 26px; font-weight: 700; margin-bottom: 6px; }
.tt-skel { background: linear-gradient(90deg, var(--surface) 0%, var(--surface-2) 50%, var(--surface) 100%); background-size: 200% 100%; animation: tt-sh 1.2s infinite; }
@keyframes tt-sh { from { background-position: 200% 0 } to { background-position: -200% 0 } }
`;

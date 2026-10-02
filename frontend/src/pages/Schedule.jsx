import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHead, Pill, useToast } from "../components/ui";
import { api } from "../lib/api";
import { day, localISODate, statusLabel, statusTone, time } from "../lib/format";
import { useApi } from "../lib/useApi";

const SNAP = 30; // minutes
const TONE = {
  blue: ["var(--blue-soft)", "var(--blue)"], amber: ["var(--amber-soft)", "var(--amber)"], green: ["var(--green-soft)", "var(--green)"],
  red: ["var(--red-soft)", "var(--red)"], grey: ["var(--grey-soft)", "var(--grey)"],
};

const minsOf = (iso) => { const t = (iso || "").slice(11, 16); const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const isoAt = (date, mins) => `${date}T${hhmm(mins)}:00`;
const hourLabel = (h) => `${h % 12 || 12} ${h < 12 || h === 24 ? "AM" : "PM"}`;
const shiftDate = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return localISODate(d); };
const durOf = (j) => (j.scheduled_start && j.scheduled_end ? minsOf(j.scheduled_end) - minsOf(j.scheduled_start) : j.duration_min || 120);
const hrs = (m) => { const h = m / 60; return Number.isInteger(h) ? `${h}` : h.toFixed(1); };
const first = (name = "") => name.split(" ")[0];
const tradeName = (t = "") => (t === "hvac" ? "HVAC" : t.charAt(0).toUpperCase() + t.slice(1));

export default function Schedule() {
  const nav = useNavigate();
  const toast = useToast();
  const [date, setDate] = useState(localISODate());
  const board = useApi(`/api/schedule?date=${date}`);
  const [modal, setModal] = useState(null); // {job, initial}
  const [hover, setHover] = useState(null); // {techId, start, dur}
  const [saving, setSaving] = useState(false);
  const drag = useRef(null); // {job, fromTech, grab, dur}

  const data = board.data?.date === date ? board.data : null;
  const [h0, h1] = data?.hours || [8, 17];
  const span = (h1 - h0) * 60;
  const techs = data?.techs || [];
  const jobs = data?.jobs || [];
  const unscheduled = useMemo(() => [...(data?.unscheduled || [])].sort((a, b) =>
    (b.priority === "emergency") - (a.priority === "emergency") || (b.priority === "high") - (a.priority === "high")
    || (a.due_date || "9999").localeCompare(b.due_date || "9999")), [data]);

  const lanes = useMemo(() => techs.map((t) => {
    const mine = jobs.filter((j) => j.assigned_tech_ids?.includes(t.id) && j.scheduled_start);
    const booked = mine.reduce((s, j) => s + Math.max(0, Math.min(minsOf(j.scheduled_end), h1 * 60) - Math.max(minsOf(j.scheduled_start), h0 * 60)), 0);
    return { tech: t, jobs: mine, booked };
  }), [techs, jobs, h0, h1]);
  const totalBooked = lanes.reduce((s, l) => s + l.booked, 0);
  const totalAvail = techs.length * span;

  const today = localISODate();
  const [nowMin, setNowMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());
  useEffect(() => { const t = setInterval(() => setNowMin(new Date().getHours() * 60 + new Date().getMinutes()), 60000); return () => clearInterval(t); }, []);

  const schedule = async (job, techIds, startMin, dur) => {
    setSaving(true);
    try {
      const start = Math.max(0, startMin);
      await api.post(`/api/jobs/${job.id}/schedule`, { tech_ids: techIds, start: isoAt(date, start), end: isoAt(date, Math.min(start + dur, 24 * 60 - 1)), notify: true });
      const names = techIds.map((id) => first(techs.find((t) => t.id === id)?.name)).join(" & ");
      toast(`${job.number} booked with ${names} · ${day(date)} ${time(isoAt(date, start))}. Customer notified by text.`);
      board.reload();
    } catch (e) {
      toast(e.status === 409 ? e.message : e, true);
    } finally { setSaving(false); }
  };

  // ---- drag & drop ----
  const minuteAt = (e, dur, grab = 0) => {
    const r = e.currentTarget.getBoundingClientRect();
    const raw = h0 * 60 + ((e.clientX - r.left) / r.width) * span - grab;
    const snapped = Math.round(raw / SNAP) * SNAP;
    return Math.min(Math.max(snapped, h0 * 60), h1 * 60 - Math.min(dur, span));
  };
  const onDragOver = (e, techId) => {
    if (!drag.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const start = minuteAt(e, drag.current.dur, drag.current.grab);
    if (!hover || hover.techId !== techId || hover.start !== start) setHover({ techId, start, dur: drag.current.dur });
  };
  const onDrop = (e, techId) => {
    e.preventDefault();
    const d = drag.current;
    drag.current = null;
    setHover(null);
    if (!d) return;
    const start = minuteAt(e, d.dur, d.grab);
    const ids = d.fromTech ? [...new Set(d.job.assigned_tech_ids.map((x) => (x === d.fromTech ? techId : x)))] : [techId];
    if (d.fromTech && d.fromTech === techId && start === minsOf(d.job.scheduled_start)) return;
    schedule(d.job, ids, start, d.dur);
  };
  const startDrag = (e, job, fromTech) => {
    const dur = fromTech ? durOf(job) : job.duration_min || 120;
    let grab = 0;
    if (fromTech) {
      const r = e.currentTarget.getBoundingClientRect();
      const lane = e.currentTarget.parentElement.getBoundingClientRect();
      grab = ((e.clientX - r.left) / lane.width) * span;
      grab = Math.round(grab / SNAP) * SNAP;
    }
    drag.current = { job, fromTech, dur, grab };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", job.id);
  };
  const endDrag = () => { drag.current = null; setHover(null); };

  const isToday = date === today;

  return (
    <div className="page sc-page">
      <style>{CSS}</style>
      <PageHead title="Schedule" sub={data ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} on the board · ${hrs(totalBooked)} of ${hrs(totalAvail)} tech hours booked (${totalAvail ? Math.round((100 * totalBooked) / totalAvail) : 0}%) · ${unscheduled.length} waiting` : "Dispatch board"}>
        <div className="row">
          <Button size="sm" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</Button>
          <Button size="sm" variant={isToday ? "primary" : undefined} onClick={() => setDate(today)}>Today</Button>
          <Button size="sm" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">›</Button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 150, height: 32 }} aria-label="Pick a date" />
        </div>
      </PageHead>

      <ErrorBox error={board.error} />

      <div className="sc-split">
        {/* ---- unscheduled ---- */}
        <Card title={<span className="row" style={{ gap: 8 }}>Unscheduled {data && <Pill tone={unscheduled.length ? "amber" : "green"}>{unscheduled.length}</Pill>}</span>} pad={false}>
          {!data ? <Loading /> : unscheduled.length === 0 ? <Empty>All caught up. Every job has a time.</Empty> : (
            <div className="sc-unsched">
              <div className="muted small" style={{ padding: "0 4px 4px" }}>Drag onto a technician's lane, or click to book.</div>
              {unscheduled.map((j) => (
                <div key={j.id} className="sc-card" draggable onDragStart={(e) => startDrag(e, j, null)} onDragEnd={endDrag}
                  onClick={() => setModal({ job: j })} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setModal({ job: j })}>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="muted small num">{j.number}</span>
                    {j.source === "plan" && <Pill tone="green">Plan visit</Pill>}
                    {j.source === "quote" && <Pill tone="blue">Approved quote</Pill>}
                    {["high", "emergency"].includes(j.priority) && <Pill tone="red">{j.priority === "emergency" ? "Emergency" : "High"}</Pill>}
                    <span className="spacer" /><span className="muted small">{hrs(j.duration_min || 120)} h</span>
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{j.customer_name}</div>
                  <div className="small" style={{ color: "var(--ink-2)" }}>{j.title}</div>
                  <div className="muted small" style={{ marginTop: 3 }}>
                    {j.address || "No address"}{j.due_date ? <> · <span style={{ color: j.due_date < today ? "var(--red)" : undefined }}>due {day(j.due_date)}</span></> : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ---- board ---- */}
        <Card pad={false} title={<span>{day(date)}{isToday && <span className="muted small" style={{ fontWeight: 500 }}> · today</span>}</span>}
          actions={saving ? <span className="muted small">Saving…</span> : <span className="muted small">Drag a block to move it · click to open</span>}>
          {!data ? <Loading /> : techs.length === 0 ? <Empty>No active technicians. Add one under Team.</Empty> : (
            <div className="sc-scroll">
              <div className="sc-grid">
                <div className="sc-axis">
                  <div className="sc-who" />
                  <div className="sc-track">
                    {Array.from({ length: h1 - h0 + 1 }, (_, i) => (
                      <span key={i} className="sc-hour" style={{ left: `${(i * 60 * 100) / span}%` }}>{hourLabel(h0 + i)}</span>
                    ))}
                  </div>
                </div>
                {lanes.map(({ tech, jobs: tj, booked }) => {
                  const pct = Math.round((100 * booked) / span);
                  const skillMatch = drag.current && (!tech.skills?.length || tech.skills.includes(drag.current.job.trade));
                  return (
                    <div key={tech.id} className="sc-lane">
                      <div className="sc-who">
                        <Avatar name={tech.name} color={tech.color || "var(--brand)"} size={32} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tech.name}</div>
                          <div className="muted small">{(tech.skills || []).map(tradeName).join(" · ") || "All trades"}</div>
                          <div className="sc-cap" title={`${hrs(booked)} of ${hrs(span)} hours booked`}>
                            <div className="sc-cap-bar"><span style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? "var(--red)" : pct > 70 ? "var(--amber)" : "var(--green)" }} /></div>
                            <span className="muted small num">{hrs(booked)}/{hrs(span)} h</span>
                          </div>
                        </div>
                      </div>
                      <div className={`sc-track lane ${hover?.techId === tech.id ? "over" : ""} ${hover?.techId === tech.id && skillMatch === false ? "warn" : ""}`}
                        onDragOver={(e) => onDragOver(e, tech.id)} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHover(null); }}
                        onDrop={(e) => onDrop(e, tech.id)}>
                        {Array.from({ length: h1 - h0 }, (_, i) => <span key={i} className="sc-line" style={{ left: `${(i * 60 * 100) / span}%` }} />)}
                        {isToday && nowMin > h0 * 60 && nowMin < h1 * 60 && <span className="sc-now" style={{ left: `${((nowMin - h0 * 60) * 100) / span}%` }} />}
                        {tj.map((j) => {
                          const s = Math.max(minsOf(j.scheduled_start), h0 * 60);
                          const e = Math.min(minsOf(j.scheduled_end), h1 * 60);
                          const [bg, fg] = TONE[statusTone(j.status)] || TONE.grey;
                          const movable = j.status === "scheduled";
                          return (
                            <div key={j.id} className={`sc-block ${movable ? "movable" : ""}`} draggable={movable}
                              onDragStart={(ev) => startDrag(ev, j, tech.id)} onDragEnd={endDrag}
                              onClick={() => nav(`/jobs/${j.id}`)}
                              title={`${j.number} · ${j.customer_name} · ${j.title}\n${time(j.scheduled_start)}–${time(j.scheduled_end)} · ${statusLabel(j.status)}${j.address ? `\n${j.address}` : ""}`}
                              style={{ left: `${((s - h0 * 60) * 100) / span}%`, width: `calc(${((e - s) * 100) / span}% - 3px)`, background: bg, borderLeftColor: fg }}>
                              <div className="sc-b1"><span style={{ color: fg, fontWeight: 650 }}>{time(j.scheduled_start)}</span> {j.customer_name}</div>
                              <div className="sc-b2">{j.title}</div>
                              <div className="sc-b3" style={{ color: fg }}>{statusLabel(j.status)}</div>
                            </div>
                          );
                        })}
                        {hover?.techId === tech.id && (
                          <div className="sc-ghost" style={{ left: `${((hover.start - h0 * 60) * 100) / span}%`, width: `calc(${(hover.dur * 100) / span}% - 3px)` }}>
                            {time(isoAt(date, hover.start))}–{time(isoAt(date, hover.start + hover.dur))}
                            {skillMatch === false && <div style={{ fontWeight: 500 }}>No {tradeName(drag.current?.job.trade)} skill</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {modal && <ScheduleModal job={modal.job} date={date} techs={techs} onClose={() => setModal(null)}
        onDone={(msg) => { setModal(null); toast(msg); board.reload(); }} />}
    </div>
  );
}

/** Book (or re-book) a job: tech, date, start, duration, Also used by the job page. */
export function ScheduleModal({ job, date: initialDate, techs: givenTechs, onClose, onDone }) {
  const team = useApi(givenTechs ? null : "/api/team");
  const techs = givenTechs || (team.data || []).filter((u) => u.role === "tech" && u.active !== false);
  const scheduled = !!job.scheduled_start;
  const [form, setForm] = useState(() => ({
    tech: job.assigned_tech_ids?.[0] || "",
    date: scheduled ? job.scheduled_start.slice(0, 10) : initialDate || localISODate(),
    start: scheduled ? job.scheduled_start.slice(11, 16) : "09:00",
    dur: scheduled ? durOf(job) : job.duration_min || 120,
    notify: true,
  }));
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState(null);
  const set = (p) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    if (!form.tech && techs.length) {
      const fit = techs.find((t) => !t.skills?.length || t.skills.includes(job.trade)) || techs[0];
      set({ tech: fit.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techs.length]);

  const times = [];
  for (let m = 6 * 60; m <= 20 * 60; m += 15) times.push(hhmm(m));
  const durs = [30, 45, 60, 90, 120, 180, 240, 300, 360, 480];
  if (!durs.includes(form.dur)) durs.push(form.dur);
  durs.sort((a, b) => a - b);

  const submit = async () => {
    setBusy("save"); setErr(null);
    const [h, m] = form.start.split(":").map(Number);
    const endMin = h * 60 + m + Number(form.dur);
    if (endMin >= 24 * 60) { setErr(new Error("The visit must finish the same day")); setBusy(""); return; }
    try {
      await api.post(`/api/jobs/${job.id}/schedule`, { tech_ids: [form.tech], start: `${form.date}T${form.start}:00`, end: `${form.date}T${hhmm(endMin)}:00`, notify: form.notify });
      const tech = techs.find((t) => t.id === form.tech);
      onDone(`${job.number} booked with ${first(tech?.name)} · ${day(form.date)} ${time(`${form.date}T${form.start}:00`)}${form.notify ? ". Customer notified by text." : ""}`);
    } catch (e) { setErr(e); } finally { setBusy(""); }
  };
  const unschedule = async () => {
    setBusy("un"); setErr(null);
    try { await api.post(`/api/jobs/${job.id}/unschedule`); onDone(`${job.number} moved back to unscheduled`); }
    catch (e) { setErr(e); } finally { setBusy(""); }
  };

  const tech = techs.find((t) => t.id === form.tech);
  const mismatch = tech && tech.skills?.length && job.trade && !tech.skills.includes(job.trade);

  return (
    <Modal title={`${scheduled ? "Reschedule" : "Schedule"} ${job.number}`} onClose={onClose}
      footer={<>
        {scheduled && job.status === "scheduled" && <Button variant="danger" onClick={unschedule} disabled={!!busy} style={{ marginRight: "auto" }}>Unschedule</Button>}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={!!busy || !form.tech}>{busy === "save" ? "Booking…" : scheduled ? "Save new time" : "Book it"}</Button>
      </>}>
      <div className="sc-mjob">
        <div style={{ fontWeight: 600 }}>{job.customer_name || job.customer?.name} · {job.title}</div>
        <div className="muted small">{job.address || [job.site?.address, job.site?.city].filter(Boolean).join(", ")}{job.trade ? ` · ${tradeName(job.trade)}` : ""}{job.due_date ? ` · due ${day(job.due_date)}` : ""}</div>
      </div>
      <div className="grid g2">
        <Field label="Technician">
          <select value={form.tech} onChange={(e) => set({ tech: e.target.value })}>
            {!techs.length && <option value="">Loading…</option>}
            {techs.map((t) => <option key={t.id} value={t.id}>{t.name}{t.skills?.length ? ` (${t.skills.map(tradeName).join(", ")})` : ""}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" value={form.date} onChange={(e) => e.target.value && set({ date: e.target.value })} /></Field>
        <Field label="Start">
          <select value={form.start} onChange={(e) => set({ start: e.target.value })}>
            {!times.includes(form.start) && <option value={form.start}>{time(`2000-01-01T${form.start}:00`)}</option>}
            {times.map((t) => <option key={t} value={t}>{time(`2000-01-01T${t}:00`)}</option>)}
          </select>
        </Field>
        <Field label="Duration">
          <select value={form.dur} onChange={(e) => set({ dur: Number(e.target.value) })}>
            {durs.map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : `${hrs(d)} h`}</option>)}
          </select>
        </Field>
      </div>
      {mismatch ? <div className="small" style={{ color: "var(--amber)" }}>Heads up: {first(tech.name)} isn't listed with the {tradeName(job.trade)} skill.</div> : null}
      <label className="check small"><input type="checkbox" checked={form.notify} onChange={(e) => set({ notify: e.target.checked })} /> Text the customer a booking confirmation</label>
      <ErrorBox error={err} />
    </Modal>
  );
}

const CSS = `
.sc-page { max-width: 1500px; }
.sc-split { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 16px; align-items: start; }
@media (max-width: 1000px) { .sc-split { grid-template-columns: 1fr; } }
.sc-unsched { display: flex; flex-direction: column; gap: 8px; padding: 12px; max-height: calc(100vh - 210px); overflow: auto; }
.sc-card { border: 1px solid var(--line); border-left: 3px solid var(--grey); border-radius: 9px; padding: 9px 11px; background: var(--surface); cursor: grab; transition: box-shadow .12s, border-color .12s; }
.sc-card:hover { box-shadow: var(--shadow); border-color: var(--line-2); border-left-color: var(--brand); }
.sc-card:active { cursor: grabbing; }
.sc-scroll { overflow-x: auto; }
.sc-grid { min-width: 820px; padding: 4px 0 10px; }
.sc-axis, .sc-lane { display: grid; grid-template-columns: 200px 1fr; }
.sc-axis { height: 30px; position: sticky; top: 0; }
.sc-axis .sc-track { position: relative; margin-right: 24px; }
.sc-hour { position: absolute; top: 8px; transform: translateX(-50%); font-size: 11.5px; color: var(--ink-3); white-space: nowrap; }
.sc-lane { border-top: 1px solid var(--line); min-height: 76px; }
.sc-who { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px 10px 16px; }
.sc-cap { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.sc-cap-bar { flex: 1; height: 5px; border-radius: 3px; background: var(--surface-2); overflow: hidden; max-width: 70px; }
.sc-cap-bar span { display: block; height: 100%; border-radius: 3px; }
.sc-track.lane { position: relative; margin: 6px 24px 6px 0; border-radius: 8px; background: var(--surface-2); transition: background .1s; }
.sc-track.lane.over { background: var(--brand-soft); }
.sc-track.lane.warn { background: var(--amber-soft); }
.sc-line { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--line); }
.sc-line:first-child { display: none; }
.sc-now { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--red); z-index: 3; border-radius: 1px; }
.sc-block { position: absolute; top: 4px; bottom: 4px; border-radius: 7px; border-left: 3px solid; padding: 5px 7px; overflow: hidden; cursor: pointer; z-index: 2; font-size: 12px; line-height: 1.3; box-shadow: 0 1px 2px rgba(16,24,40,.06); }
.sc-block:hover { box-shadow: 0 4px 12px rgba(16,24,40,.15); z-index: 4; }
.sc-block.movable { cursor: grab; }
.sc-b1, .sc-b2, .sc-b3 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-b1 { font-weight: 600; color: var(--ink); }
.sc-b2 { color: var(--ink-2); }
.sc-b3 { font-size: 11px; font-weight: 600; }
.sc-ghost { position: absolute; top: 4px; bottom: 4px; border: 2px dashed var(--brand); border-radius: 7px; background: rgba(11,92,255,.08); z-index: 5; pointer-events: none; font-size: 11.5px; font-weight: 650; color: var(--brand); padding: 5px 7px; white-space: nowrap; overflow: hidden; }
.sc-track.lane.warn .sc-ghost { border-color: var(--amber); color: var(--amber); background: rgba(180,83,9,.08); }
.sc-mjob { background: var(--surface-2); border-radius: 9px; padding: 10px 12px; }
`;

import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, Button, Card, Empty, ErrorBox, Loading, Money, PageHead, Pill, Status, Tabs } from "../components/ui";
import { day, time } from "../lib/format";
import { useApi } from "../lib/useApi";

const GROUPS = [
  ["new", "Unscheduled", ["new"]],
  ["scheduled", "Scheduled", ["scheduled"]],
  ["field", "In the field", ["en_route", "on_site", "in_progress", "paused"]],
  ["done", "Done · to invoice", ["completed"]],
  ["billed", "Invoiced / paid", ["invoiced", "paid"]],
  ["all", "All", null],
];
const tradeName = (t = "") => (t === "hvac" ? "HVAC" : t.charAt(0).toUpperCase() + t.slice(1));
const JOB_TYPE = { repair: "Repair", maintenance: "Maintenance", install: "Install", estimate: "Estimate", inspection: "Inspection", visit: "Visit" };
const SOURCE = { plan: "Plan visit", quote: "From quote", lead: null, manual: null, booking: "Booked online" };

export default function Jobs() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = GROUPS.some((g) => g[0] === params.get("status")) ? params.get("status") : "all";
  const q = params.get("q") || "";
  const setParam = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }); };

  const jobs = useApi("/api/jobs");
  const team = useApi("/api/team");
  const people = useMemo(() => Object.fromEntries((team.data || []).map((u) => [u.id, u])), [team.data]);
  const all = jobs.data || [];

  const inGroup = (j, key) => { const g = GROUPS.find((x) => x[0] === key); return !g[2] || g[2].includes(j.status); };
  const counts = useMemo(() => Object.fromEntries(GROUPS.map(([k]) => [k, all.filter((j) => inGroup(j, k)).length])), [all]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = all.filter((j) => inGroup(j, tab) && (!needle
      || `${j.number} ${j.title} ${j.customer_name} ${j.address}`.toLowerCase().includes(needle)));
    const when = (j) => j.scheduled_start || j.due_date || j.created_at || "";
    if (tab === "scheduled" || tab === "field") return list.sort((a, b) => when(a).localeCompare(when(b)));
    if (tab === "new") return list.sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
    return list.sort((a, b) => (a.status === "new") !== (b.status === "new") ? (a.status === "new" ? -1 : 1) : when(b).localeCompare(when(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, tab, q]);

  const toInvoice = all.filter((j) => j.status === "completed");

  return (
    <div className="page">
      <PageHead title="Jobs" sub="Every visit from booking to paid.">
        <Button onClick={() => nav("/schedule")}>Open schedule</Button>
      </PageHead>

      <div className="row wrap" style={{ marginBottom: 2, alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
          <Tabs value={tab} onChange={(k) => setParam("status", k === "all" ? "" : k)}
            tabs={GROUPS.map(([k, l]) => [k, jobs.data ? `${l} · ${counts[k]}` : l])} />
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="search" placeholder="Search by customer, title, address or job number" value={q} onChange={(e) => setParam("q", e.target.value)} style={{ maxWidth: 380 }} />
        <div className="spacer" />
        {toInvoice.length > 0 && tab !== "done" && (
          <button className="pill amber" style={{ border: 0, cursor: "pointer", padding: "5px 12px" }} onClick={() => setParam("status", "done")}>
            {toInvoice.length} done job{toInvoice.length > 1 ? "s" : ""} waiting for an invoice →
          </button>
        )}
      </div>

      <ErrorBox error={jobs.error} />
      {jobs.loading && !jobs.data ? <Card><Loading /></Card> : jobs.data && (
        <Card pad={false}>
          {rows.length === 0 ? (
            <Empty>{q ? `No jobs match “${q}”.` : tab === "field" ? "Nobody is out on a job right now." : tab === "done" ? "Nothing waiting to be invoiced. Nice." : "No jobs here yet."}</Empty>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="t">
                <thead>
                  <tr><th>Job</th><th>Title</th><th>Customer</th><th>Address</th><th>When</th><th>Techs</th><th>Status</th><th className="r">Total</th></tr>
                </thead>
                <tbody>
                  {rows.map((j) => (
                    <tr key={j.id} className="click" onClick={() => nav(`/jobs/${j.id}`)}>
                      <td className="num" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{j.number}</td>
                      <td style={{ minWidth: 180 }}>
                        <div>{j.title}</div>
                        <div className="row" style={{ gap: 6, marginTop: 2 }}>
                          <span className="muted small">{tradeName(j.trade)}{j.job_type ? ` · ${JOB_TYPE[j.job_type] || j.job_type}` : ""}</span>
                          {SOURCE[j.source] && <Pill tone={j.source === "plan" ? "green" : "blue"}>{SOURCE[j.source]}</Pill>}
                          {["high", "emergency"].includes(j.priority) && <Pill tone="red">{j.priority}</Pill>}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{j.customer_name}</td>
                      <td className="muted small" style={{ minWidth: 160 }}>{j.address || "–"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {j.scheduled_start ? (
                          <><div>{day(j.scheduled_start)}</div><div className="muted small">{time(j.scheduled_start)}–{time(j.scheduled_end)}</div></>
                        ) : j.due_date ? <span className="small">Due {day(j.due_date)}</span> : <span className="muted small">Not booked</span>}
                      </td>
                      <td>
                        {j.assigned_tech_ids?.length ? (
                          <div className="row" style={{ gap: 6 }}>
                            <div style={{ display: "flex" }}>
                              {j.assigned_tech_ids.map((id, i) => (
                                <span key={id} style={{ marginLeft: i ? -6 : 0, border: "2px solid var(--surface)", borderRadius: "50%", display: "inline-flex" }} title={people[id]?.name}>
                                  <Avatar name={people[id]?.name || "?"} color={people[id]?.color || "var(--ink-3)"} size={24} />
                                </span>
                              ))}
                            </div>
                            {j.assigned_tech_ids.length === 1 && <span className="small" style={{ whiteSpace: "nowrap" }}>{people[j.assigned_tech_ids[0]]?.name?.split(" ")[0]}</span>}
                          </div>
                        ) : <span className="muted small">–</span>}
                      </td>
                      <td><Status s={j.status} /></td>
                      <td className="r" style={{ fontWeight: 600 }}>{j.totals && j.lines?.length ? <Money cents={j.totals.total_cents} /> : <span className="muted">–</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {jobs.data && rows.length > 0 && <div className="muted small" style={{ marginTop: 8 }}>{rows.length} job{rows.length === 1 ? "" : "s"}</div>}
    </div>
  );
}

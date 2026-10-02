import { useMemo, useState } from "react";
import { Avatar, Card, Empty, ErrorBox, Loading, Money, PageHead, Pill, Tile } from "../components/ui";
import { CHANNEL, money } from "../lib/format";
import { useApi } from "../lib/useApi";

const SOURCE = { ...CHANNEL, referral: "Referral", website: "Website", google_ads: "Google Ads", facebook: "Facebook", yelp: "Yelp",
  plan: "Maintenance plan", "repeat / direct": "Repeat / direct" };
const TYPE = { repair: "Repair", maintenance: "Tune-up / maintenance", install: "Install / replacement", estimate: "Estimate visit",
  visit: "Route visit", inspection: "Planned inspection", other: "Other" };
const label = (map, k) => map[k] || (k ? k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ") : "—");
const monthName = (ym, long) => new Date(`${ym}-15T12:00:00`).toLocaleDateString([], { month: long ? "long" : "short", ...(long ? { year: "numeric" } : {}) });

// Fill gaps so a quiet month shows as an empty bar rather than disappearing.
function fillMonths(rows) {
  if (!rows.length) return [];
  const map = Object.fromEntries(rows.map((r) => [r.month, r.cents]));
  const [y0, m0] = rows[0].month.split("-").map(Number);
  const [y1, m1] = rows[rows.length - 1].month.split("-").map(Number);
  const out = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, m = 1) : m++) {
    const k = `${y}-${String(m).padStart(2, "0")}`;
    out.push({ month: k, cents: map[k] || 0 });
  }
  return out.slice(-12);
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((x) => x * p).find((x) => x >= v);
}

function RevenueChart({ rows }) {
  const [hover, setHover] = useState(null);
  const data = fillMonths(rows);
  if (!data.length) return <Empty>No invoices in the last 12 months yet.</Empty>;
  const W = 1100, H = 280, L = 54, R = 8, T = 12, B = 28;
  const max = niceMax(Math.max(...data.map((d) => d.cents)));
  const slot = (W - L - R) / data.length;
  const bw = Math.min(46, slot * 0.62);
  const y = (c) => T + (H - T - B) * (1 - c / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const best = data.reduce((a, b) => (b.cents > a.cents ? b : a), data[0]);
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Revenue by month">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t ? "3 3" : undefined} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{money(t, { compact: true }).replace(/\.00$/, "")}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + slot * i + (slot - bw) / 2;
          const h = Math.max(0, y(0) - y(d.cents));
          const r = Math.min(4, h / 2);
          const on = hover === i;
          return (
            <g key={d.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
              <rect x={L + slot * i} y={T} width={slot} height={H - T - B} fill="transparent" />
              {h > 0 && (
                <path d={`M${x},${y(0)} V${y(d.cents) + r} Q${x},${y(d.cents)} ${x + r},${y(d.cents)} H${x + bw - r} Q${x + bw},${y(d.cents)} ${x + bw},${y(d.cents) + r} V${y(0)} Z`}
                  fill="var(--brand)" opacity={hover == null || on ? 1 : 0.45} style={{ transition: "opacity .15s" }} />
              )}
              <text x={x + bw / 2} y={H - 9} textAnchor="middle" fontSize="11" fill={on ? "var(--ink)" : "var(--ink-3)"}>{monthName(d.month)}</text>
              {d === best && hover == null && (
                <text x={x + bw / 2} y={y(d.cents) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink-2)">{money(d.cents, { compact: true })}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div style={{ position: "absolute", top: 0, left: `${((L + slot * hover + slot / 2) / W) * 100}%`, transform: "translateX(-50%)", background: "var(--ink)", color: "#fff",
          borderRadius: 8, padding: "6px 10px", fontSize: 12.5, pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "var(--shadow)" }}>
          <div style={{ opacity: 0.75 }}>{monthName(data[hover].month, true)}</div>
          <b className="num">{money(data[hover].cents)}</b>
        </div>
      )}
    </div>
  );
}

const Bar = ({ value, max, color = "var(--brand)" }) => (
  <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden", minWidth: 60 }}>
    <div style={{ height: "100%", width: `${max > 0 ? Math.max(0, (100 * value) / max) : 0}%`, background: color, borderRadius: 4 }} />
  </div>
);

export default function Reports() {
  const { data, loading, error } = useApi("/api/reports");

  const derived = useMemo(() => {
    if (!data) return null;
    const sources = [...data.lead_sources].sort((a, b) => b.profit_cents - a.profit_cents);
    const types = [...data.job_types].sort((a, b) => b.revenue_cents - a.revenue_cents);
    const months = fillMonths(data.revenue_by_month);
    const last = months[months.length - 1], prev = months[months.length - 2];
    return { sources, types, best: sources[0], months, last, prev };
  }, [data]);

  if (loading && !data) return <div className="page"><PageHead title="Reports" sub="Where the money comes from" /><Loading /></div>;
  if (error) return <div className="page"><PageHead title="Reports" /><ErrorBox error={error} /></div>;

  const { totals, techs } = data;
  const { sources, types, best } = derived;
  const avgTicket = totals.invoices ? Math.round(totals.revenue_cents / totals.invoices) : 0;
  const maxSrcProfit = Math.max(0, ...sources.map((s) => s.profit_cents));
  const maxTypeRev = Math.max(0, ...types.map((t) => t.revenue_cents));
  const maxTechRev = Math.max(0, ...techs.map((t) => t.revenue_cents));
  const bestMonth = derived.months.reduce((a, b) => (b.cents > (a?.cents ?? -1) ? b : a), null);

  return (
    <div className="page">
      <PageHead title="Reports" sub="Last 12 months · revenue before tax, profit after parts and labour cost" />

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Tile k="Revenue · last 12 months" v={<Money cents={totals.revenue_cents} />} s={`${totals.invoices} invoices`} />
        <Tile k="Average invoice" v={<Money cents={avgTicket} />} s="before tax" />
        <Tile k="Best month" v={bestMonth ? <Money cents={bestMonth.cents} /> : "—"} s={bestMonth ? monthName(bestMonth.month, true) : ""} />
        <Tile k="Most profitable source" v={best ? label(SOURCE, best.source) : "—"} s={best ? `${money(best.profit_cents)} profit from ${best.jobs} jobs` : ""} />
      </div>

      <Card title="Revenue by month" style={{ marginBottom: 14 }}
        actions={<span className="muted small">Hover a bar for the exact amount</span>}>
        <RevenueChart rows={data.revenue_by_month} />
      </Card>

      <Card title="Lead source → profit" pad={false} style={{ marginBottom: 14 }}
        actions={<span className="muted small">Which marketing actually pays</span>}>
        {best && (
          <div className="callout" style={{ margin: "14px 16px 4px" }}>
            <b>{label(SOURCE, best.source)}</b> is your best source: {money(best.profit_cents)} profit from {best.jobs} jobs
            ({best.revenue_cents ? Math.round((100 * best.profit_cents) / best.revenue_cents) : 0}% margin). Put more of your marketing budget here.
          </div>
        )}
        {!sources.length ? <Empty>No jobs invoiced yet.</Empty> : (
          <div style={{ overflowX: "auto" }}>
            <table className="t">
              <thead><tr><th>Source</th><th className="r">Jobs</th><th className="r">Revenue</th><th className="r">Profit</th><th className="r">Margin</th><th style={{ width: "26%" }}></th></tr></thead>
              <tbody>
                {sources.map((s, i) => (
                  <tr key={s.source} style={i === 0 ? { background: "var(--green-soft)" } : undefined}>
                    <td style={{ fontWeight: 550 }}><span className="row" style={{ gap: 8 }}>{label(SOURCE, s.source)}{i === 0 && <Pill tone="green">Best</Pill>}</span></td>
                    <td className="r num">{s.jobs}</td>
                    <td className="r"><Money cents={s.revenue_cents} /></td>
                    <td className="r" style={{ fontWeight: 600 }}><Money cents={s.profit_cents} /></td>
                    <td className="r num">{s.revenue_cents ? Math.round((100 * s.profit_cents) / s.revenue_cents) : 0}%</td>
                    <td><Bar value={s.profit_cents} max={maxSrcProfit} color={i === 0 ? "var(--green)" : "var(--brand)"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <Card title="Profit by job type" pad={false}>
          {!types.length ? <Empty>No jobs invoiced yet.</Empty> : (
            <table className="t">
              <thead><tr><th>Job type</th><th className="r">Revenue</th><th style={{ width: "30%" }}></th><th className="r">Margin</th></tr></thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.type}>
                    <td style={{ fontWeight: 550 }}>{label(TYPE, t.type)}</td>
                    <td className="r"><Money cents={t.revenue_cents} /></td>
                    <td><Bar value={t.revenue_cents} max={maxTypeRev} /></td>
                    <td className="r"><Pill tone={t.margin_percent >= 45 ? "green" : t.margin_percent >= 25 ? "amber" : "red"}>{t.margin_percent}%</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Technicians" pad={false}>
          {!techs.length ? <Empty>No technician work invoiced yet.</Empty> : (
            <div style={{ overflowX: "auto" }}>
              <table className="t">
                <thead><tr><th>Technician</th><th className="r">Revenue</th><th className="r">Jobs</th><th className="r">Avg ticket</th><th className="r">Not completed</th></tr></thead>
                <tbody>
                  {techs.map((t) => (
                    <tr key={t.tech}>
                      <td>
                        <div className="row" style={{ gap: 8 }}><Avatar name={t.tech} size={26} /><span style={{ fontWeight: 550 }}>{t.tech}</span></div>
                        <div style={{ marginTop: 6, marginLeft: 34 }}><Bar value={t.revenue_cents} max={maxTechRev} /></div>
                      </td>
                      <td className="r"><Money cents={t.revenue_cents} /></td>
                      <td className="r num">{t.jobs}</td>
                      <td className="r"><Money cents={t.avg_ticket_cents} /></td>
                      <td className="r">{t.non_complete ? <Pill tone="red">{t.non_complete}</Pill> : <span className="muted">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

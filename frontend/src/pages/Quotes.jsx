import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Empty, ErrorBox, Loading, Money, PageHead, Status, Tabs, Tile } from "../components/ui";
import { ago, money } from "../lib/format";
import { useApi } from "../lib/useApi";

const GROUPS = {
  all: () => true,
  draft: (q) => q.status === "draft",
  out: (q) => q.status === "sent" || q.status === "viewed",
  approved: (q) => q.status === "approved",
  declined: (q) => q.status === "declined",
};

export default function Quotes() {
  const nav = useNavigate();
  const { data, loading, error } = useApi("/api/quotes");
  const [tab, setTab] = useState("all");
  const quotes = data || [];

  const counts = useMemo(() => Object.fromEntries(Object.entries(GROUPS).map(([k, f]) => [k, quotes.filter(f).length])), [quotes]);
  const rows = quotes.filter(GROUPS[tab]);
  const out = quotes.filter(GROUPS.out);
  const outValue = out.reduce((s, q) => s + (q.best_total_cents || 0), 0);
  const answered = counts.approved + counts.declined;
  const winRate = answered ? Math.round((100 * counts.approved) / answered) : null;
  const wonValue = quotes.filter(GROUPS.approved).reduce((s, q) => s + (q.best_total_cents || 0), 0);

  const label = (k, l) => `${l}${data ? ` · ${counts[k]}` : ""}`;

  return (
    <div className="page">
      <PageHead title="Quotes" sub="Good / better / best options your customers approve and sign from their phone.">
        <Button variant="primary" onClick={() => nav("/quotes/new")}>+ New quote</Button>
      </PageHead>

      {data && (
        <div className="grid g4" style={{ marginBottom: 16 }}>
          <Tile k="Waiting on customer" v={<Money cents={outValue} />} s={`${out.length} quote${out.length === 1 ? "" : "s"} sent or viewed`} onClick={() => setTab("out")} />
          <Tile k="Drafts" v={counts.draft} s="Not sent yet" onClick={() => setTab("draft")} />
          <Tile k="Approved" v={<Money cents={wonValue} />} s={`${counts.approved} signed`} onClick={() => setTab("approved")} />
          <Tile k="Win rate" v={winRate == null ? "–" : `${winRate}%`} s={answered ? `${answered} answered` : "No answers yet"} />
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[["all", label("all", "All")], ["draft", label("draft", "Draft")], ["out", label("out", "Out")],
          ["approved", label("approved", "Approved")], ["declined", label("declined", "Declined")]]}
      />

      <ErrorBox error={error} />
      {loading && !data ? <Card><Loading /></Card> : data && (
        <Card pad={false}>
          {rows.length === 0 ? (
            <Empty>
              {tab === "all" ? "No quotes yet. Build your first good / better / best quote." : "No quotes here."}
              {tab === "all" && <div style={{ marginTop: 12 }}><Button variant="primary" onClick={() => nav("/quotes/new")}>+ New quote</Button></div>}
            </Empty>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="t">
                <thead>
                  <tr><th>Quote</th><th>Customer</th><th>Title</th><th>Status</th><th className="r">Up to</th><th className="r">Activity</th></tr>
                </thead>
                <tbody>
                  {rows.map((q) => (
                    <tr key={q.id} className="click" onClick={() => nav(`/quotes/${q.id}`)}>
                      <td className="num" style={{ fontWeight: 600 }}>{q.number}</td>
                      <td>{q.customer_name || <span className="muted">–</span>}</td>
                      <td>
                        <div>{q.title}</div>
                        <div className="muted small">{q.options?.length || 0} option{q.options?.length === 1 ? "" : "s"}{q.options?.length > 1 ? ` · from ${money(Math.min(...q.options.map((o) => o.totals.total_cents)))}` : ""}</div>
                      </td>
                      <td><Status s={q.status} /></td>
                      <td className="r" style={{ fontWeight: 600 }}><Money cents={q.best_total_cents} /></td>
                      <td className="r muted small" style={{ whiteSpace: "nowrap" }}>
                        {q.status === "approved" && q.approved_at ? `Approved ${ago(q.approved_at)}`
                          : q.sent_at ? `Sent ${ago(q.sent_at)}` : `Created ${ago(q.created_at)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

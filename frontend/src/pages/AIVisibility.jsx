import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Empty, ErrorBox, Field, Loading, PageHead, Pill, useToast } from "../components/ui";
import { api } from "../lib/api";
import { day } from "../lib/format";
import { useApi } from "../lib/useApi";

// Do AI assistants recommend this business? Asks each connected assistant what a customer would ask
// ("best <trade> company in <town>") and checks whether the business is named. Results are kept so you can track them.
const TIPS = [
  "Fill in your Google Business Profile: every service, your service area, hours and photos.",
  "Ask each happy customer for a review that mentions the job and the town.",
  "Give each main service its own page on your website, naming the towns you cover.",
  "Keep your business name, address and phone exactly the same on every listing.",
];

export default function AIVisibility() {
  const toast = useToast();
  const conn = useApi("/api/integrations");
  const history = useApi("/api/ai/visibility");
  const [f, setF] = useState({ trade: "", town: "" });
  const [busy, setBusy] = useState(false);
  const latest = history.data?.[0];

  const run = async () => {
    setBusy(true);
    try {
      const r = await api.post("/api/ai/visibility", f);
      history.setData((h) => [r, ...(h || [])]);
    } catch (e) { toast(e, true); } finally { setBusy(false); }
  };

  return (
    <div className="page">
      <PageHead title="AI visibility" sub="Do AI assistants recommend you when customers ask for your trade in your town?" />
      {conn.data && !conn.data.ai && (
        <div className="callout" style={{ marginBottom: 16 }}>
          Connect at least one AI assistant (ChatGPT, Claude, Gemini or Perplexity) in <Link to="/settings">Settings</Link> to run a check.
        </div>
      )}
      <div className="grid g2" style={{ alignItems: "start" }}>
        <Card title="Run a check">
          <div className="col" style={{ gap: 12 }}>
            <Field label="Your trade"><input placeholder="e.g. furnace repair" value={f.trade} onChange={(e) => setF({ ...f, trade: e.target.value })} /></Field>
            <Field label="Your town"><input placeholder="e.g. Denver, CO" value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} /></Field>
            <div>
              <Button variant="primary" disabled={busy || !conn.data?.ai || !f.trade.trim() || !f.town.trim()} onClick={run}>{busy ? "Asking…" : "Check now"}</Button>
              {conn.data?.ai && <span className="muted small" style={{ marginLeft: 10 }}>Asks: {conn.data.ai_engines.join(", ")}</span>}
            </div>
          </div>
        </Card>
        <Card title="How to show up more">
          <ol style={{ margin: 0, paddingLeft: 18, color: "var(--ink-2)" }}>{TIPS.map((t) => <li key={t} style={{ marginBottom: 6 }}>{t}</li>)}</ol>
        </Card>
      </div>

      {latest && (
        <Card title={`Latest: "${latest.trade}" in ${latest.town}`} actions={<Pill tone={latest.mentioned ? "green" : "amber"}>Named by {latest.mentioned} of {latest.asked}</Pill>} style={{ marginTop: 16 }}>
          <div className="muted small" style={{ marginBottom: 10 }}>Question asked: {latest.question}</div>
          <div className="grid g2">
            {latest.results.map((r) => (
              <div key={r.engine} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ marginBottom: 6 }}>
                  <strong>{r.engine}</strong><div className="spacer" />
                  {r.error ? <Pill tone="red">Couldn't ask</Pill> : r.mentioned ? <Pill tone="green">Names you</Pill> : <Pill tone="amber">Doesn't name you</Pill>}
                </div>
                <div className="small" style={{ whiteSpace: "pre-wrap", color: "var(--ink-2)", maxHeight: 220, overflowY: "auto" }}>{r.error || r.answer}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Past checks" pad={false} style={{ marginTop: 16 }}>
        {history.loading && !history.data ? <Loading /> : history.error ? <ErrorBox error={history.error} /> : history.data.length === 0 ? <Empty>No checks yet.</Empty> : (
          <table className="t">
            <thead><tr><th>Date</th><th>Trade</th><th>Town</th><th>Named by</th></tr></thead>
            <tbody>{history.data.map((h) => <tr key={h.id}><td>{day(h.created_at)}</td><td>{h.trade}</td><td>{h.town}</td><td>{h.mentioned} of {h.asked}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

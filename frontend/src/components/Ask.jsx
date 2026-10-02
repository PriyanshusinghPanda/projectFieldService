import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { api } from "../lib/api";

// "Ask" button on every office page. It sends the question plus the page you're on (and the record open on it),
// so "summarise this" works on a job, customer or invoice. Answers come from the backend /api/ai/ask.
const SUGGEST = {
  "/jobs/": ["Summarise this job"],
  "/customers/": ["Summarise this customer"],
  "/invoices/": ["Summarise this invoice", "Who owes me money?"],
  "/invoices": ["Who owes me money?", "How much have we collected this month?"],
  "/schedule": ["What's on today?", "Which jobs still need scheduling?"],
  "/quotes": ["Which quotes are waiting on the customer?"],
  "/messages": ["Any unread texts?"],
  "/inbox": ["Any new leads?"],
  "/": ["What's on today?", "Who owes me money?", "Any new leads?"],
};

function context(path) {
  const m = path.match(/^\/(jobs|customers|invoices)\/([^/]+)$/);
  const key = m ? `/${m[1]}/` : Object.keys(SUGGEST).find((k) => k !== "/" && path.startsWith(k)) || "/";
  return { recordId: m && m[2] !== "new" ? m[2] : null, suggestions: SUGGEST[key] || SUGGEST["/"] };
}

export default function Ask({ open, setOpen }) {
  const { pathname } = useLocation();
  const [q, setQ] = useState("");
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const { recordId, suggestions } = context(pathname);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [chat.length, busy]);

  const ask = async (question) => {
    const text = (question ?? q).trim();
    if (!text || busy) return;
    setQ("");
    setChat((c) => [...c, { who: "me", text }]);
    setBusy(true);
    try {
      const r = await api.post("/api/ai/ask", { question: text, page: pathname, record_id: recordId });
      setChat((c) => [...c, { who: "ai", text: r.answer, links: r.links }]);
    } catch (e) {
      setChat((c) => [...c, { who: "ai", text: "Sorry, I couldn't answer that just now. Please try again." }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <style>{CSS}</style>
      {open && (
        <div className="ask-panel" role="dialog" aria-label="Ask">
          <div className="ask-head">
            <Sparkles size={16} /><strong>Ask about your business</strong>
            <div className="spacer" />
            <button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
          </div>
          <div className="ask-body">
            {chat.length === 0 && <div className="muted small" style={{ marginBottom: 8 }}>Ask a question in plain words. I can see the page you're on.</div>}
            {chat.map((m, i) => (
              <div key={i} className={`ask-msg ${m.who}`}>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                {m.links?.length > 0 && (
                  <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {m.links.map((l) => <Link key={l.to} className="btn sm" to={l.to}>{l.label} →</Link>)}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="ask-msg ai muted">Thinking…</div>}
            <div ref={end} />
          </div>
          <div className="ask-sugg">
            {suggestions.map((s) => <button key={s} className="btn sm" onClick={() => ask(s)} disabled={busy}>{s}</button>)}
          </div>
          <form className="ask-form" onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your question…" autoFocus />
            <button className="btn primary" disabled={busy || !q.trim()}>Ask</button>
          </form>
        </div>
      )}
    </>
  );
}

const CSS = `
.ask-btn { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 0 0 8px; }
.ask-panel { position: fixed; right: 24px; bottom: 24px; z-index: 40; width: 380px; max-width: calc(100vw - 32px); height: 560px; max-height: calc(100vh - 48px);
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; overflow: hidden; }
.ask-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.ask-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.ask-msg { padding: 9px 12px; border-radius: 12px; max-width: 92%; }
.ask-msg.me { align-self: flex-end; background: var(--brand); color: var(--brand-ink); }
.ask-msg.ai { align-self: flex-start; background: var(--surface-2); }
.ask-sugg { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 14px 10px; }
.ask-form { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid var(--line); }
@media (max-width: 900px) { .ask-btn { margin: 0; white-space: nowrap; flex: none; } }
@media (max-width: 760px) { .ask-panel { right: 16px; bottom: 16px; } }
`;

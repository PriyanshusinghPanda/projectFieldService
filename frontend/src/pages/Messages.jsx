import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorBox, Loading, PageHead, Pill, useToast } from "../components/ui";
import { api } from "../lib/api";
import { ago, time } from "../lib/format";
import { useApi } from "../lib/useApi";

// Two-way texting with customers. Outbound goes through the SMS provider (Twilio by default, see backend send_sms);
// replies arrive on the inbound webhook and show up here. The list refreshes every 10 seconds.
export default function Messages() {
  const [params, setParams] = useSearchParams();
  const open = params.get("c");
  const list = useApi("/api/inbox/threads");
  const conn = useApi("/api/integrations");
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => list.reload(), 10000);
    return () => clearInterval(t);
  }, [list.reload]);

  const select = (contact) => { setComposing(false); setParams(contact ? { c: contact } : {}); };

  return (
    <div className="page">
      <style>{CSS}</style>
      <PageHead title="Messages" sub="Text customers and see their replies in one place">
        <Button variant="primary" onClick={() => { setComposing(true); setParams({}); }}>New message</Button>
      </PageHead>
      {conn.data && !conn.data.sms && (
        <div className="callout" style={{ marginBottom: 16 }}>
          Text messaging isn't connected yet, so messages are saved here but not delivered. Connect an SMS number in <Link to="/settings">Settings</Link>.
        </div>
      )}
      <div className="msg-grid card">
        <div className="msg-list">
          {list.loading && !list.data ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : list.data.length === 0 ? <Empty>No conversations yet.</Empty> :
            list.data.map((t) => (
              <button key={t.contact} className={`msg-item ${open === t.contact ? "on" : ""}`} onClick={() => select(t.contact)}>
                <div className="row" style={{ gap: 8 }}>
                  <strong className="ellipsis">{t.name}</strong>
                  <div className="spacer" />
                  <span className="muted small">{ago(t.last.at)}</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className={`ellipsis small ${t.unread ? "" : "muted"}`} style={{ fontWeight: t.unread ? 600 : 400 }}>
                    {t.last.direction === "out" ? "You: " : ""}{t.last.body}
                  </span>
                  <div className="spacer" />
                  {t.unread ? <span className="msg-dot">{t.unread}</span> : null}
                </div>
              </button>
            ))}
        </div>
        <div className="msg-pane">
          {composing ? <NewMessage onSent={(c) => { list.reload(); select(c); }} />
            : open ? <Conversation contact={open} onChange={list.reload} />
              : <Empty>Pick a conversation, or start a new message.</Empty>}
        </div>
      </div>
    </div>
  );
}

function Conversation({ contact, onChange }) {
  const t = useApi(`/api/inbox/threads/${contact}`);
  const end = useRef(null);
  useEffect(() => {
    const i = setInterval(() => t.reload(), 10000);
    return () => clearInterval(i);
  }, [t.reload]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [t.data?.messages?.length]);
  useEffect(() => { // the server marked it read: refresh the list and the sidebar count
    if (t.data) { onChange(); window.dispatchEvent(new Event("jobos-messages")); }
  }, [t.data?.contact, t.data?.messages?.length]);

  if (t.loading && !t.data) return <Loading />;
  if (t.error) return <ErrorBox error={t.error} />;
  const c = t.data;
  return (
    <>
      <div className="msg-head">
        <div>
          <div style={{ fontWeight: 600 }}>{c.name}</div>
          <div className="muted small">{c.phone}</div>
        </div>
        <div className="spacer" />
        {c.customer_id && <Link className="btn sm" to={`/customers/${c.customer_id}`}>Open customer</Link>}
        {!c.customer_id && c.lead_id && <Link className="btn sm" to="/inbox">Open lead</Link>}
      </div>
      <div className="msg-body">
        {c.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.direction}`}>
            <div>{m.body}</div>
            <div className="meta">
              {time(m.created_at)}{m.by ? ` · ${m.by}` : ""}
              {m.direction === "out" && m.status !== "sent" && <span title={m.error || ""}> · {m.status === "failed" ? "Failed" : "Not delivered"}</span>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <Composer to={c.phone} onSent={() => { t.reload(); onChange(); }} />
    </>
  );
}

function Composer({ to, onSent, autoFocus }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const m = await api.post("/api/inbox/send", { to, body: text });
      if (m.status === "failed") toast(`Not delivered: ${m.error}`, true);
      setText("");
      onSent(m);
    } catch (e) { toast(e, true); } finally { setBusy(false); }
  };
  return (
    <div className="msg-compose">
      <textarea rows={2} value={text} autoFocus={autoFocus} placeholder="Write a text…" maxLength={1600}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
      <Button variant="primary" disabled={busy || !text.trim() || !to} onClick={send}>{busy ? "Sending…" : "Send"}</Button>
    </div>
  );
}

function NewMessage({ onSent }) {
  const customers = useApi("/api/customers");
  const [q, setQ] = useState("");
  const [to, setTo] = useState(null);
  const matches = (customers.data || []).filter((c) => c.phone && `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  const typedNumber = q.replace(/\D/g, "").length >= 10 ? q : null;
  return (
    <>
      <div className="msg-head" style={{ display: "block" }}>
        {to ? (
          <div className="row" style={{ gap: 8 }}>
            <span className="muted">To</span><Pill tone="blue">{to.name}</Pill><span className="muted small">{to.phone}</span>
            <div className="spacer" /><Button size="sm" variant="ghost" onClick={() => setTo(null)}>Change</Button>
          </div>
        ) : (
          <input autoFocus placeholder="Customer name or phone number" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
      </div>
      {!to ? (
        <div className="msg-body">
          {typedNumber && <button className="msg-item" onClick={() => setTo({ name: typedNumber, phone: typedNumber })}>Text {typedNumber}</button>}
          {matches.map((c) => (
            <button key={c.id} className="msg-item" onClick={() => setTo({ name: c.name, phone: c.phone })}>
              <strong>{c.name}</strong> <span className="muted small">{c.phone}</span>
            </button>
          ))}
        </div>
      ) : <div className="msg-body" />}
      {to && <Composer to={to.phone} autoFocus onSent={(m) => onSent(m.contact)} />}
    </>
  );
}

const CSS = `
.msg-grid { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 190px); min-height: 460px; overflow: hidden; }
.msg-list { border-right: 1px solid var(--line); overflow-y: auto; }
.msg-item { display: block; width: 100%; text-align: left; background: none; border: 0; border-bottom: 1px solid var(--line); padding: 12px 14px; cursor: pointer; font: inherit; color: inherit; }
.msg-item:hover { background: var(--surface-2); }
.msg-item.on { background: var(--brand-soft); }
.msg-dot { background: var(--brand); color: var(--brand-ink); border-radius: 999px; font-size: 11px; padding: 0 7px; line-height: 18px; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.msg-pane { display: flex; flex-direction: column; min-width: 0; }
.msg-pane > .empty { margin: auto; }
.msg-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
.msg-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; background: var(--bg); }
.bubble { max-width: 70%; padding: 8px 12px; border-radius: 14px; white-space: pre-wrap; }
.bubble.in { align-self: flex-start; background: var(--surface); border: 1px solid var(--line); border-bottom-left-radius: 4px; }
.bubble.out { align-self: flex-end; background: var(--brand); color: var(--brand-ink); border-bottom-right-radius: 4px; }
.bubble .meta { font-size: 11px; opacity: .7; margin-top: 2px; }
.msg-compose { display: flex; gap: 8px; align-items: flex-end; padding: 12px; border-top: 1px solid var(--line); }
.msg-compose textarea { resize: none; }
@media (max-width: 760px) { .msg-grid { grid-template-columns: 1fr; height: auto; } .msg-list { max-height: 260px; border-right: 0; border-bottom: 1px solid var(--line); } .msg-pane { min-height: 420px; } }
`;

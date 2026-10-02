import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Card, Empty, ErrorBox, Field, Loading, Modal, Money, PageHead, Pill, useToast } from "../components/ui";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";

export default function Customers() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error } = useApi(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  const rows = data || [];
  const members = rows.filter((c) => c.member).length;
  const owed = rows.reduce((s, c) => s + (c.balance_cents || 0), 0);

  return (
    <div className="page">
      <style>{`
        .cu-search { position: relative; width: min(360px, 100%); }
        .cu-search input { padding-left: 32px; height: 36px; }
        .cu-search span { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); display: flex; color: var(--ink-3); pointer-events: none; }
        .cu-table td { white-space: nowrap; }
        .cu-wrap { overflow-x: auto; }
      `}</style>

      <PageHead title="Customers" sub="Homes and businesses you work for, with their sites, equipment and history.">
        <Button variant="primary" onClick={() => setAdding(true)}>+ New customer</Button>
      </PageHead>

      <div className="row wrap" style={{ marginBottom: 14 }}>
        <div className="cu-search">
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" aria-label="Search customers" />
        </div>
        <div className="spacer" />
        {data && (
          <div className="muted small">
            {rows.length} customer{rows.length === 1 ? "" : "s"} · {members} on a plan{owed ? <> · <Money cents={owed} /> owed</> : null}
          </div>
        )}
      </div>

      <ErrorBox error={error} />
      <Card pad={false}>
        {loading && !data ? <Loading /> : rows.length === 0 ? (
          <Empty>
            {query ? <>No customers match “{query}”.</> : "No customers yet. Add your first one, or convert a lead from the Inbox."}
            <div style={{ marginTop: 12 }}><Button variant="primary" onClick={() => setAdding(true)}>+ New customer</Button></div>
          </Empty>
        ) : (
          <div className="cu-wrap" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
            <table className="t cu-table">
              <thead>
                <tr><th>Name</th><th>Type</th><th>Phone</th><th>Plan</th><th className="r">Balance</th></tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="click" onClick={() => nav(`/customers/${c.id}`)}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar name={c.name} color={c.type === "business" ? "#475569" : "var(--brand)"} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          {c.email && <div className="muted small">{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td><Pill tone={c.type === "business" ? "blue" : "grey"}>{c.type === "business" ? "Business" : "Residential"}</Pill></td>
                    <td className="num">{c.phone || <span className="muted">–</span>}</td>
                    <td>{c.member ? <Pill tone="green">★ Member</Pill> : <span className="muted">–</span>}</td>
                    <td className="r" style={{ fontWeight: c.balance_cents ? 600 : 400, color: c.balance_cents ? "var(--ink)" : "var(--ink-3)" }}>
                      <Money cents={c.balance_cents || 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && <NewCustomerModal onClose={() => setAdding(false)} onCreated={(c) => nav(`/customers/${c.id}`)} />}
    </div>
  );
}

function NewCustomerModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", type: "residential", phone: "", email: "", address: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) return setErr(new Error("Name is required"));
    setSaving(true); setErr(null);
    try {
      const body = { name: form.name.trim(), type: form.type, phone: form.phone.trim() || null, email: form.email.trim() || null };
      if (form.address.trim()) body.site = { address: form.address.trim(), city: form.city.trim() };
      const c = await api.post("/api/customers", body);
      if (c.possible_duplicate) toast("Heads up: another customer already has this phone or email. Check for a duplicate.", true);
      else toast(`${c.name} added`);
      onCreated(c);
    } catch (e2) {
      setErr(e2);
      setSaving(false);
    }
  };

  return (
    <Modal title="New customer" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving} onClick={submit}>{saving ? "Saving…" : "Add customer"}</Button></>}>
      <form className="col" onSubmit={submit}>
        <div className="grid g2">
          <Field label="Name"><input value={form.name} onChange={set("name")} placeholder="Full name or business" autoFocus /></Field>
          <Field label="Type">
            <select value={form.type} onChange={set("type")}>
              <option value="residential">Residential</option>
              <option value="business">Business</option>
            </select>
          </Field>
        </div>
        <div className="grid g2">
          <Field label="Phone"><input type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 010-0000" /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={set("email")} placeholder="name@example.com" /></Field>
        </div>
        <Field label="Service address"><input value={form.address} onChange={set("address")} placeholder="Street address" /></Field>
        <Field label="City"><input value={form.city} onChange={set("city")} placeholder="e.g. Denver, CO" /></Field>
        <ErrorBox error={err} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

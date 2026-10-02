import { useState } from "react";
import { Avatar, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHead, Pill, Tile, useToast } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { money, toCents } from "../lib/format";
import { useApi } from "../lib/useApi";

const ROLE = { owner: ["Owner", "blue"], office: ["Office", "amber"], tech: ["Technician", "green"] };
const ROLE_ORDER = { owner: 0, office: 1, tech: 2 };
const SKILLS = [["hvac", "HVAC"], ["plumbing", "Plumbing"], ["electrical", "Electrical"]];
const SKILL_LABEL = Object.fromEntries(SKILLS);
const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#db2777", "#ca8a04", "#475569"];

function payText(pay) {
  if (!pay) return "–";
  if (pay.type === "hourly") return `${money(pay.hourly_cents)}/h`;
  if (pay.type === "salary") return pay.salary_cents ? `${money(pay.salary_cents)}/yr` : "Salary";
  return pay.type;
}

export default function Team() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const team = useApi("/api/team");
  const [adding, setAdding] = useState(false);

  const members = [...(team.data || [])].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.name.localeCompare(b.name));
  const techs = members.filter((m) => m.role === "tech");
  const skills = [...new Set(techs.flatMap((t) => t.skills || []))];

  return (
    <div className="page">
      <style>{`
        .tm-wrap { overflow-x: auto; }
        .tm-wrap td { white-space: nowrap; }
        .tm-off td { opacity: .55; }
        .tm-swatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
        .tm-swatch.on { border-color: var(--ink); box-shadow: 0 0 0 2px var(--surface) inset; }
      `}</style>

      <PageHead title="Team" sub="Who's on the crew and what they can work on.">
        {isOwner && <Button variant="primary" onClick={() => setAdding(true)}>+ Add member</Button>}
      </PageHead>

      <ErrorBox error={team.error} />

      {team.data && (
        <div className="grid g3" style={{ marginBottom: 16 }}>
          <Tile k="Team members" v={members.filter((m) => m.active !== false).length} s={`${techs.length} technician${techs.length === 1 ? "" : "s"} in the field`} />
          <Tile k="Skills covered" v={skills.length} s={skills.map((s) => SKILL_LABEL[s] || s).join(", ") || "None yet"} />
          <Tile k="Office & owners" v={members.filter((m) => m.role !== "tech").length} s="Booking, billing and running the business" />
        </div>
      )}

      <Card pad={false}>
        {team.loading && !team.data ? <Loading /> : members.length === 0 ? (
          <Empty>No team members yet.{isOwner && <div style={{ marginTop: 10 }}><Button variant="primary" onClick={() => setAdding(true)}>+ Add member</Button></div>}</Empty>
        ) : (
          <div className="tm-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Name</th><th>Role</th><th>Skills</th><th>Phone</th>
                  {isOwner && <th>Pay</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const [role, tone] = ROLE[m.role] || [m.role, "grey"];
                  return (
                    <tr key={m.id} className={m.active === false ? "tm-off" : ""}>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <Avatar name={m.name} color={m.color || "#64748b"} size={32} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.name}{m.id === user?.id && <span className="muted small" style={{ fontWeight: 400 }}> (you)</span>}</div>
                            <div className="muted small">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><Pill tone={tone}>{role}</Pill>{m.active === false && <span className="muted small"> · Inactive</span>}</td>
                      <td>
                        {(m.skills || []).length ? (
                          <div className="row" style={{ gap: 4 }}>{m.skills.map((s) => <Pill key={s} tone="grey">{SKILL_LABEL[s] || s}</Pill>)}</div>
                        ) : <span className="muted">–</span>}
                      </td>
                      <td className="num">{m.phone ? <a href={`tel:${m.phone}`}>{m.phone}</a> : <span className="muted">–</span>}</td>
                      {isOwner && <td className="num">{payText(m.pay)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && <AddMemberModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); team.reload(); }} />}
    </div>
  );
}

function AddMemberModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "tech", skills: [], password: "", rate: "", color: COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleSkill = (s) => setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return setErr(new Error("Name and email are required"));
    if (form.password && form.password.length < 6) return setErr(new Error("Password should be at least 6 characters"));
    setSaving(true); setErr(null);
    try {
      const tech = form.role === "tech";
      const body = {
        name: form.name.trim(), email: form.email.trim(), role: form.role, phone: form.phone.trim() || undefined,
        skills: tech ? form.skills : [], password: form.password || undefined,
        color: tech ? form.color : undefined,
        pay: tech && form.rate ? { type: "hourly", hourly_cents: toCents(form.rate) } : { type: "salary" },
      };
      const u = await api.post("/api/team", body);
      toast(`${u.name} added to the team`);
      onSaved(u);
    } catch (e2) {
      setErr(e2);
      setSaving(false);
    }
  };

  return (
    <Modal title="Add team member" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving} onClick={submit}>{saving ? "Adding…" : "Add member"}</Button></>}>
      <form className="col" onSubmit={submit}>
        <div className="grid g2">
          <Field label="Full name"><input value={form.name} onChange={set("name")} placeholder="Alex Rivera" autoFocus /></Field>
          <Field label="Role">
            <select value={form.role} onChange={set("role")}>
              <option value="tech">Technician</option>
              <option value="office">Office</option>
              <option value="owner">Owner</option>
            </select>
          </Field>
        </div>
        <div className="grid g2">
          <Field label="Email (sign-in)"><input type="email" value={form.email} onChange={set("email")} placeholder="alex@summit.demo" /></Field>
          <Field label="Phone"><input type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 010-0000" /></Field>
        </div>
        {form.role === "tech" && (
          <>
            <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}>
              Skills
              <div className="row wrap" style={{ gap: 14 }}>
                {SKILLS.map(([k, l]) => (
                  <label key={k} className="check" style={{ fontWeight: 400, color: "var(--ink)", fontSize: 14 }}>
                    <input type="checkbox" checked={form.skills.includes(k)} onChange={() => toggleSkill(k)} /> {l}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid g2">
              <Field label="Hourly rate"><input inputMode="decimal" value={form.rate} onChange={set("rate")} placeholder="35.00" /></Field>
              <div className="field" style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}>
                Calendar colour
                <div className="row" style={{ gap: 6, height: 34 }}>
                  {COLORS.map((c) => (
                    <button key={c} type="button" aria-label={`Colour ${c}`} className={`tm-swatch ${form.color === c ? "on" : ""}`} style={{ background: c }}
                      onClick={() => setForm((f) => ({ ...f, color: c }))} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        <Field label="Temporary password"><input type="text" value={form.password} onChange={set("password")} placeholder="Leave blank to generate one" autoComplete="new-password" /></Field>
        <ErrorBox error={err} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

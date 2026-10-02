import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, ErrorBox, Field, Loading, PageHead, Pill, useToast } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { money } from "../lib/format";
import { useApi } from "../lib/useApi";

const fromOrg = (o = {}) => ({
  name: o.name || "", phone: o.phone || "", email: o.email || "",
  color: o.brand?.color || "#0b5cff", short: o.brand?.short || "",
  tax: o.tax_rate_bp != null ? String(o.tax_rate_bp / 100) : "",
  deposit: o.deposit_percent != null ? String(o.deposit_percent) : "",
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function BusinessForm({ org, isOwner, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => fromOrg(org));
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(fromOrg(org)); }, [org]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const dirty = !same(f, fromOrg(org));

  const tax = Number(f.tax || 0);
  const deposit = Number(f.deposit || 0);
  const invalid = !f.name.trim() || !(tax >= 0 && tax <= 100) || !(deposit >= 0 && deposit <= 100);

  const save = async () => {
    setBusy(true);
    try {
      await api.patch("/api/settings", { org: {
        name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(),
        brand: { color: f.color, short: f.short.trim().slice(0, 2) },
        tax_rate_bp: Math.round(tax * 100), deposit_percent: Math.round(deposit),
      } });
      await onSaved();
      toast("Saved");
    } catch (e) { toast(e, true); } finally { setBusy(false); }
  };

  const field = (label, k, props = {}) => <Field label={label}><input value={f[k]} onChange={set(k)} disabled={!isOwner} {...props} /></Field>;
  return (
    <div className="col" style={{ gap: 14 }}>
      {!isOwner && <div className="err-box" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>Read-only: only the owner can change business settings.</div>}
      <div className="grid g2" style={{ alignItems: "start" }}>
        <Card title="Business profile" actions={<span className="muted small">Shown on quotes, invoices and texts</span>}>
          <div className="col" style={{ gap: 12 }}>
            {field("Business name", "name")}
            <div className="grid g2">
              {field("Phone", "phone")}
              {field("Email", "email", { type: "email" })}
            </div>
            <div className="grid g2">
              <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}>Brand colour
                <div className="row" style={{ gap: 8 }}>
                  <input type="color" value={f.color} onChange={set("color")} disabled={!isOwner} style={{ width: 44, height: 34, padding: 2 }} />
                  <input value={f.color} onChange={set("color")} disabled={!isOwner} aria-label="Brand colour hex" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
                </div>
              </div>
              {field("Logo letters", "short", { maxLength: 2, placeholder: "AB" })}
            </div>
            <div className="row" style={{ background: "var(--surface-2)", borderRadius: 10, padding: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: f.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>{f.short || f.name[0]}</div>
              <div><div style={{ fontWeight: 600 }}>{f.name || "Your business"}</div><div className="muted small">Preview of your sidebar and documents</div></div>
              <div className="spacer" />
              <span className="btn sm" style={{ background: f.color, borderColor: f.color, color: "#fff", pointerEvents: "none" }}>Approve quote</span>
            </div>
          </div>
        </Card>

        <div className="col" style={{ gap: 14 }}>
          <Card title="Tax & deposit" actions={<span className="muted small">Used on every new quote and invoice</span>}>
            <div className="col" style={{ gap: 12 }}>
              <div className="grid g2">
                {field("Sales tax rate (%)", "tax", { inputMode: "decimal", placeholder: "8.25" })}
                {field("Deposit on approval (%)", "deposit", { inputMode: "numeric", placeholder: "0" })}
              </div>
              <div className="muted small">
                {tax > 0 ? `A ${money(100000)} job is quoted at ${money(100000 + Math.round((100000 * tax) / 100))} with tax` : "No tax added to quotes"}
                {deposit > 0 ? ` · ${deposit}% deposit is collected when the customer approves.` : " · No deposit on approval."}
              </div>
            </div>
          </Card>
          <div className="callout">
            <b>Need more than this?</b> Certificates, contracts, roles, country tax packs and integrations are not in this template.
            See <Link to="/build-next">Build next</Link> for ready-to-paste prompts to add them on Emergent.
          </div>
        </div>
      </div>
      {isOwner && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          {dirty && <Button onClick={() => setF(fromOrg(org))}>Reset</Button>}
          <Button variant="primary" disabled={!dirty || busy || invalid} onClick={save}>{busy ? "Saving…" : "Save changes"}</Button>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { user, refresh } = useAuth();
  const { data, error, reload } = useApi("/api/settings");
  const isOwner = user?.role === "owner";
  const onSaved = async () => { await Promise.all([reload(), refresh()]); };

  return (
    <div className="page">
      <PageHead title="Make it yours" sub="Your business details, brand, tax and deposit">
        {!isOwner && <Pill tone="amber">View only · owner can edit</Pill>}
      </PageHead>
      {error ? <ErrorBox error={error} /> : !data ? <Loading /> : <BusinessForm org={data.org} isOwner={isOwner} onSaved={onSaved} />}
    </div>
  );
}

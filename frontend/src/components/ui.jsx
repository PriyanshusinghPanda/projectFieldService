// Shared building blocks. Pages compose these; keep page-specific UI inside the page file.
import { createContext, useCallback, useContext, useState } from "react";
import { money, statusLabel, statusTone } from "../lib/format";

export const Money = ({ cents, compact }) => <span className="num">{money(cents, { compact })}</span>;

export const Pill = ({ tone = "grey", children }) => <span className={`pill ${tone}`}>{children}</span>;
export const Status = ({ s }) => <Pill tone={statusTone(s)}>{statusLabel(s)}</Pill>;

export function Button({ variant, size, block, children, ...p }) {
  const cls = ["btn", variant, size, block && "block"].filter(Boolean).join(" ");
  return <button className={cls} {...p}>{children}</button>;
}

export function Card({ title, actions, children, pad = true, style }) {
  return (
    <div className="card" style={style}>
      {(title || actions) && <div className="card-head"><h2>{title}</h2><div className="spacer" />{actions}</div>}
      <div className={pad ? "card-body" : ""}>{children}</div>
    </div>
  );
}

export const Tile = ({ k, v, s, onClick }) => (
  <div className="tile" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
    <div className="k">{k}</div><div className="v">{v}</div>{s && <div className="s">{s}</div>}
  </div>
);

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div>
      <div className="spacer" />
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return <label className="field">{label}{children}</label>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(([k, label]) => <button key={k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{label}</button>)}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="mh"><h2>{title}</h2><div className="spacer" /><button className="btn ghost sm" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}

export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const Loading = () => <div className="empty">Loading…</div>;
export const ErrorBox = ({ error }) => error ? (
  <div className="err-box">{error.message}{error.errors?.length ? <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>{error.errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}</div>
) : null;

// Toasts: const toast = useToast(); toast("Saved"); toast(err, true)
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const show = useCallback((msg, err = false) => {
    setT({ msg: typeof msg === "string" ? msg : msg?.message || String(msg), err });
    setTimeout(() => setT(null), 3200);
  }, []);
  return <ToastCtx.Provider value={show}>{children}{t && <div className={`toast ${t.err ? "err" : ""}`}>{t.msg}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

export const Avatar = ({ name = "", color = "var(--brand)", size = 28 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "inline-grid", placeItems: "center",
    fontSize: size * 0.42, fontWeight: 650, flex: "none" }}>{name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
);

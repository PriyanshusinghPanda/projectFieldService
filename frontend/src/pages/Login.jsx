import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, ErrorBox, Field } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);

  const go = async (res) => {
    await signIn(res.token);
    nav(params.get("next") || (res.user.role === "tech" ? "/tech" : "/"), { replace: true });
  };
  const submit = async (e) => {
    e.preventDefault();
    try { await go(await api.post("/api/auth/login", form)); } catch (err) { setError(err); }
  };
  const demo = async (role) => {
    try { await go(await api.post(`/api/auth/demo/${role}`)); } catch (err) { setError(err); }
  };

  return (
    <div style={{ minHeight: "100%", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="card pad" style={{ width: "min(400px, 100%)" }}>
        <h1>Sign in to Job OS</h1>
        <p className="muted" style={{ marginTop: 6 }}>Field-service template · demo business: Summit Heating &amp; Plumbing</p>
        <form className="col" style={{ marginTop: 16 }} onSubmit={submit}>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
          <ErrorBox error={error} />
          <Button variant="primary" type="submit">Sign in</Button>
        </form>
        <div className="col" style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <div className="muted small">Demo: one click to try each role</div>
          <div className="row wrap">
            <Button onClick={() => demo("owner")}>Owner</Button>
            <Button onClick={() => demo("office")}>Office</Button>
            <Button onClick={() => demo("tech")}>Technician</Button>
          </div>
          <div className="muted small">Or sign in with owner@summit.demo / demo1234</div>
        </div>
      </div>
    </div>
  );
}

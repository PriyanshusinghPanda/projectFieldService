import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/useApi";
import { BarChart3, Briefcase, CalendarDays, FileText, Home, Inbox, Receipt, Repeat, Settings2, Smartphone, Sparkles, Users, UsersRound } from "lucide-react";
import { Avatar } from "./ui";

const NAV = [
  ["Run the day", [["/", "Home", Home], ["/inbox", "Inbox", Inbox], ["/schedule", "Schedule", CalendarDays], ["/jobs", "Jobs", Briefcase]]],
  ["Win & get paid", [["/quotes", "Quotes", FileText], ["/invoices", "Invoices", Receipt], ["/plans", "Plans", Repeat]]],
  ["Records", [["/customers", "Customers", Users], ["/reports", "Reports", BarChart3], ["/team", "Team", UsersRound]]],
  ["Make it yours", [["/settings", "Settings", Settings2], ["/build-next", "Build next", Sparkles]]],
];

export default function Layout() {
  const { user, org, signOut } = useAuth();
  const nav = useNavigate();
  const leads = useApi("/api/leads?status=new");
  useEffect(() => {
    if (org?.brand?.color) document.documentElement.style.setProperty("--brand", org.brand.color);
  }, [org]);
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="logo" style={org?.brand?.logo ? { background: "#fff", boxShadow: "0 0 0 1px var(--line)", overflow: "hidden" } : undefined}>{org?.brand?.logo ? <img src={org.brand.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : (org?.brand?.short || org?.name?.[0])}</div>
          <div style={{ minWidth: 0 }}><div className="org">{org?.name}</div><div className="eyebrow" style={{ marginTop: 2 }}>Job OS</div></div>
        </div>
        {NAV.map(([group, items]) => (
          <div key={group}>
            <div className="group">{group}</div>
            {items.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav ${isActive ? "active" : ""}`}>
                <Icon size={16} strokeWidth={1.75} />
                {label}
                {to === "/inbox" && leads.data?.length ? <span className="count">{leads.data.length}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="sep" />
        <a className="nav" href="/tech" target="_blank" rel="noreferrer"><Smartphone size={16} strokeWidth={1.75} />Technician app ↗</a>
        <div className="spacer" />
        <div className="row" style={{ padding: "10px 8px" }}>
          <Avatar name={user?.name} />
          <div style={{ minWidth: 0 }}>
            <div className="small" style={{ fontWeight: 600 }}>{user?.name}</div>
            <div className="muted small" style={{ textTransform: "capitalize" }}>{user?.role}</div>
          </div>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={() => { signOut(); nav("/login"); }}>Sign out</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}

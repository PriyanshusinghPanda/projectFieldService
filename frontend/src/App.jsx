import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Loading } from "./components/ui";
import { useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Inbox from "./pages/Inbox";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Quotes from "./pages/Quotes";
import QuoteBuilder from "./pages/QuoteBuilder";
import Schedule from "./pages/Schedule";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Plans from "./pages/Plans";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import BuildNext from "./pages/BuildNext";
import Messages from "./pages/Messages";
import AIVisibility from "./pages/AIVisibility";
import TechToday from "./pages/tech/TechToday";
import TechJob from "./pages/tech/TechJob";
import QuoteApprove from "./pages/public/QuoteApprove";
import PayInvoice from "./pages/public/PayInvoice";
import Portal from "./pages/public/Portal";
import Track from "./pages/public/Track";
import Booking from "./pages/public/Booking";

function Office({ children }) {
  const { loading, user } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "tech") return <Navigate to="/tech" replace />;
  return children;
}

function TechOnly({ children }) {
  const { loading, user } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login?next=/tech" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* customer-facing links: no login */}
      <Route path="/q/:token" element={<QuoteApprove />} />
      <Route path="/pay/:token" element={<PayInvoice />} />
      <Route path="/portal/:token" element={<Portal />} />
      <Route path="/track/:token" element={<Track />} />
      <Route path="/book/:slug" element={<Booking />} />
      {/* technician app (phone) */}
      <Route path="/tech" element={<TechOnly><TechToday /></TechOnly>} />
      <Route path="/tech/job/:id" element={<TechOnly><TechJob /></TechOnly>} />
      {/* office web app */}
      <Route element={<Office><Layout /></Office>}>
        <Route path="/" element={<Home />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/ai-visibility" element={<AIVisibility />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/quotes/new" element={<QuoteBuilder />} />
        <Route path="/quotes/:id" element={<QuoteBuilder />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/team" element={<Team />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/build-next" element={<BuildNext />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

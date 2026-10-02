// Formatting helpers. Money from the API is always integer minor units (cents).
let CURRENCY = "USD";
const LOCALE = { USD: "en-US", CAD: "en-CA", GBP: "en-GB", INR: "en-IN", AUD: "en-AU", EUR: "de-DE" };
export const setCurrency = (c) => { CURRENCY = c || "USD"; };

export function money(cents, { currency = CURRENCY, compact = false } = {}) {
  if (cents == null) return "–";
  const v = cents / 100;
  if (compact && Math.abs(v) >= 1000) {
    return new Intl.NumberFormat(LOCALE[currency] || "en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v);
  }
  return new Intl.NumberFormat(LOCALE[currency] || "en-US", { style: "currency", currency }).format(v);
}

export const toCents = (str) => Math.round(parseFloat(String(str).replace(/[^0-9.-]/g, "")) * 100) || 0;

export function time(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
export function day(iso) {
  if (!iso) return "";
  return new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}
export function ago(iso) {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const localISODate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const STATUS = {
  new: ["Unscheduled", "grey"], scheduled: ["Scheduled", "blue"], en_route: ["On the way", "amber"], on_site: ["On site", "amber"],
  in_progress: ["Working", "amber"], paused: ["Paused", "grey"], completed: ["Done", "green"], invoiced: ["Invoiced", "blue"],
  paid: ["Paid", "green"], non_complete: ["Not completed", "red"], cancelled: ["Cancelled", "grey"],
  draft: ["Draft", "grey"], sent: ["Sent", "blue"], viewed: ["Viewed", "amber"], approved: ["Approved", "green"], declined: ["Declined", "red"],
  open: ["Open", "blue"], partially_paid: ["Part paid", "amber"], void: ["Void", "grey"],
  won: ["Won", "green"], contacted: ["Contacted", "blue"], quoted: ["Quoted", "blue"], lost: ["Lost", "grey"],
  active: ["Active", "green"], logged: ["Logged", "grey"],
};
export const statusLabel = (s) => (STATUS[s] || [s?.replace(/_/g, " ") || ""])[0];
export const statusTone = (s) => (STATUS[s] || [null, "grey"])[1];

export const CHANNEL = { missed_call: "Missed call", web_booking: "Website booking", google_lsa: "Google Local Services", sms: "SMS",
  angi: "Angi", phone: "Phone", whatsapp: "WhatsApp", email: "Email" };

// API client. Office screens call api.get/post/patch. The tech app uses api.techWrite, which works offline:
// each write carries an Idempotency-Key; if the phone has no signal the write is queued and replayed later,
// and the server ignores a replay it has already applied.
const BASE = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL || "";
const QUEUE_KEY = "jobos.queue";

export function getToken() {
  try { return localStorage.getItem("jobos.token"); } catch { return null; }
}
export function setToken(t) {
  try { t ? localStorage.setItem("jobos.token", t) : localStorage.removeItem("jobos.token"); } catch { /* storage blocked */ }
}

export class ApiError extends Error {
  constructor(status, detail) {
    const msg = typeof detail === "string" ? detail : detail?.message || "Something went wrong";
    super(msg);
    this.status = status;
    this.errors = detail?.errors || [];
  }
}

async function request(method, path, body, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 401 && !path.startsWith("/api/auth") && !path.startsWith("/api/public")) {
    setToken(null);
    if (!location.pathname.startsWith("/login")) location.href = "/login";
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.detail ?? data);
  return data;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b = {}) => request("POST", p, b),
  patch: (p, b = {}) => request("PATCH", p, b),
  techWrite,
  flushQueue,
  queueSize,
};

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function writeQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* ignore */ }
  window.dispatchEvent(new Event("jobos-queue"));
}
export function queueSize() { return readQueue().length; }

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

async function techWrite(path, body = {}) {
  const key = uid();
  try {
    return await request("POST", path, body, { "Idempotency-Key": key });
  } catch (e) {
    if (e instanceof ApiError) throw e; // the server answered: a real error, not a lost signal
    writeQueue([...readQueue(), { path, body, key, at: Date.now() }]);
    return { queued: true };
  }
}

export async function flushQueue() {
  const q = readQueue();
  const left = [];
  for (const item of q) {
    try {
      await request("POST", item.path, item.body, { "Idempotency-Key": item.key });
    } catch (e) {
      if (!(e instanceof ApiError)) left.push(item); // still offline: keep it
    }
  }
  writeQueue(left);
  return q.length - left.length;
}

if (typeof window !== "undefined") window.addEventListener("online", () => flushQueue());

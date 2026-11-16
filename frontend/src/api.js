// Tiny fetch wrapper. Everything is same-origin (/api) - in dev Vite proxies it to Flask.
export async function api(path, { method = "GET", body, raw = false } = {}) {
  const opts = { method, credentials: "same-origin", headers: { "X-DS-Client": "web" } };
  if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch(`/api${path}`, opts); } catch { return { success: false, message: "Cannot reach the server. Check your internet connection.", status: 0 }; }
  if (raw) return res;
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { success: res.ok && data.success !== false, status: res.status, ...data };
}
export const get = (p) => api(p);
export const post = (p, body = {}) => api(p, { method: "POST", body });
export const put = (p, body = {}) => api(p, { method: "PUT", body });
export const del = (p) => api(p, { method: "DELETE" });

// ---------- date formatting: everything shown in Indian Standard Time, regardless of device time-zone ----------
const IST = "Asia/Kolkata";
export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—");
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric" }) : "—");
export const fmtShortDay = (iso) => new Date(iso + "T00:00:00+05:30").toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" });
export function timeAgo(iso) {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
export function fmtBytes(n) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i ? 2 : 1)} ${u[i]}`;
}

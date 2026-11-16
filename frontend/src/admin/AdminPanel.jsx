import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { del, fmtBytes, fmtDateTime, fmtShortDay, get, post, put, timeAgo } from "../api.js";
import { Confirm, Field, Modal, Spinner, useToast } from "../components/ui.jsx";
import { useRouter } from "../router.jsx";
import { CATEGORIES, CONSTRUCTION_GRADES, FINISHES, FLOORS, ITEMS, ITEM_BY_KEY, typeLabel } from "../scene/catalog.js";
import { inr } from "../scene/sceneUtils.js";
import { AreaChart, Count, Donut, Gauge, RankList, Spot } from "./charts.jsx";

const SceneViewer = lazy(() => import("../pages/Viewer.jsx").then((m) => ({ default: m.SceneViewer })));

const EVENT_META = {
  signup: ["🆕", "Account created", "ok"], email_verified: ["✅", "Email verified", "ok"], login: ["🔓", "Login", ""], login_failed: ["⚠️", "Failed login", "warn"],
  account_locked: ["⛔", "Account locked", "bad"], logout: ["🚪", "Logout", ""], password_changed: ["🔑", "Password changed", "warn"], password_reset: ["♻️", "Password reset", "warn"],
  email_change: ["✉️", "Email changed", "warn"], account_deleted: ["🗑️", "Account deleted", "bad"], "2fa_enabled": ["🛡️", "2FA enabled", "ok"], "2fa_disabled": ["🔕", "2FA disabled", "warn"],
  project_created: ["🏗️", "Project created", ""], project_deleted: ["🧹", "Project deleted", ""], admin_login: ["⚡", "Admin sign-in", "ok"], admin_unlock: ["🔐", "Admin panel opened", "ok"],
  admin_action: ["🛠️", "Admin action", "warn"], admin_settings: ["⚙️", "Admin settings", "warn"], backup: ["💾", "Backup", "ok"], restore: ["📥", "Restore", "warn"],
};
const FILTERS = [["all", "All", "all"], ["created", "Accounts created", "signup"], ["deleted", "Accounts deleted", "account_deleted"], ["pw", "Password changes", "password_changed,password_reset"], ["mail", "Email changes", "email_change"], ["login", "Logins", "login,login_failed,account_locked"], ["admin", "Admin", "admin_login,admin_unlock,admin_action,admin_settings,backup,restore"], ["proj", "Projects", "project_created,project_deleted"]];
const NAV = [["overview", "📊", "Overview"], ["users", "👥", "Users"], ["items", "🛋️", "Item usage"], ["activity", "📜", "Activity log"], ["storage", "🗄️", "Storage"], ["backups", "💾", "Backups"], ["prices", "💰", "Prices"], ["settings", "⚙️", "Settings"], ["danger", "☠️", "Danger zone"]];
const catColor = ["#b8ff3d", "#ff3ea5", "#ffb020", "#22e1ff", "#a78bfa", "#38f9a0", "#ff7a59", "#7aa2ff"];

function useApi(path, deps = []) {
  const { go } = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    const r = await get(path);
    if (r.admin_expired) { go("/admin/unlock"); return; }
    setData(r); setLoading(false);
  }, [path, go]);
  useEffect(() => { reload(); }, [reload, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading, reload };
}
const Loading = () => <Spinner label="Fetching live data…" />;
const itemLabel = (k) => ITEM_BY_KEY[k]?.name || k;
const itemType = (k) => typeLabel(ITEM_BY_KEY[k]?.type || k.split(".")[0]);

// ===================================================================== OVERVIEW
function Overview({ go }) {
  const { data, loading, reload } = useApi("/admin/overview");
  const [metric, setMetric] = useState("signups");
  const items = useApi("/admin/items");
  if (loading || !data) return <Loading />;
  const t = data.totals, s = data.series, f = data.forecast[metric];
  const colors = { signups: "#b8ff3d", logins: "#22e1ff", projects: "#ff3ea5" };
  const kp = [["👥", "Total users", t.users, ""], ["✅", "Verified", t.verified, "c4"], ["🏗️", "Projects", t.projects, "c2"], ["🛋️", "Items placed", t.items, "c3"], ["🏠", "Rooms built", t.rooms, ""], ["🆕", "New (7 days)", t.new_7d, "c4"], ["⚡", "Active (24 h)", t.active_24h, "c2"], ["🛡️", "2FA enabled", t.with_2fa, "c3"], ["⛔", "Blocked", t.blocked, "c2"], ["⏳", "Locked now", t.locked_now, "c3"]];
  const used = Object.fromEntries((items.data?.items || []).map((i) => [i.key, i]));
  const unused = ITEMS.filter((i) => !used[i.key]).slice(0, 6);
  const rt = data.room_types.map((r, i) => ({ label: r.type, value: r.count, color: catColor[i % catColor.length] }));
  const sb = data.storage_brief;
  return (
    <>
      <div className="ticker"><span>{[...Array(2)].map((_, k) => <span key={k}>{[`USERS <b>${t.users}</b>`, `PROJECTS <b>${t.projects}</b>`, `ITEMS PLACED <b>${t.items}</b>`, `ACTIVE 24H <b>${t.active_24h}</b>`, `FORECAST NEXT 7D SIGNUPS <b>${data.forecast.signups.next_total}</b>`, `TREND <b>${data.forecast.signups.direction.toUpperCase()}</b>`].map((x, i) => <span key={i} dangerouslySetInnerHTML={{ __html: x }} />)}</span>)}</span></div>
      <div className="kpis">{kp.map(([ic, l, v, c], i) => <Spot key={l} className={`kpi ${c}`} style={{ animation: `slideIn .5s ${i * 50}ms both` }}><span className="ic">{ic}</span><div className="v"><Count value={v} /></div><div className="l">{l}</div></Spot>)}</div>
      <div className="grid-wide">
        <Spot>
          <h3><span>Activity · last 30 days (IST)</span><div className="atabs">{[["signups", "Signups"], ["logins", "Logins"], ["projects", "Projects"]].map(([k, l]) => <button key={k} className={metric === k ? "on" : ""} onClick={() => setMetric(k)}>{l}</button>)}</div></h3>
          <AreaChart key={metric} labels={s.map((x) => x.date)} fmtLabel={fmtShortDay} series={[{ label: metric, color: colors[metric], data: s.map((x) => x[metric]) }]} forecast={f} />
          <div className="legend" style={{ marginTop: 8 }}><span><i style={{ background: colors[metric] }} />actual</span><span>⋯ ML forecast (next 7 days): <b style={{ color: colors[metric] }}>{f.next_total}</b> · trend <b>{f.direction}</b> · R² {f.r2}</span></div>
          <small className="faint">{f.method}</small>
        </Spot>
        <Spot>
          <h3><span>Room types</span></h3>
          {rt.length ? <Donut parts={rt} center={<div>{t.rooms}<small style={{ display: "block", fontSize: ".6rem", color: "var(--muted)" }}>rooms</small></div>} /> : <p className="muted">No rooms yet.</p>}
        </Spot>
      </div>
      <div className="grid3">
        <Spot><h3><span>🔥 Most used items</span></h3>{data.top_items.length ? <RankList rows={data.top_items.map((i) => ({ key: i.key, label: itemLabel(i.key), sub: `${itemType(i.key)} · ${i.users} user(s)`, value: i.count }))} /> : <p className="muted">No data yet.</p>}</Spot>
        <Spot><h3><span>🧊 Never used</span><button className="abtn sm" onClick={() => go("items")}>See all</button></h3><div className="col" style={{ gap: 8 }}>{unused.map((i) => <div key={i.key} className="row"><span className="badge warn">0</span><span style={{ fontSize: ".85rem" }}>{i.name}</span><small className="muted" style={{ marginLeft: "auto" }}>{typeLabel(i.type)}</small></div>)}{!unused.length && <p className="muted">Every item has been used 🎉</p>}</div></Spot>
        <Spot><h3><span>🏆 Top builders</span></h3><RankList tone="m" rows={data.top_users.map((u) => ({ key: u.id, label: u.username, value: u.projects, sub: "projects" }))} /></Spot>
      </div>
      <div className="grid-wide">
        <Spot><h3><span>Live activity feed</span><button className="abtn sm" onClick={reload}>↻ Refresh</button></h3>
          <div className="feed">{data.recent.map((e, i) => { const m = EVENT_META[e.event] || ["•", e.event, ""]; return <div className="f" key={e.id} style={{ animationDelay: `${i * 40}ms` }}><span className="fi">{m[0]}</span><div><b>{m[1]}{e.username ? ` · ${e.username}` : ""}</b><small>{e.detail || e.email || ""}</small></div><small>{timeAgo(e.at)}</small></div>; })}</div></Spot>
        {sb && <Spot><h3><span>Neon database</span><button className="abtn sm" onClick={() => go("storage")}>Details</button></h3><div className="row" style={{ gap: 18 }}><Gauge pct={(sb.neon_bytes / (sb.neon_limit || 1)) * 100} label="used" /><div><b>{fmtBytes(sb.neon_bytes)}</b><div className="muted">of {fmtBytes(sb.neon_limit)}</div></div></div></Spot>}
      </div>
    </>
  );
}

// ===================================================================== USERS
function UserDrawer({ id, onClose, onChanged }) {
  const toast = useToast();
  const { data, loading, reload } = useApi(`/admin/users/${id}`);
  const [view, setView] = useState(null);
  const [ask, setAsk] = useState(null);
  const [reason, setReason] = useState("");
  if (loading || !data) return <><div className="drawer-back" onClick={onClose} /><aside className="drawer"><Loading /></aside></>;
  const u = data.user;
  const act = async (fn, msg) => { const r = await fn(); toast(r.success ? msg : r.message, r.success ? "success" : "error"); reload(); onChanged(); return r; };
  const openProject = async (p) => { const r = await get(`/admin/projects/${p.id}`); if (r.success) setView(r.project); else toast(r.message, "error"); };
  return (
    <>
      <div className="drawer-back" onClick={onClose} />
      <aside className="drawer">
        <div className="row"><span className="avatar" style={{ width: 54, height: 54, fontSize: "1.4rem" }}>{u.username[0].toUpperCase()}</span><div className="grow"><h2>{u.username}</h2><div className="muted">{u.email}</div></div><button className="abtn sm" onClick={onClose}>✕</button></div>
        <div className="row wrap-row">{u.is_blocked ? <span className="badge bad">Blocked</span> : <span className="badge ok">Active</span>}{u.is_email_verified ? <span className="badge ok">Verified</span> : <span className="badge warn">Unverified</span>}{u.is_2fa_enabled && <span className="badge">2FA</span>}{u.locked_until && new Date(u.locked_until) > new Date() && <span className="badge warn">Locked till {fmtDateTime(u.locked_until)}</span>}</div>
        <div className="grid2" style={{ gap: 10 }}>{[["Created", fmtDateTime(u.created_at)], ["Last login", fmtDateTime(u.last_login_at)], ["Total logins", u.login_count], ["Password changed", fmtDateTime(u.password_changed_at)]].map(([l, v]) => <div key={l} className="acard" style={{ padding: 12 }}><small className="muted">{l}</small><div style={{ fontWeight: 600 }}>{v}</div></div>)}</div>
        {u.is_blocked && u.blocked_reason && <div className="alert warn">Reason: {u.blocked_reason}</div>}
        <div className="row wrap-row">
          {u.is_blocked ? <button className="abtn pri" onClick={() => act(() => post(`/admin/users/${id}/unblock`), "User unblocked")}>Unblock</button> : <button className="abtn red" onClick={() => setAsk("block")}>Block</button>}
          <button className="abtn" onClick={() => act(() => post("/admin/backups", { scope: "user", user_id: id }), "User backup saved (see Backups)")}>💾 Backup user</button>
          <button className="abtn red" onClick={() => setAsk("delete")}>Delete account</button>
        </div>
        <h3 className="muted" style={{ fontSize: ".78rem", letterSpacing: ".12em", textTransform: "uppercase" }}>Projects ({data.projects.length})</h3>
        <div className="col" style={{ gap: 8 }}>{data.projects.map((p) => (
          <div key={p.id} className="acard" style={{ padding: 12 }}><div className="row"><div className="grow"><b>{p.name}</b><div className="muted" style={{ fontSize: ".76rem" }}>{p.stats.floors} floors · {p.stats.rooms} rooms · {p.stats.items} items · edited {timeAgo(p.updated_at)}</div></div><button className="abtn sm" onClick={() => openProject(p)}>👁 View 3D</button><button className="abtn sm red" onClick={async () => { await act(() => del(`/admin/projects/${p.id}`), "Project deleted"); }}>🗑</button></div></div>))}{!data.projects.length && <p className="muted">No projects.</p>}</div>
        <h3 className="muted" style={{ fontSize: ".78rem", letterSpacing: ".12em", textTransform: "uppercase" }}>Login history</h3>
        <div className="feed">{data.history.map((e) => { const m = EVENT_META[e.event] || ["•", e.event]; return <div key={e.id} className="f"><span className="fi">{m[0]}</span><div><b>{m[1]}</b><small>{e.detail}</small></div><small>{fmtDateTime(e.at)}</small></div>; })}{!data.history.length && <p className="muted">No login records yet.</p>}</div>
      </aside>
      {view && <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "#05070d" }}><Suspense fallback={<Spinner />}><SceneViewer scene={view.project_data} title={view.name} subtitle={`owner: ${view.owner}`} onClose={() => setView(null)} /></Suspense></div>}
      {ask === "block" && <Modal title={`Block ${u.username}?`} onClose={() => setAsk(null)} footer={<><button className="abtn" onClick={() => setAsk(null)}>Cancel</button><button className="abtn red" onClick={async () => { await act(() => post(`/admin/users/${id}/block`, { reason }), "User blocked"); setAsk(null); }}>Block user</button></>}><p className="muted">They will be logged out and cannot sign in until unblocked.</p><Field label="Reason (optional)" value={reason} onChange={setReason} /></Modal>}
      {ask === "delete" && <Confirm danger title={`Delete ${u.username}?`} text="The account, all its projects and thumbnails are removed permanently. Consider taking a backup first." confirmLabel="Delete forever" onClose={() => setAsk(null)} onConfirm={async () => { const r = await del(`/admin/users/${id}`); toast(r.success ? r.message : r.message, r.success ? "success" : "error"); onChanged(); onClose(); }} />}
    </>
  );
}
function Users() {
  const [q, setQ] = useState(""); const [filter, setFilter] = useState("all"); const [sort, setSort] = useState("created"); const [page, setPage] = useState(1); const [open, setOpen] = useState(null);
  const [dq, setDq] = useState("");
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data, loading, reload } = useApi(`/admin/users?q=${encodeURIComponent(dq)}&filter=${filter}&sort=${sort}&page=${page}`);
  return (
    <>
      <Spot>
        <div className="row wrap-row">
          <input className="inp" style={{ maxWidth: 300 }} placeholder="🔍 Search username or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="atabs">{[["all", "All"], ["blocked", "Blocked"], ["locked", "Locked"], ["unverified", "Unverified"], ["2fa", "2FA"]].map(([k, l]) => <button key={k} className={filter === k ? "on" : ""} onClick={() => { setFilter(k); setPage(1); }}>{l}</button>)}</div>
          <select className="sel" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}><option value="created">Newest</option><option value="login">Last login</option><option value="projects">Most projects</option><option value="name">Name</option></select>
          <span className="muted" style={{ marginLeft: "auto" }}>{data?.total ?? "…"} users</span>
        </div>
      </Spot>
      <Spot style={{ padding: 8 }}>
        {loading && !data ? <Loading /> : (
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>User</th><th>Email</th><th>Status</th><th>Projects</th><th>Logins</th><th>Last login (IST)</th><th>Created (IST)</th></tr></thead>
            <tbody>{data.users.map((u) => (
              <tr key={u.id} data-click onClick={() => setOpen(u.id)} style={{ cursor: "pointer" }}>
                <td><div className="row" style={{ gap: 10 }}><span className="avatar" style={{ width: 30, height: 30, fontSize: ".8rem" }}>{u.username[0].toUpperCase()}</span><b>{u.username}</b></div></td>
                <td className="mono">{u.email}</td>
                <td><div className="row wrap-row" style={{ gap: 4 }}>{u.is_blocked ? <span className="badge bad">blocked</span> : <span className="badge ok">active</span>}{!u.is_email_verified && <span className="badge warn">unverified</span>}{u.is_2fa_enabled && <span className="badge">2FA</span>}{u.locked_until && new Date(u.locked_until) > new Date() && <span className="badge warn">locked</span>}</div></td>
                <td>{u.projects_count}</td><td>{u.login_count}</td><td className="mono">{fmtDateTime(u.last_login_at)}</td><td className="mono">{fmtDateTime(u.created_at)}</td>
              </tr>))}</tbody></table></div>
        )}
        {data && data.pages > 1 && <div className="row" style={{ justifyContent: "center", padding: 12 }}><button className="abtn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button><span className="muted">Page {page} / {data.pages}</span><button className="abtn sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button></div>}
      </Spot>
      {open && <UserDrawer id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}

// ===================================================================== ITEMS
function ItemsUsage() {
  const { data, loading, reload } = useApi("/admin/items?fresh=1");
  const [cat, setCat] = useState("all"); const [sort, setSort] = useState("most"); const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!data) return [];
    const used = Object.fromEntries(data.items.map((i) => [i.key, i]));
    let r = ITEMS.map((i) => ({ ...i, count: used[i.key]?.count || 0, users: used[i.key]?.users || 0, projects: used[i.key]?.projects || 0 }));
    if (cat !== "all") r = r.filter((i) => i.cat === cat);
    if (q) r = r.filter((i) => (i.name + typeLabel(i.type)).toLowerCase().includes(q.toLowerCase()));
    if (sort === "zero") r = r.filter((i) => !i.count);
    r.sort((a, b) => (sort === "most" ? b.count - a.count : a.count - b.count) || a.name.localeCompare(b.name));
    return r;
  }, [data, cat, sort, q]);
  if (loading || !data) return <Loading />;
  const typeRows = data.types.slice(0, 12).map((t) => ({ key: t.type, label: typeLabel(t.type), value: t.count }));
  const total = data.items.reduce((s, i) => s + i.count, 0);
  return (
    <>
      <div className="grid-wide">
        <Spot><h3><span>Usage by furniture / item type</span><button className="abtn sm" onClick={reload}>↻</button></h3><RankList rows={typeRows} /></Spot>
        <Spot><h3><span>Summary</span></h3><div className="col"><div className="kpi"><div className="v"><Count value={total} /></div><div className="l">items placed in total</div></div><div className="kpi c3"><div className="v"><Count value={ITEMS.filter((i) => !data.items.find((x) => x.key === i.key)).length} /></div><div className="l">catalogue items never used</div></div><div className="kpi c2"><div className="v"><Count value={ITEMS.length} /></div><div className="l">designs in catalogue</div></div></div></Spot>
      </div>
      <div className="grid2">
        <Spot><h3><span>🎨 Popular wall colours</span></h3><div className="row wrap-row">{data.wall_colors.map((c) => <div key={c.color} title={`${c.color} · ${c.count} rooms`} style={{ textAlign: "center" }}><div style={{ width: 44, height: 44, borderRadius: 12, background: c.color, boxShadow: `0 0 16px ${c.color}66`, border: "1px solid var(--aline)" }} /><small>{c.count}</small></div>)}{!data.wall_colors.length && <p className="muted">No data yet.</p>}</div></Spot>
        <Spot><h3><span>🧱 Popular floor materials</span></h3><RankList rows={data.floor_materials.map((f) => ({ key: f.key, label: FLOORS.find((x) => x.id === f.key)?.label || f.key, value: f.count }))} /></Spot>
      </div>
      <Spot>
        <div className="row wrap-row" style={{ marginBottom: 12 }}>
          <input className="inp" style={{ maxWidth: 260 }} placeholder="🔍 Search items…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="sel" style={{ width: "auto" }} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          <div className="atabs">{[["most", "Most used"], ["least", "Least used"], ["zero", "Never used"]].map(([k, l]) => <button key={k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>{l}</button>)}</div>
          <span className="muted" style={{ marginLeft: "auto" }}>{rows.length} items</span>
        </div>
        <div className="tbl-wrap" style={{ maxHeight: 560, overflowY: "auto" }}><table className="tbl"><thead><tr><th>#</th><th>Item</th><th>Type</th><th>Uses</th><th>Users</th><th>Projects</th><th>Default price</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.key}><td className="mono">{i + 1}</td><td><b>{r.name}</b></td><td>{typeLabel(r.type)}</td><td><span className={`badge ${r.count ? "ok" : "warn"}`}>{r.count}</span></td><td>{r.users}</td><td>{r.projects}</td><td className="mono">{inr(r.price)}</td></tr>)}</tbody></table></div>
      </Spot>
    </>
  );
}

// ===================================================================== ACTIVITY
function Activity() {
  const [f, setF] = useState("all"); const [q, setQ] = useState(""); const [dq, setDq] = useState(""); const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const ev = FILTERS.find((x) => x[0] === f)[2];
  const { data, loading, reload } = useApi(`/admin/activity?event=${ev}&q=${encodeURIComponent(dq)}&page=${page}`);
  return (
    <Spot>
      <div className="row wrap-row" style={{ marginBottom: 12 }}>
        <div className="atabs">{FILTERS.map(([k, l]) => <button key={k} className={f === k ? "on" : ""} onClick={() => { setF(k); setPage(1); }}>{l}</button>)}</div>
        <input className="inp" style={{ maxWidth: 240 }} placeholder="🔍 user / email / detail" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="abtn sm" onClick={reload}>↻</button><span className="muted" style={{ marginLeft: "auto" }}>{data?.total ?? "…"} events · times in IST</span>
      </div>
      {loading && !data ? <Loading /> : (
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>When (IST)</th><th>Event</th><th>User</th><th>Email</th><th>Details</th></tr></thead><tbody>
          {data.events.map((e) => { const m = EVENT_META[e.event] || ["•", e.event, ""]; return <tr key={e.id}><td className="mono" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.at)}</td><td><span className={`badge ${m[2]}`}>{m[0]} {m[1]}</span></td><td>{e.username || "—"}{e.actor === "admin" && <small className="muted"> (admin)</small>}</td><td className="mono">{e.email || "—"}</td><td className="muted">{e.detail}</td></tr>; })}
          {!data.events.length && <tr><td colSpan="5" className="muted" style={{ textAlign: "center", padding: 30 }}>No events.</td></tr>}</tbody></table></div>
      )}
      {data && data.pages > 1 && <div className="row" style={{ justifyContent: "center", padding: 12 }}><button className="abtn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button><span className="muted">Page {page} / {data.pages}</span><button className="abtn sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button></div>}
    </Spot>
  );
}

// ===================================================================== STORAGE
function Storage() {
  const { data, loading, reload } = useApi("/admin/storage");
  if (loading || !data) return <Loading />;
  const n = data.neon, c = data.cloudinary;
  const nPct = n.limit_bytes ? (n.database_bytes / n.limit_bytes) * 100 : 0;
  const maxT = Math.max(1, ...n.tables.map((t) => t.bytes));
  return (
    <>
      <Spot className="neon-total">
        <h3><span>Total app storage</span><button className="abtn sm" onClick={reload}>↻ Refresh</button></h3>
        <div className="row wrap-row" style={{ gap: 30 }}>
          <div className="kpi" style={{ minWidth: 180 }}><div className="v"><Count value={data.total_bytes} fmt={fmtBytes} /></div><div className="l">Neon + Cloudinary combined</div></div>
          <Donut size={130} parts={[{ label: "Neon database", value: data.neon_bytes, color: "#b8ff3d" }, { label: "Cloudinary", value: data.cloudinary_bytes, color: "#ff3ea5" }]} center={<span style={{ fontSize: ".8rem" }}>split</span>} />
        </div>
      </Spot>
      <div className="grid2">
        <Spot>
          <h3><span>🐘 Neon Postgres</span><span className="badge ok">{n.engine}</span></h3>
          <div className="row" style={{ gap: 20, flexWrap: "wrap" }}><Gauge pct={nPct} label="of plan limit" /><div className="col" style={{ gap: 4 }}><div><b style={{ fontSize: "1.5rem" }}>{fmtBytes(n.database_bytes)}</b></div><div className="muted">limit {fmtBytes(n.limit_bytes)} · free {fmtBytes(Math.max(0, n.limit_bytes - n.database_bytes))}</div>{n.database_name && <div className="mono muted">db: {n.database_name} · {n.connections} connection(s)</div>}{n.version && <div className="mono faint" style={{ fontSize: ".7rem" }}>{n.version}</div>}{n.scenes_bytes != null && <div className="muted">Project scenes: <b>{fmtBytes(n.scenes_bytes)}</b></div>}</div></div>
          <div className="tbl-wrap" style={{ marginTop: 14 }}><table className="tbl"><thead><tr><th>Table</th><th>Rows</th><th>Size</th><th /></tr></thead><tbody>{n.tables.map((t) => <tr key={t.name}><td className="mono">{t.name}</td><td>{t.rows ?? "—"}</td><td className="mono">{fmtBytes(t.bytes)}{t.index_bytes != null && <small className="faint"> (idx {fmtBytes(t.index_bytes)})</small>}</td><td style={{ width: 90 }}><div className="abar"><i style={{ "--w": `${(t.bytes / maxT) * 100}%` }} /></div></td></tr>)}</tbody></table></div>
          {n.note && <small className="faint">{n.note}</small>}
          <small className="faint">Limit is read from NEON_STORAGE_LIMIT_MB (default 512).</small>
        </Spot>
        <Spot>
          <h3><span>☁️ Cloudinary</span>{c.configured ? <span className="badge ok">{c.plan || "connected"}</span> : <span className="badge bad">not configured</span>}</h3>
          {!c.configured ? <p className="muted">Set CLOUDINARY_* variables to enable thumbnails and backups.</p> : (<>
            {c.usage_error && <div className="alert warn">{c.usage_error}</div>}
            <div className="row" style={{ gap: 20, flexWrap: "wrap" }}><Gauge pct={c.credits?.used_percent ?? (((c.credits?.usage || 0) / (c.credits?.limit || 1)) * 100)} label="credits used" />
              <div className="col" style={{ gap: 4 }}><b style={{ fontSize: "1.5rem" }}>{fmtBytes(data.cloudinary_bytes)}</b><div className="muted">stored on cloud “{c.cloud_name}”</div><div className="muted">Credits: {c.credits?.usage ?? "—"} / {c.credits?.limit ?? "—"}</div></div></div>
            <div className="grid2" style={{ gap: 10, marginTop: 14 }}>{[["Storage", fmtBytes(c.storage?.usage || 0)], ["Bandwidth", fmtBytes(c.bandwidth?.usage || 0)], ["Transformations", c.transformations?.usage ?? "—"], ["Total assets", c.resources ?? c.objects?.usage ?? "—"], ["Derived assets", c.derived_resources ?? "—"], ["Requests", c.requests ?? "—"]].map(([l, v]) => <div key={l} className="acard" style={{ padding: 12 }}><small className="muted">{l}</small><div style={{ fontWeight: 700 }}>{v}</div></div>)}</div>
            <h3 style={{ marginTop: 16 }}><span>DreamSpace folders</span></h3>
            {Object.entries(c.folders || {}).map(([k, v]) => <div key={k} className="row"><b style={{ textTransform: "capitalize", minWidth: 110 }}>{k}</b><span className="muted">{v.error ? "unavailable" : `${v.count} file(s) · ${fmtBytes(v.bytes)}${v.truncated ? "+" : ""}`}</span></div>)}
          </>)}
        </Spot>
      </div>
    </>
  );
}

// ===================================================================== BACKUPS
function Backups() {
  const toast = useToast();
  const { data, loading, reload } = useApi("/admin/backups");
  const [busy, setBusy] = useState(""); const [ask, setAsk] = useState(null);
  const run = async (key, fn, ok) => { setBusy(key); const r = await fn(); setBusy(""); toast(r.success ? (ok || r.message) : r.message, r.success ? "success" : "error"); reload(); };
  if (loading && !data) return <Loading />;
  return (
    <>
      <Spot>
        <h3><span>Create backup</span></h3>
        <p className="muted">A backup contains users (with password hashes), projects and settings as one JSON file, stored privately in Cloudinary. Single-user backups are created from the Users page.</p>
        <div className="row wrap-row" style={{ marginTop: 10 }}><button className="abtn pri" disabled={busy === "full"} onClick={() => run("full", () => post("/admin/backups", { scope: "full" }), "Full backup created")}>{busy === "full" ? "Backing up…" : "💾 Back up entire app"}</button>{!data.cloud && <span className="badge warn">Cloudinary off – backups cannot be stored</span>}</div>
      </Spot>
      <Spot style={{ padding: 8 }}>
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Created (IST)</th><th>Backup</th><th>Scope</th><th>Users</th><th>Projects</th><th>Size</th><th /></tr></thead><tbody>
          {data.backups.map((b) => (<tr key={b.id}><td className="mono">{fmtDateTime(b.created_at)}</td><td><b>{b.label}</b></td><td><span className={`badge ${b.scope === "full" ? "warn" : ""}`}>{b.scope}</span></td><td>{b.users_count}</td><td>{b.projects_count}</td><td className="mono">{fmtBytes(b.size_bytes)}</td>
            <td><div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>{b.stored_in_cloud && <><a className="abtn sm" href={`/api/admin/backups/${b.id}/download`}>⬇ Download</a><button className="abtn sm" onClick={() => setAsk({ t: "restore", b })}>📥 Restore</button></>}<button className="abtn sm red" onClick={() => setAsk({ t: "del", b })}>🗑</button></div></td></tr>))}
          {!data.backups.length && <tr><td colSpan="7" className="muted" style={{ textAlign: "center", padding: 30 }}>No backups yet.</td></tr>}</tbody></table></div>
      </Spot>
      {ask?.t === "restore" && <Confirm title="Restore backup?" text="Missing users and projects from this backup are merged back in. Existing accounts are never overwritten." confirmLabel="Restore" onClose={() => setAsk(null)} onConfirm={() => run("rs", () => post(`/admin/backups/${ask.b.id}/restore`))} />}
      {ask?.t === "del" && <Confirm danger title="Delete backup?" text="The backup file is removed from Cloudinary." confirmLabel="Delete" onClose={() => setAsk(null)} onConfirm={() => run("dl", () => del(`/admin/backups/${ask.b.id}`), "Backup deleted")} />}
    </>
  );
}

// ===================================================================== PRICES
function Prices() {
  const toast = useToast();
  const { data, loading } = useApi("/admin/prices");
  const [ov, setOv] = useState(null); const [q, setQ] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (data?.prices) setOv(data.prices); }, [data]);
  const rows = useMemo(() => [
    ...ITEMS.map((i) => ({ key: i.key, name: i.name, group: typeLabel(i.type), price: i.price })),
    ...FLOORS.map((f) => ({ key: `floor.${f.id}`, name: f.label, group: "Flooring (₹/m²)", price: f.price })),
    ...FINISHES.map((f) => ({ key: `finish.${f.id}`, name: f.label, group: "Wall paint (₹/m²)", price: f.price })),
    ...CONSTRUCTION_GRADES.map((g) => ({ key: `grade.${g.id}`, name: `${g.label} construction`, group: "Structure (₹/m²)", price: g.perM2 })),
  ], []);
  if (loading || !ov) return <Loading />;
  const shown = rows.filter((r) => !q || (r.name + r.group).toLowerCase().includes(q.toLowerCase())).slice(0, 400);
  const changed = Object.keys(ov).length;
  const save = async () => { setSaving(true); const r = await put("/admin/prices", { prices: ov }); setSaving(false); toast(r.success ? "Prices saved – users see them instantly." : r.message, r.success ? "success" : "error"); };
  return (
    <Spot>
      <div className="row wrap-row" style={{ marginBottom: 12 }}><input className="inp" style={{ maxWidth: 280 }} placeholder="🔍 Search items…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="badge warn">{changed} override(s)</span><button className="abtn" onClick={() => setOv({})}>Reset all to default</button><button className="abtn pri" style={{ marginLeft: "auto" }} disabled={saving} onClick={save}>{saving ? "Saving…" : "💾 Save prices"}</button></div>
      <div className="tbl-wrap" style={{ maxHeight: 620, overflowY: "auto" }}><table className="tbl"><thead><tr><th>Item</th><th>Group</th><th>Default</th><th>Your price (₹)</th></tr></thead><tbody>
        {shown.map((r) => (<tr key={r.key}><td><b>{r.name}</b></td><td className="muted">{r.group}</td><td className="mono">{inr(r.price)}</td><td><input className="inp" type="number" min="0" style={{ width: 130, borderColor: ov[r.key] != null ? "var(--a3)" : undefined }} placeholder={String(r.price)} value={ov[r.key] ?? ""} onChange={(e) => { const v = e.target.value; setOv((o) => { const n = { ...o }; if (v === "") delete n[r.key]; else n[r.key] = Number(v); return n; }); }} /></td></tr>))}</tbody></table></div>
    </Spot>
  );
}

// ===================================================================== SETTINGS
function Settings({ onLock }) {
  const toast = useToast();
  const [f, setF] = useState({ email: "", pw1: "", cur1: "", new1: "", cur2: "", new2: "" });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const go = async (path, body, clear) => { const r = await post(path, body); toast(r.message, r.success ? "success" : "error"); if (r.success) setF((s) => ({ ...s, ...clear })); };
  return (
    <div className="grid3">
      <Spot><h3><span>✉️ Admin email</span></h3><div className="col"><Field label="New email" type="email" value={f.email} onChange={set("email")} /><Field label="Admin login password" type="password" value={f.pw1} onChange={set("pw1")} /><button className="abtn pri" onClick={() => go("/admin/settings/email", { new_email: f.email, password: f.pw1 }, { email: "", pw1: "" })}>Update email</button><small className="muted">Used for admin OTP recovery.</small></div></Spot>
      <Spot><h3><span>🔑 Admin login password</span></h3><div className="col"><Field label="Current password" type="password" value={f.cur1} onChange={set("cur1")} /><Field label="New password" type="password" value={f.new1} onChange={set("new1")} hint="10+ chars, upper, lower, number" /><button className="abtn pri" onClick={() => go("/admin/settings/password", { which: "login", current_password: f.cur1, new_password: f.new1 }, { cur1: "", new1: "" })}>Change password</button></div></Spot>
      <Spot><h3><span>🗝️ Panel password</span></h3><div className="col"><Field label="Current panel password" type="password" value={f.cur2} onChange={set("cur2")} /><Field label="New panel password" type="password" value={f.new2} onChange={set("new2")} /><button className="abtn pri" onClick={() => go("/admin/settings/password", { which: "panel", current_password: f.cur2, new_password: f.new2 }, { cur2: "", new2: "" })}>Change panel password</button></div></Spot>
      <Spot><h3><span>🧷 Session</span></h3><p className="muted">The panel locks itself after 60 minutes of inactivity. Passwords changed here override the values in <span className="mono">.env</span> (stored hashed in Neon).</p><div className="row wrap-row" style={{ marginTop: 10 }}><button className="abtn" onClick={onLock}>Sign out of admin</button></div></Spot>
    </div>
  );
}

// ===================================================================== DANGER
function Danger() {
  const toast = useToast(); const { go } = useRouter();
  const [open, setOpen] = useState(false); const [pw, setPw] = useState(""); const [phrase, setPhrase] = useState(""); const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); const r = await post("/admin/danger/delete-app", { panel_password: pw, confirm: phrase }); setBusy(false); toast(r.message, r.success ? "success" : "error"); if (r.success) { setOpen(false); go("/admin/gate"); } };
  return (
    <Spot className="danger-zone">
      <h3 style={{ color: "var(--danger)" }}><span>☠️ Delete entire app data</span></h3>
      <p className="muted">Removes <b>every user, project, activity log, OTP and backup</b> from Neon and deletes all DreamSpace files from Cloudinary. Settings and prices are kept. This cannot be undone - take a full backup first and download it.</p>
      <div style={{ marginTop: 14 }}><button className="abtn red" onClick={() => setOpen(true)}>Delete everything…</button></div>
      {open && <Modal title="Delete the entire app?" onClose={() => setOpen(false)} footer={<><button className="abtn" onClick={() => setOpen(false)}>Cancel</button><button className="abtn red" disabled={busy || phrase !== "DELETE ENTIRE APP" || !pw} onClick={run}>{busy ? "Deleting…" : "Delete forever"}</button></>}><div className="alert error">All user data will be erased permanently.</div><Field label="Admin panel password" type="password" value={pw} onChange={setPw} /><Field label='Type "DELETE ENTIRE APP"' value={phrase} onChange={setPhrase} /></Modal>}
    </Spot>
  );
}

// ===================================================================== SHELL
export default function AdminPanel() {
  const { go } = useRouter();
  const toast = useToast();
  const [section, setSection] = useState(() => (window.location.hash.slice(1) || "overview"));
  const [menu, setMenu] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const nav = (k) => { setSection(k); setMenu(false); window.history.replaceState({}, "", `/admin#${k}`); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const lock = async () => { await post("/admin/logout"); toast("Signed out of admin.", "success"); go("/login"); };
  const title = NAV.find((n) => n[0] === section)?.[2] || "Overview";
  const clock = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true });
  const date = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short" });
  return (
    <div className="adm-shell">
      <aside className={`adm-side ${menu ? "open" : ""}`}>
        <div className="adm-brand"><span className="hex">D</span><div><b>DreamSpace</b><small>COMMAND CENTER</small></div></div>
        {NAV.map(([k, ic, l]) => <button key={k} className={`adm-nav ${section === k ? "on" : ""}`} onClick={() => nav(k)}><span className="ni">{ic}</span>{l}</button>)}
        <div style={{ flex: 1 }} />
        <button className="adm-nav" onClick={() => go("/admin/gate")}><span className="ni">↩️</span>Admin gate</button>
        <button className="adm-nav" onClick={lock}><span className="ni">🚪</span>Sign out</button>
      </aside>
      <main className="adm-main">
        <div className="adm-top">
          <button className="adm-burger" onClick={() => setMenu((m) => !m)}>☰</button>
          <button className="abtn sm" onClick={() => go("/admin/gate")}>← Back</button>
          <h1 className="grow">{title}</h1>
          <span className="adm-clock">🕒 <b>{clock}</b> IST · {date}</span>
        </div>
        {section === "overview" && <Overview go={nav} />}
        {section === "users" && <Users />}
        {section === "items" && <ItemsUsage />}
        {section === "activity" && <Activity />}
        {section === "storage" && <Storage />}
        {section === "backups" && <Backups />}
        {section === "prices" && <Prices />}
        {section === "settings" && <Settings onLock={lock} />}
        {section === "danger" && <Danger />}
      </main>
    </div>
  );
}

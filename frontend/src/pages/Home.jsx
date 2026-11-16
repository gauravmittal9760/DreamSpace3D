import { useCallback, useEffect, useState } from "react";
import { del, fmtDateTime, get, post, timeAgo } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Aurora, Btn, Confirm, Field, Logo, Modal, OtpInput, Spinner, useCooldown, useToast } from "../components/ui.jsx";
import { useRouter } from "../router.jsx";
import { TEMPLATES } from "../scene/templates.js";

function AccountPanel() {
  const { user, setUser, logout } = useAuth();
  const { go } = useRouter();
  const toast = useToast();
  const [pw, setPw] = useState({ cur: "", next: "" });
  const [em, setEm] = useState({ email: "", pass: "", otp: "", sent: false });
  const [twofa, setTwofa] = useState({ otp: "", sent: false, pass: "" });
  const [delPw, setDelPw] = useState("");
  const [showDel, setShowDel] = useState(false);
  const [cool, startCool] = useCooldown(60);
  const [busy, setBusy] = useState("");
  const run = async (key, fn) => { setBusy(key); await fn(); setBusy(""); };

  return (
    <div className="two-col">
      <div className="card glass">
        <h3>👤 Profile</h3>
        <div className="row"><span className="avatar">{user.username[0].toUpperCase()}</span><div><b>{user.username}</b><div className="muted">{user.email}</div></div></div>
        <div className="row wrap-row"><span className="badge ok">Email verified</span>{user.is_2fa_enabled && <span className="badge">2FA on</span>}</div>
        <div className="muted">Joined {fmtDateTime(user.created_at)} · Last login {fmtDateTime(user.last_login_at)}</div>
        <Btn kind="ghost" onClick={async () => { await logout(); go("/login"); }}>Log out</Btn>
      </div>
      <div className="card glass">
        <h3>🔐 Two-factor authentication</h3>
        <p className="muted">When enabled, every login asks for an OTP sent to your email. Turn it on for extra safety - it is off by default so OTP limits last longer.</p>
        {user.is_2fa_enabled ? (<>
          <Field label="Confirm with password" type="password" value={twofa.pass} onChange={(v) => setTwofa({ ...twofa, pass: v })} />
          <Btn kind="danger" busy={busy === "2off"} onClick={() => run("2off", async () => { const r = await post("/auth/2fa/disable", { password: twofa.pass }); if (r.success) { setUser(r.user); toast(r.message, "success"); } else toast(r.message, "error"); })}>Disable 2FA</Btn>
        </>) : twofa.sent ? (<>
          <OtpInput value={twofa.otp} onChange={(v) => setTwofa({ ...twofa, otp: v })} />
          <Btn busy={busy === "2v"} disabled={twofa.otp.length < 6} onClick={() => run("2v", async () => { const r = await post("/auth/2fa/verify-enable", { otp: twofa.otp }); if (r.success) { setUser(r.user); toast(r.message, "success"); } else toast(r.message, "error"); })}>Verify &amp; enable</Btn>
        </>) : (
          <Btn busy={busy === "2s"} disabled={cool > 0} onClick={() => run("2s", async () => { const r = await post("/auth/2fa/request-enable"); if (r.success) { setTwofa({ ...twofa, sent: true }); startCool(); toast(r.message, "success"); } else toast(r.message, "error"); })}>Send OTP to enable</Btn>
        )}
      </div>
      <div className="card glass">
        <h3>🔑 Change password</h3>
        <Field label="Current password" type="password" value={pw.cur} onChange={(v) => setPw({ ...pw, cur: v })} />
        <Field label="New password" type="password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} hint="10+ chars with upper, lower case & a number" />
        <Btn busy={busy === "pw"} onClick={() => run("pw", async () => { const r = await post("/auth/account/change-password", { current_password: pw.cur, new_password: pw.next }); toast(r.message, r.success ? "success" : "error"); if (r.success) setPw({ cur: "", next: "" }); })}>Update password</Btn>
      </div>
      <div className="card glass">
        <h3>✉️ Change email</h3>
        {!em.sent ? (<>
          <Field label="New email" type="email" value={em.email} onChange={(v) => setEm({ ...em, email: v })} />
          <Field label="Your password" type="password" value={em.pass} onChange={(v) => setEm({ ...em, pass: v })} />
          <Btn busy={busy === "es"} onClick={() => run("es", async () => { const r = await post("/auth/account/change-email/request", { new_email: em.email, password: em.pass }); if (r.success) { setEm({ ...em, sent: true }); toast(r.message, "success"); } else toast(r.message, "error"); })}>Send OTP to new email</Btn>
        </>) : (<>
          <OtpInput value={em.otp} onChange={(v) => setEm({ ...em, otp: v })} />
          <Btn busy={busy === "ec"} disabled={em.otp.length < 6} onClick={() => run("ec", async () => { const r = await post("/auth/account/change-email/confirm", { otp: em.otp }); if (r.success) { setUser(r.user); setEm({ email: "", pass: "", otp: "", sent: false }); toast(r.message, "success"); } else toast(r.message, "error"); })}>Confirm new email</Btn>
        </>)}
      </div>
      <div className="card glass" style={{ borderColor: "var(--danger)" }}>
        <h3>🗑️ Delete account</h3>
        <p className="muted">Permanently removes your account and all projects.</p>
        <Btn kind="danger" onClick={() => setShowDel(true)}>Delete my account</Btn>
      </div>
      {showDel && (
        <Modal title="Delete account?" onClose={() => setShowDel(false)} footer={<><Btn kind="ghost" onClick={() => setShowDel(false)}>Cancel</Btn><Btn kind="danger" onClick={async () => { const r = await post("/auth/account/delete", { password: delPw }); if (r.success) { setUser(null); toast(r.message, "success"); go("/login"); } else toast(r.message, "error"); }}>Delete forever</Btn></>}>
          <p className="muted">This cannot be undone. Enter your password to confirm.</p>
          <Field label="Password" type="password" value={delPw} onChange={setDelPw} />
        </Modal>
      )}
    </div>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const { go } = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState("projects");
  const [projects, setProjects] = useState(null);
  const [limit, setLimit] = useState(30);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("My Dream Home");
  const [confirmDel, setConfirmDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { const r = await get("/projects"); if (r.success) { setProjects(r.projects); setLimit(r.limit); } else if (r.status === 401) go("/login"); }, [go]);
  useEffect(() => { load(); }, [load]);

  const create = async (tpl) => {
    setBusy(true);
    const r = await post("/projects", { name: name.trim() || "Untitled", project_data: tpl.build() });
    setBusy(false);
    if (!r.success) return toast(r.message, "error");
    go(`/studio/${r.project.id}`);
  };
  const dup = async (p) => { const r = await post(`/projects/${p.id}/duplicate`); toast(r.success ? "Project duplicated." : r.message, r.success ? "success" : "error"); load(); };
  const totals = (projects || []).reduce((a, p) => ({ rooms: a.rooms + p.stats.rooms, items: a.items + p.stats.items, floors: a.floors + p.stats.floors }), { rooms: 0, items: 0, floors: 0 });

  return (
    <div className="shell">
      <Aurora />
      <header className="topbar">
        <Logo size={34} /><div className="grow" />
        <div className="user-chip"><span className="avatar" style={{ width: 30, height: 30 }}>{user.username[0].toUpperCase()}</span><b className="hide-sm">{user.username}</b></div>
        <Btn kind="ghost" className="sm" onClick={async () => { await logout(); go("/login"); }}>Log out</Btn>
      </header>
      <main className="page">
        <section className="hero-banner glass neon">
          <div><h1>Hello, <span>{user.username}</span> 👋</h1><p className="muted">Design a whole house or building - rooms, floors, garden, furniture, paint & cost - all in 3D.</p></div>
          <Btn onClick={() => setShowNew(true)} className="lg">＋ New project</Btn>
        </section>
        <div className="stat-row">
          {[["Projects", projects?.length ?? "…"], ["Floors designed", totals.floors], ["Rooms", totals.rooms], ["Items placed", totals.items]].map(([l, n]) => <div key={l} className="stat glass"><div className="n">{n}</div><div className="l">{l}</div></div>)}
        </div>
        <div className="tabs" style={{ alignSelf: "flex-start" }}>{[["projects", "🏗️ My projects"], ["account", "⚙️ Account & security"]].map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
        {tab === "account" ? <AccountPanel /> : (
          <section className="col">
            <div className="sec-head"><h2>My projects</h2><span className="muted">{projects?.length ?? 0} / {limit}</span></div>
            {!projects ? <Spinner /> : projects.length === 0 ? (
              <div className="empty glass"><div className="e">🏗️</div><h3>No projects yet</h3><p>Create your first design from a template or a blank room.</p><br /><Btn onClick={() => setShowNew(true)}>Start designing</Btn></div>
            ) : (
              <div className="proj-grid">{projects.map((p) => (
                <article key={p.id} className="proj glass hover" onClick={() => go(`/studio/${p.id}`)}>
                  <div className="thumb">{p.thumbnail_url ? <img src={p.thumbnail_url} alt="" loading="lazy" /> : "🏠"}</div>
                  <div className="body">
                    <h3>{p.name}</h3>
                    <div className="meta"><span className="badge">{p.stats.floors} floor{p.stats.floors !== 1 && "s"}</span><span className="badge">{p.stats.rooms} rooms</span><span className="badge">{p.stats.items} items</span>{p.shared && <span className="badge ok">shared</span>}</div>
                    <small className="muted">Edited {timeAgo(p.updated_at)} · {fmtDateTime(p.updated_at)}</small>
                    <div className="actions" onClick={(e) => e.stopPropagation()}>
                      <Btn className="sm" onClick={() => go(`/studio/${p.id}`)}>Open</Btn><Btn kind="ghost" className="sm" onClick={() => dup(p)}>Duplicate</Btn><Btn kind="ghost" className="sm" onClick={() => setConfirmDel(p)}>Delete</Btn>
                    </div>
                  </div>
                </article>))}</div>
            )}
          </section>
        )}
      </main>
      {showNew && (
        <Modal title="Start a new project" wide onClose={() => setShowNew(false)}>
          <Field label="Project name" value={name} onChange={setName} maxLength={120} />
          <div className="tpl-grid">{TEMPLATES.map((t) => <button key={t.id} disabled={busy} className="tpl" onClick={() => create(t)}><div className="e">{t.icon}</div><b>{t.name}</b><span>{t.desc}</span></button>)}</div>
        </Modal>
      )}
      {confirmDel && <Confirm danger title="Delete project?" text={`“${confirmDel.name}” will be removed permanently.`} confirmLabel="Delete" onClose={() => setConfirmDel(null)} onConfirm={async () => { const r = await del(`/projects/${confirmDel.id}`); toast(r.success ? "Project deleted." : r.message, r.success ? "success" : "error"); load(); }} />}
    </div>
  );
}

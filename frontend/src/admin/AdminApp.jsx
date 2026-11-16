import { lazy, Suspense, useEffect, useState } from "react";
import { get, post } from "../api.js";
import { BackBtn, Field, OtpInput, Spinner, useCooldown, useToast } from "../components/ui.jsx";
import { useRouter } from "../router.jsx";
import "./admin.css";
import Cursor from "./Cursor.jsx";

const Panel = lazy(() => import("./AdminPanel.jsx"));

function GateShell({ children, back }) {
  return (<div className="gate-wrap"><div className="gate-top">{back}</div>{children}</div>);
}

function Gate({ status }) {
  const { go } = useRouter();
  const opts = [
    ["🛡️", "Access Admin Panel", "Enter the admin panel password to open the dashboard", () => go("/admin/unlock")],
    ["↩️", "Back to login page", "Sign out of the admin session and return to login", async () => { await post("/admin/logout"); go("/login"); }],
    ["🔑", "Forgot password", "Reset with your security question + email OTP", () => go("/admin/recover")],
  ];
  return (
    <GateShell back={<BackBtn to="/login" />}>
      <div className="gate-card glass neon" style={{ textAlign: "center" }}>
        <div className="orb"><span>⚡</span></div>
        <div><h2>Welcome, {status.username}</h2><p className="muted">Admin credentials verified. Choose how to continue.</p></div>
        <div className="gate-opts gate-opts-grid" style={{ display: "grid", gap: 12 }}>
          {opts.map(([i, t, d, fn]) => <button key={t} className="gate-opt" onClick={fn}><span className="gi">{i}</span><span><b>{t}</b><span>{d}</span></span></button>)}
        </div>
      </div>
    </GateShell>
  );
}

function Unlock() {
  const { go } = useRouter();
  const toast = useToast();
  const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await post("/admin/unlock", { panel_password: pw }); setBusy(false);
    if (r.need_login) return go("/login");
    if (!r.success) return setErr(r.message);
    toast(r.message, "success"); go("/admin");
  };
  return (
    <GateShell back={<BackBtn to="/admin/gate" />}>
      <form className="gate-card glass neon" onSubmit={submit}>
        <div className="orb"><span>🔐</span></div>
        <div style={{ textAlign: "center" }}><h2>Admin panel password</h2><p className="muted">One more step before the dashboard opens.</p></div>
        {err && <div className="alert error">{err}</div>}
        <Field label="Panel password" type="password" value={pw} onChange={setPw} autoFocus icon="🗝️" autoComplete="off" />
        <button className="abtn pri" style={{ justifyContent: "center" }} disabled={busy || !pw}>{busy ? "Checking…" : "Open dashboard →"}</button>
      </form>
    </GateShell>
  );
}

function Recover() {
  const { go } = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [q, setQ] = useState(""); const [ans, setAns] = useState(""); const [otp, setOtp] = useState(""); const [target, setTarget] = useState("login"); const [pw, setPw] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [mail, setMail] = useState("");
  const [cool, startCool] = useCooldown(60);
  useEffect(() => { get("/admin/recovery/question").then((r) => (r.success ? setQ(r.question) : (setErr(r.message), r.status === 401 && go("/login")))); }, [go]);
  const answer = async () => { setBusy(true); setErr(""); const r = await post("/admin/recovery/answer", { answer: ans }); setBusy(false); if (!r.success) return setErr(r.message); setMail(r.email); toast(r.message, r.otp_sent ? "success" : "error"); if (r.otp_sent) startCool(); setStep(2); };
  const resend = async () => { const r = await post("/admin/recovery/resend"); toast(r.message, r.success ? "success" : "error"); if (r.success) startCool(); };
  const reset = async () => { setBusy(true); setErr(""); const r = await post("/admin/recovery/reset", { otp, target, new_password: pw }); setBusy(false); if (!r.success) return setErr(r.message); toast(r.message, "success"); go("/admin/gate"); };
  return (
    <GateShell back={<BackBtn to="/admin/gate" />}>
      <div className="gate-card glass neon">
        <div className="orb"><span>🧩</span></div>
        <div style={{ textAlign: "center" }}><h2>Recover admin access</h2><p className="muted">Step {step} of 2 · security question, then e-mail OTP</p></div>
        {err && <div className="alert error">{err}</div>}
        {step === 1 ? (<>
          <div className="alert"><b>{q || "…"}</b></div>
          <Field label="Your answer" value={ans} onChange={setAns} autoFocus icon="💬" autoComplete="off" />
          <button className="abtn pri" style={{ justifyContent: "center" }} disabled={busy || !ans} onClick={answer}>{busy ? "Checking…" : "Verify answer"}</button>
        </>) : (<>
          <p className="muted">Enter the OTP sent to <b>{mail}</b> (valid 10 minutes) and set a new password.</p>
          <OtpInput value={otp} onChange={setOtp} />
          <div className="atabs" style={{ alignSelf: "center" }}>{[["login", "Admin login password"], ["panel", "Panel password"]].map(([k, l]) => <button key={k} className={target === k ? "on" : ""} onClick={() => setTarget(k)}>{l}</button>)}</div>
          <Field label="New password" type="password" value={pw} onChange={setPw} hint="10+ chars with upper, lower case & a number" icon="🔒" />
          <button className="abtn pri" style={{ justifyContent: "center" }} disabled={busy || otp.length < 6 || !pw} onClick={reset}>{busy ? "Saving…" : "Reset password"}</button>
          <button className="linkbtn" disabled={cool > 0} onClick={resend}>{cool > 0 ? `Resend OTP in ${cool}s` : "Resend OTP"}</button>
        </>)}
      </div>
    </GateShell>
  );
}

export default function AdminApp() {
  const { path, go } = useRouter();
  const [status, setStatus] = useState(null);
  useEffect(() => { setStatus(null); get("/admin/status").then(setStatus); }, [path]);

  let body;
  const redirect = (to) => { queueMicrotask(() => go(to, { replace: true })); return <Spinner />; };
  if (!status) body = <Spinner label="Checking admin session…" />;
  else if (!status.gate) body = redirect("/login");
  else if (path === "/admin/recover") body = <Recover />;
  else if (path === "/admin/unlock") body = <Unlock />;
  else if (path === "/admin/gate") body = <Gate status={status} />;
  else if (status.unlocked) body = <Suspense fallback={<Spinner label="Loading dashboard…" />}><Panel /></Suspense>;
  else body = redirect("/admin/gate");

  return (<div className="adm"><div className="adm-bg" /><Cursor />{body}</div>);
}

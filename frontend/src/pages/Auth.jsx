import { useEffect, useState } from "react";
import { post } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Aurora, Btn, Field, Logo, OtpInput, useCooldown, useToast } from "../components/ui.jsx";
import { useRouter } from "../router.jsx";

const FEATURES = [
  ["🏗️", "Multi-floor design", "Rooms, floors, terrace, balcony & garden on one canvas"],
  ["🛋️", "290+ items", "18 wardrobes, 12 beds, sofas, fans, tiles, bathtubs…"],
  ["🎨", "156 paint shades", "Per-wall colours and 24 flooring materials"],
  ["🧠", "Real AI / ML", "Smart suggestions, auto-arrange & colour harmony"],
  ["💰", "Live cost estimate", "Every item, paint and tile priced in ₹"],
  ["📱", "Any device", "Phone, tablet or laptop - just open the link"],
];

function Shell({ children, hero = true }) {
  return (
    <div className="auth-page">
      <Aurora />
      <section className="auth-hero">
        <Logo size={46} />
        {hero && (<>
          <h1>Design your <span>dream home</span> in glowing 3D.</h1>
          <p>Draw the floor plan, add rooms and floors, furnish every corner, paint the walls and watch the cost update live - then save, edit and share.</p>
          <div className="feat-grid">{FEATURES.map(([ic, t, d]) => <div key={t} className="feat glass hover"><div className="ic">{ic}</div><b>{t}</b><span>{d}</span></div>)}</div>
        </>)}
      </section>
      <main className="auth-side">{children}</main>
    </div>
  );
}

function strength(p) {
  let s = 0;
  if (p.length >= 10) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++;
  return s;
}
const Meter = ({ value }) => (<div className="pw-meter">{[0, 1, 2, 3].map((i) => <i key={i} className={i < strength(value) ? "on" : ""} />)}</div>);

export function LoginPage() {
  const { go } = useRouter();
  const { setUser } = useAuth();
  const toast = useToast();
  const [id, setId] = useState(() => sessionStorage.getItem("ds-prefill") || "");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [step, setStep] = useState("creds");
  const [otp, setOtp] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [maskedMail, setMaskedMail] = useState("");
  const [cool, startCool] = useCooldown(60);
  useEffect(() => { sessionStorage.removeItem("ds-prefill"); }, []);

  const finish = (r) => { setUser(r.user); toast(`Welcome back, ${r.user.username}!`, "success"); go("/"); };
  const submit = async (e, forceUser) => {
    e?.preventDefault(); setErr(""); setBusy(true);
    const r = await post("/auth/login", { identifier: forceUser || id, password: pw });
    setBusy(false);
    if (r.admin_gate) return go("/admin/gate");
    if (r.choose_account) { setAccounts(r.accounts); setStep("choose"); return; }
    if (r.needs_verification) { sessionStorage.setItem("ds-verify", r.username); toast("Please verify your email first.", "info"); return go("/verify"); }
    if (!r.success) return setErr(r.message || "Login failed.");
    if (r.requires_2fa) { setMaskedMail(r.email || ""); setStep("otp"); startCool(); return; }
    finish(r);
  };
  const verify2fa = async () => {
    setErr(""); setBusy(true);
    const r = await post("/auth/verify-login-2fa", { otp }); setBusy(false);
    if (!r.success) return setErr(r.message);
    finish(r);
  };
  const resend = async () => { const r = await post("/auth/resend-login-2fa"); if (r.success) { toast(r.message, "success"); startCool(); } else setErr(r.message); };

  return (
    <Shell>
      <form className="auth-card glass neon" onSubmit={submit}>
        {step === "creds" && (<>
          <div><h2>Welcome back 👋</h2></div>
          <p className="sub">Log in with your <b>email or username</b>.</p>
          {err && <div className="alert error">{err}</div>}
          <Field label="Email or username" value={id} onChange={setId} autoComplete="username" autoFocus icon="👤" required />
          <Field label="Password" type="password" value={pw} onChange={setPw} autoComplete="current-password" icon="🔒" required />
          <Btn type="submit" busy={busy} className="block">Log in</Btn>
          <div className="auth-links"><button type="button" onClick={() => go("/forgot-password")}>Forgot password?</button><button type="button" onClick={() => go("/forgot-username")}>Forgot username?</button></div>
          <div className="auth-links"><span className="muted">New here?</span><button type="button" onClick={() => go("/signup")}>Create an account →</button></div>
        </>)}
        {step === "choose" && (<>
          <h2>Choose account</h2><p className="sub">Several accounts use this email &amp; password.</p>
          <div className="accounts">{accounts.map((a) => <button type="button" key={a} className="account-pick" onClick={() => { setId(a); submit(null, a); }}><span className="avatar">{a[0].toUpperCase()}</span><b>{a}</b></button>)}</div>
          <Btn kind="ghost" type="button" onClick={() => setStep("creds")}>← Back</Btn>
        </>)}
        {step === "otp" && (<>
          <h2>Two-factor check 🔐</h2><p className="sub">Enter the 6-digit code sent to <b>{maskedMail}</b>. Valid for 10 minutes.</p>
          {err && <div className="alert error">{err}</div>}
          <OtpInput value={otp} onChange={setOtp} />
          <Btn type="button" busy={busy} disabled={otp.length < 6} onClick={verify2fa} className="block">Verify &amp; log in</Btn>
          <div className="auth-links"><button type="button" disabled={cool > 0} onClick={resend}>{cool > 0 ? `Resend in ${cool}s` : "Resend code"}</button><button type="button" onClick={() => setStep("creds")}>← Back</button></div>
        </>)}
      </form>
    </Shell>
  );
}

export function SignupPage() {
  const { go } = useRouter();
  const toast = useToast();
  const [f, setF] = useState({ username: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (f.password !== f.confirm) return setErr("Passwords do not match.");
    setBusy(true);
    const r = await post("/auth/signup", { username: f.username.trim(), email: f.email.trim(), password: f.password });
    setBusy(false);
    if (!r.success) return setErr(r.message);
    sessionStorage.setItem("ds-verify", r.username);
    toast(r.message, r.email_sent ? "success" : "info");
    go("/verify");
  };
  return (
    <Shell>
      <form className="auth-card glass neon" onSubmit={submit}>
        <h2>Create your account ✨</h2><p className="sub">You can create several accounts with the same email.</p>
        {err && <div className="alert error">{err}</div>}
        <Field label="Username" value={f.username} onChange={set("username")} hint="3-40 letters, numbers or _" autoComplete="username" required icon="👤" />
        <Field label="Email" type="email" value={f.email} onChange={set("email")} autoComplete="email" required icon="✉️" />
        <Field label="Password" type="password" value={f.password} onChange={set("password")} autoComplete="new-password" required icon="🔒" hint="10+ chars with upper, lower case & a number" />
        <Meter value={f.password} />
        <Field label="Confirm password" type="password" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" required icon="🔁" />
        <Btn type="submit" busy={busy} className="block">Sign up &amp; send OTP</Btn>
        <div className="auth-links"><span className="muted">Already registered?</span><button type="button" onClick={() => go("/login")}>Log in →</button></div>
      </form>
    </Shell>
  );
}

export function VerifyPage() {
  const { go } = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState(() => sessionStorage.getItem("ds-verify") || "");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cool, startCool] = useCooldown(60);
  useEffect(() => { startCool(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const verify = async () => {
    setErr(""); setBusy(true);
    const r = await post("/auth/verify-email", { username: username.trim(), otp }); setBusy(false);
    if (!r.success) return setErr(r.message);
    toast("Email verified! You can log in now.", "success"); sessionStorage.setItem("ds-prefill", username); sessionStorage.removeItem("ds-verify"); go("/login");
  };
  const resend = async () => { setErr(""); const r = await post("/auth/resend-otp", { username: username.trim() }); if (r.success) { toast(r.message, "success"); startCool(); } else setErr(r.message); };
  return (
    <Shell>
      <div className="auth-card glass neon">
        <h2>Verify your email 📬</h2><p className="sub">We sent a 6-digit code to your inbox. It is valid for <b>10 minutes</b>.</p>
        {err && <div className="alert error">{err}</div>}
        <Field label="Username" value={username} onChange={setUsername} icon="👤" />
        <OtpInput value={otp} onChange={setOtp} />
        <Btn busy={busy} disabled={otp.length < 6 || !username} onClick={verify} className="block">Verify email</Btn>
        <div className="auth-links"><button disabled={cool > 0 || !username} onClick={resend}>{cool > 0 ? `Resend in ${cool}s` : "Resend code"}</button><button onClick={() => go("/login")}>← Back to login</button></div>
      </div>
    </Shell>
  );
}

export function ForgotPasswordPage() {
  const { go } = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cool, startCool] = useCooldown(60);
  const send = async () => { setErr(""); setBusy(true); const r = await post("/auth/forgot-password", { username: username.trim() }); setBusy(false); if (!r.success) return setErr(r.message); toast(r.message, "success"); startCool(); setStep(2); };
  const reset = async () => { setErr(""); setBusy(true); const r = await post("/auth/reset-password", { username: username.trim(), otp, new_password: pw }); setBusy(false); if (!r.success) return setErr(r.message); toast(r.message, "success"); sessionStorage.setItem("ds-prefill", username); go("/login"); };
  return (
    <Shell hero={false}>
      <div className="auth-card glass neon">
        <h2>Reset password 🔑</h2>
        {err && <div className="alert error">{err}</div>}
        {step === 1 ? (<>
          <p className="sub">Enter your username - we will email an OTP to the address on that account.</p>
          <Field label="Username" value={username} onChange={setUsername} icon="👤" autoFocus />
          <Btn busy={busy} disabled={!username} onClick={send} className="block">Send OTP</Btn>
        </>) : (<>
          <p className="sub">Enter the code and choose a new password.</p>
          <OtpInput value={otp} onChange={setOtp} />
          <Field label="New password" type="password" value={pw} onChange={setPw} icon="🔒" hint="10+ chars with upper, lower case & a number" /><Meter value={pw} />
          <Btn busy={busy} disabled={otp.length < 6 || !pw} onClick={reset} className="block">Reset password</Btn>
          <div className="auth-links"><button disabled={cool > 0} onClick={send}>{cool > 0 ? `Resend in ${cool}s` : "Resend code"}</button></div>
        </>)}
        <div className="auth-links"><button onClick={() => go("/login")}>← Back to login</button></div>
      </div>
    </Shell>
  );
}

export function ForgotUsernamePage() {
  const { go } = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [names, setNames] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cool, startCool] = useCooldown(60);
  const send = async () => { setErr(""); setBusy(true); const r = await post("/auth/forgot-username", { email: email.trim() }); setBusy(false); if (!r.success) return setErr(r.message); toast(r.message, "success"); startCool(); setStep(2); };
  const check = async () => { setErr(""); setBusy(true); const r = await post("/auth/forgot-username/verify", { email: email.trim(), otp }); setBusy(false); if (!r.success) return setErr(r.message); setNames(r.usernames); setStep(3); };
  return (
    <Shell hero={false}>
      <div className="auth-card glass neon">
        <h2>Find my username 🔎</h2>
        {err && <div className="alert error">{err}</div>}
        {step === 1 && (<><p className="sub">Enter your email. We will send an OTP - after verifying it you will see every username linked to it.</p><Field label="Email" type="email" value={email} onChange={setEmail} icon="✉️" autoFocus /><Btn busy={busy} disabled={!email} onClick={send} className="block">Send OTP</Btn></>)}
        {step === 2 && (<><p className="sub">Enter the 6-digit code sent to your email (valid 10 minutes).</p><OtpInput value={otp} onChange={setOtp} /><Btn busy={busy} disabled={otp.length < 6} onClick={check} className="block">Show usernames</Btn><div className="auth-links"><button disabled={cool > 0} onClick={send}>{cool > 0 ? `Resend in ${cool}s` : "Resend code"}</button></div></>)}
        {step === 3 && (<><p className="sub">{names.length ? "Tap a username to log in with it:" : "No verified accounts were found for this email."}</p><div className="accounts">{names.map((n) => <button key={n} className="account-pick" onClick={() => { sessionStorage.setItem("ds-prefill", n); go("/login"); }}><span className="avatar">{n[0].toUpperCase()}</span><b>{n}</b></button>)}</div></>)}
        <div className="auth-links"><button onClick={() => go("/login")}>← Back to login</button></div>
      </div>
    </Shell>
  );
}

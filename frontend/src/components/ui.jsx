import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "../router.jsx";

// ---------------------------------------------------------------- toasts
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = "info", ms = 4200) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-3), { id, message, kind }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">{items.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>)}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------------------------------------------------------------- background
export function Aurora({ variant = "" }) {
  return (<div className={`aurora ${variant}`} aria-hidden><i className="b1" /><i className="b2" /><i className="b3" /><i className="grid" /></div>);
}

// ---------------------------------------------------------------- buttons / fields
export function Btn({ kind = "primary", busy, icon, children, className = "", ...p }) {
  return (<button className={`btn ${kind} ${className}`} disabled={busy || p.disabled} {...p}>{busy ? <span className="spin sm" /> : icon}{children}</button>);
}
export function BackBtn({ to, label = "Back" }) {
  const { back } = useRouter();
  return (<button className="back-btn" onClick={() => back(to || "/")}><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>{label}</button>);
}
export function Field({ label, type = "text", value, onChange, hint, error, icon, right, ...p }) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <label className={`field ${error ? "err" : ""}`}>
      <span className="lbl">{label}</span>
      <span className="wrap">
        {icon && <span className="fi">{icon}</span>}
        <input type={isPw && show ? "text" : type} value={value} onChange={(e) => onChange(e.target.value)} {...p} />
        {isPw && <button type="button" className="eye" tabIndex={-1} onClick={() => setShow((s) => !s)} aria-label="Show password">{show ? "🙈" : "👁️"}</button>}
        {right}
      </span>
      {(error || hint) && <small>{error || hint}</small>}
    </label>
  );
}
export function OtpInput({ value, onChange, length = 6 }) {
  const refs = useRef([]);
  const chars = value.padEnd(length, " ").split("");
  const set = (i, ch) => { const a = chars.slice(); a[i] = ch || " "; onChange(a.join("").replace(/\s+$/g, "")); };
  return (
    <div className="otp" onPaste={(e) => { const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length); if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, length - 1)]?.focus(); } }}>
      {chars.map((c, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} inputMode="numeric" maxLength={1} value={c.trim()} autoComplete="one-time-code"
          onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); set(i, d); if (d && i < length - 1) refs.current[i + 1]?.focus(); }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !chars[i].trim() && i > 0) refs.current[i - 1]?.focus(); }} />
      ))}
    </div>
  );
}
export function useCooldown(seconds = 60) {
  const [left, setLeft] = useState(0);
  useEffect(() => { if (left <= 0) return undefined; const t = setTimeout(() => setLeft((l) => l - 1), 1000); return () => clearTimeout(t); }, [left]);
  return [left, () => setLeft(seconds)];
}
export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose?.(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal glass ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
        <header><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Close">✕</button></header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}
export function Confirm({ title, text, confirmLabel = "Confirm", danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind={danger ? "danger" : "primary"} busy={busy} onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); onClose(); }}>{confirmLabel}</Btn></>}>
      <p className="muted">{text}</p>
    </Modal>
  );
}
export const Spinner = ({ label }) => (<div className="center-spin"><span className="spin" />{label && <p className="muted">{label}</p>}</div>);
export function Logo({ size = 40 }) {
  return (<span className="logo"><svg width={size} height={size} viewBox="0 0 48 48"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22e1ff" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs><path d="M24 4 6 14v20l18 10 18-10V14L24 4Z" fill="none" stroke="url(#lg)" strokeWidth="3" strokeLinejoin="round" /><path d="M6 14l18 10 18-10M24 24v20" stroke="url(#lg)" strokeWidth="3" strokeLinejoin="round" fill="none" /></svg><b>Dream<em>Space</em> 3D</b></span>);
}

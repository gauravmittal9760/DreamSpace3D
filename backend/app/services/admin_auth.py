"""Admin identity lives in .env (+ optional overrides the admin sets from the panel, stored hashed in Neon)."""
import os
import time
from datetime import timedelta

from flask import jsonify, session
from functools import wraps

from app.security import check_password, hash_password, safe_equal
from app.services import settings_store as store
from app.timeutil import as_utc, ist_iso, utc_now

MAX_FAILS = 5
LOCK_MINUTES = 15
GATE_TTL = 30 * 60        # seconds the "3 options" page stays valid after login
PANEL_IDLE_TTL = 60 * 60  # idle timeout of the unlocked panel
PANEL_MAX_TTL = 6 * 3600


def env(name, default=""):
    return (os.getenv(name) or default).strip()


def configured():
    return all(env(k) for k in ("ADMIN_USERNAME", "ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_PANEL_PASSWORD"))


def username():
    return env("ADMIN_USERNAME")


def email():
    return (store.get("admin_email") or env("ADMIN_EMAIL")).lower()


def matches_username(identifier):
    return bool(configured() and identifier and identifier.strip().lower() == username().lower())


def matches_email(identifier):
    return bool(configured() and identifier and identifier.strip().lower() == email())


def _check(kind, plain_env_name, supplied):
    stored = store.get(kind)
    if stored:
        return check_password(stored, supplied)
    return safe_equal(env(plain_env_name), supplied if isinstance(supplied, str) else "")


def check_login_password(pw):
    return _check("admin_password_hash", "ADMIN_PASSWORD", pw)


def check_panel_password(pw):
    return _check("admin_panel_password_hash", "ADMIN_PANEL_PASSWORD", pw)


def set_login_password(new_pw):
    store.put("admin_password_hash", hash_password(new_pw))


def set_panel_password(new_pw):
    store.put("admin_panel_password_hash", hash_password(new_pw))


def set_email(new_email):
    store.put("admin_email", new_email.strip().lower())


def security_question():
    return env("ADMIN_SECURITY_QUESTION")


def check_security_answer(ans):
    norm = lambda s: " ".join((s or "").strip().lower().split())
    return bool(env("ADMIN_SECURITY_ANSWER")) and safe_equal(norm(env("ADMIN_SECURITY_ANSWER")), norm(ans))


# ---------------- lockouts (5 wrong -> 15 min) ----------------

def lock_status(kind):
    """Returns (locked: bool, seconds_left: int)"""
    st = store.get_json(f"lock:{kind}", {}) or {}
    until = st.get("until")
    if until:
        from datetime import datetime
        left = (datetime.fromisoformat(until) - utc_now()).total_seconds()
        if left > 0:
            return True, int(left) + 1
    return False, 0


def register_failure(kind):
    st = store.get_json(f"lock:{kind}", {}) or {}
    locked, _ = lock_status(kind)
    n = 0 if (st.get("until") and not locked) else int(st.get("n", 0))
    n += 1
    if n >= MAX_FAILS:
        store.put_json(f"lock:{kind}", {"n": 0, "until": (utc_now() + timedelta(minutes=LOCK_MINUTES)).isoformat()})
        return True, MAX_FAILS - n
    store.put_json(f"lock:{kind}", {"n": n})
    return False, MAX_FAILS - n


def clear_failures(kind):
    store.remove(f"lock:{kind}")


# ---------------- session stages ----------------

def open_gate():
    for k in ("user_id", "pending_2fa_user_id", "pending_2fa_at"):
        session.pop(k, None)
    session["admin_gate"] = time.time()
    session.pop("admin_unlocked", None)
    session.permanent = False


def gate_ok():
    t = session.get("admin_gate")
    return bool(t and time.time() - t < GATE_TTL) or panel_ok()


def panel_ok():
    t, born, last = session.get("admin_unlocked"), session.get("admin_born"), session.get("admin_last")
    if not (t and born and last):
        return False
    now = time.time()
    if now - last > PANEL_IDLE_TTL or now - born > PANEL_MAX_TTL:
        clear()
        return False
    session["admin_last"] = now
    return True


def unlock():
    now = time.time()
    session["admin_unlocked"] = now
    session["admin_born"] = now
    session["admin_last"] = now


def clear():
    for k in ("admin_gate", "admin_unlocked", "admin_born", "admin_last", "admin_recovery_stage", "admin_recovery_at"):
        session.pop(k, None)


def admin_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if not panel_ok():
            return jsonify({"success": False, "message": "Admin session expired. Please sign in again.", "admin_expired": True}), 401
        return fn(*a, **kw)
    return wrapper

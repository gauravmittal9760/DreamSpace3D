import re
import time
from datetime import timedelta

from flask import Blueprint, jsonify, session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.project import Project
from app.models.user import User
from app.routes.common import (PASSWORD_RULE, USERNAME_RULE, body, current_user, fail, find_user_by_username, ok,
                               valid_email, valid_password, valid_username)
from app.security import check_password, hash_password
from app.services import admin_auth, cloud
from app.services.activity import log_event
from app.services.otp_email_service import send_verification_otp, verify_email_otp
from app.timeutil import as_utc, utc_now

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

PENDING_2FA_TIMEOUT = 5 * 60
MAX_FAILS = 5
LOCK_MINUTES = 15
MAX_ACCOUNTS_PER_EMAIL = 10


def reply(payload, status=200):
    return jsonify(payload), status


def send_otp_safely(email, purpose, user_id=None):
    try:
        return send_verification_otp(email=email, purpose=purpose, user_id=user_id)
    except Exception:
        return False, "Unable to send OTP right now. Please try again later."


def otp_status(msg):
    return 429 if "wait" in msg.lower() else 502


def six_digits(v):
    return bool(re.fullmatch(r"\d{6}", v or ""))


def lock_minutes_left(user):
    if user.locked_until and as_utc(user.locked_until) > utc_now():
        return int((as_utc(user.locked_until) - utc_now()).total_seconds() // 60) + 1
    return 0


def register_failed_login(user):
    """5 wrong passwords -> account locked for 15 minutes."""
    user.failed_login_count = (user.failed_login_count or 0) + 1
    if user.failed_login_count >= MAX_FAILS:
        user.failed_login_count = 0
        user.locked_until = utc_now() + timedelta(minutes=LOCK_MINUTES)
        db.session.commit()
        log_event("account_locked", user, f"Locked {LOCK_MINUTES} min after {MAX_FAILS} wrong passwords", actor="system")
        return True, 0
    db.session.commit()
    return False, MAX_FAILS - user.failed_login_count


def finish_login(user):
    session.permanent = True
    session["user_id"] = user.id
    user.last_login_at = utc_now()
    user.login_count = (user.login_count or 0) + 1
    user.failed_login_count = 0
    user.locked_until = None
    db.session.commit()
    log_event("login", user)
    return reply(ok(requires_2fa=False, message="Login successful.", user=user.to_dict()))


def pending_2fa_user():
    uid, at = session.get("pending_2fa_user_id"), session.get("pending_2fa_at")
    if not uid or not at:
        return None
    if time.time() - at > PENDING_2FA_TIMEOUT:
        session.pop("pending_2fa_user_id", None)
        session.pop("pending_2fa_at", None)
        return None
    user = db.session.get(User, uid)
    if not user or not user.is_email_verified or not user.is_2fa_enabled or user.is_blocked:
        session.pop("pending_2fa_user_id", None)
        session.pop("pending_2fa_at", None)
        return None
    return user


# ------------------------------------------------------------------ SIGNUP / VERIFY

def purge_stale_unverified():
    cutoff = utc_now() - timedelta(hours=24)
    stale = User.query.filter(User.is_email_verified.is_(False), User.created_at < cutoff).all()
    for u in stale:
        db.session.delete(u)
    if stale:
        db.session.commit()


@auth_bp.post("/signup")
def signup():
    d = body()
    username = str(d.get("username", "")).strip()
    email = str(d.get("email", "")).strip().lower()
    password = d.get("password", "")
    if not valid_username(username):
        return reply(fail(USERNAME_RULE), 400)
    if not valid_email(email):
        return reply(fail("Please enter a valid email address."), 400)
    if not valid_password(password):
        return reply(fail(PASSWORD_RULE), 400)
    if admin_auth.matches_username(username):
        return reply(fail("This username is reserved. Please choose another."), 409)

    try:
        purge_stale_unverified()
    except Exception:
        db.session.rollback()

    existing = find_user_by_username(username)
    if existing:
        # an abandoned, never-verified signup should not block the name forever
        if not existing.is_email_verified and as_utc(existing.created_at) < utc_now() - timedelta(minutes=30):
            db.session.delete(existing)
            db.session.commit()
        else:
            return reply(fail("This username is already registered. Please choose another."), 409)
    if User.query.filter_by(email=email).count() >= MAX_ACCOUNTS_PER_EMAIL:
        return reply(fail(f"Maximum {MAX_ACCOUNTS_PER_EMAIL} accounts are allowed per email address."), 409)

    try:
        user = User(username=username, email=email, password_hash=hash_password(password))
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return reply(fail("This username is already registered. Please choose another."), 409)
    except Exception:
        db.session.rollback()
        return reply(fail("Unable to create your account right now."), 500)

    log_event("signup", user, "Account created (email not yet verified)")
    sent, _ = send_otp_safely(email, "signup", user.id)
    return reply(ok(username=user.username, email_sent=sent, message=(
        "Account created. Please check your email for the verification OTP." if sent else
        "Account created, but the OTP email could not be sent. You can request another OTP.")), 201)


@auth_bp.post("/verify-email")
def verify_email():
    d = body()
    username, otp = str(d.get("username", "")).strip(), str(d.get("otp", "")).strip()
    if not valid_username(username):
        return reply(fail("Please enter a valid username."), 400)
    if not six_digits(otp):
        return reply(fail("Please enter a valid 6-digit OTP."), 400)
    user = find_user_by_username(username)
    if not user:
        return reply(fail("Unable to verify this account. Check the username."), 400)
    if user.is_email_verified:
        return reply(ok(message="This account is already verified."))
    verified, message = verify_email_otp(user.email, otp, "signup", user_id=user.id)
    if not verified:
        return reply(fail(message), 400)
    user.is_email_verified = True
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return reply(fail("Email verification could not be completed."), 500)
    log_event("email_verified", user)
    return reply(ok(message="Email verified successfully. You can now log in."))


@auth_bp.post("/resend-otp")
def resend_otp():
    username = str(body().get("username", "")).strip()
    if not valid_username(username):
        return reply(fail("Please enter a valid username."), 400)
    user = find_user_by_username(username)
    if not user or user.is_email_verified:
        return reply(fail("Account not found or already verified."), 400)
    sent, message = send_otp_safely(user.email, "signup", user.id)
    if not sent:
        return reply(fail(message), otp_status(message))
    return reply(ok(message="A new verification OTP has been sent.", email=mask_email(user.email)))


def mask_email(email):
    name, _, dom = email.partition("@")
    return f"{name[:2]}{'*' * max(1, len(name) - 2)}@{dom}"


# ------------------------------------------------------------------ LOGIN (email OR username)

@auth_bp.post("/login")
def login():
    d = body()
    identifier = str(d.get("identifier") or d.get("username") or "").strip()
    password = d.get("password", "")
    session.clear()
    if not identifier or not isinstance(password, str) or not password or len(identifier) > 255:
        return reply(fail("Enter your email or username and your password."), 400)

    # ---- the administrator (credentials come from .env) ----
    if admin_auth.matches_username(identifier):
        locked, left = admin_auth.lock_status("login")
        if locked:
            return reply(fail(f"Too many wrong attempts. Try again in {left // 60 + 1} minute(s)."), 423)
        if admin_auth.check_login_password(password):
            admin_auth.clear_failures("login")
            admin_auth.open_gate()
            log_event("admin_login", username=admin_auth.username(), actor="admin", detail="Admin credentials accepted")
            return reply(ok(admin_gate=True, message="Admin credentials accepted."))
        now_locked, remaining = admin_auth.register_failure("login")
        log_event("login_failed", username=identifier, actor="admin", detail="Wrong admin password")
        if now_locked:
            return reply(fail(f"Too many wrong attempts. Locked for {admin_auth.LOCK_MINUTES} minutes."), 423)
        return reply(fail(f"Invalid credentials. {remaining} attempt(s) left."), 401)
    if admin_auth.matches_email(identifier) and admin_auth.check_login_password(password):
        admin_auth.open_gate()
        log_event("admin_login", username=admin_auth.username(), actor="admin", detail="Admin signed in with e-mail")
        return reply(ok(admin_gate=True, message="Admin credentials accepted."))

    # ---- normal users ----
    by_email = "@" in identifier
    if by_email:
        candidates = User.query.filter(func.lower(User.email) == identifier.lower()).order_by(User.created_at).all()
    else:
        u = find_user_by_username(identifier)
        candidates = [u] if u else []

    if not candidates:
        check_password("$none", password)  # keep timing similar
        return reply(fail("Invalid email/username or password."), 401)

    unlocked = [u for u in candidates if not lock_minutes_left(u)]
    if not unlocked:
        mins = max(lock_minutes_left(u) for u in candidates)
        return reply(fail(f"Too many wrong attempts. This account is locked for another {mins} minute(s).", locked=True), 423)

    matched = [u for u in unlocked if check_password(u.password_hash, password)]
    if not matched:
        any_locked, remaining = False, MAX_FAILS
        for u in unlocked:
            lk, rem = register_failed_login(u)
            any_locked, remaining = any_locked or lk, min(remaining, rem)
        log_event("login_failed", candidates[0], "Wrong password" + (" (e-mail login)" if by_email else ""), actor="system")
        if any_locked:
            return reply(fail(f"Too many wrong attempts. Account locked for {LOCK_MINUTES} minutes.", locked=True), 423)
        return reply(fail(f"Invalid email/username or password. {remaining} attempt(s) left before a {LOCK_MINUTES}-minute lock."), 401)

    if len(matched) > 1:  # same e-mail + same password on several accounts -> let the person choose
        return reply(ok(choose_account=True, accounts=[u.username for u in matched],
                        message="Several accounts use this email and password. Choose one."))

    user = matched[0]
    if user.is_blocked:
        return reply(fail("Your account has been blocked by the administrator." + (f" Reason: {user.blocked_reason}" if user.blocked_reason else ""), blocked=True), 403)
    if not user.is_email_verified:
        return reply(fail("Please verify your email before logging in.", needs_verification=True, username=user.username), 403)

    if user.is_2fa_enabled:
        sent, message = send_otp_safely(user.email, "login_2fa", user.id)
        if not sent:
            return reply(fail(message), otp_status(message))
        session["pending_2fa_user_id"] = user.id
        session["pending_2fa_at"] = time.time()
        return reply(ok(requires_2fa=True, message="Login OTP sent to your registered email address.", email=mask_email(user.email)))
    return finish_login(user)


@auth_bp.post("/verify-login-2fa")
def verify_login_2fa():
    otp = str(body().get("otp", "")).strip()
    if not six_digits(otp):
        return reply(fail("Please enter a valid 6-digit OTP."), 400)
    user = pending_2fa_user()
    if not user:
        return reply(fail("Your login verification session has expired. Please log in again."), 401)
    verified, message = verify_email_otp(user.email, otp, "login_2fa", user_id=user.id)
    if not verified:
        return reply(fail(message), 400)
    session.pop("pending_2fa_user_id", None)
    session.pop("pending_2fa_at", None)
    return finish_login(user)


@auth_bp.post("/resend-login-2fa")
def resend_login_2fa():
    user = pending_2fa_user()
    if not user:
        return reply(fail("Your login verification session has expired. Please log in again."), 401)
    sent, message = send_otp_safely(user.email, "login_2fa", user.id)
    if not sent:
        return reply(fail(message), otp_status(message))
    return reply(ok(message="A new login OTP has been sent."))


# ------------------------------------------------------------------ FORGOT USERNAME / PASSWORD

@auth_bp.post("/forgot-username")
def forgot_username():
    email = str(body().get("email", "")).strip().lower()
    if not valid_email(email):
        return reply(fail("Please enter a valid email address."), 400)
    if User.query.filter(func.lower(User.email) == email, User.is_email_verified.is_(True)).first():
        sent, message = send_otp_safely(email, "forgot_username", None)
        if not sent:
            return reply(fail(message), otp_status(message))
    return reply(ok(message="If verified accounts exist for this email, a username verification OTP has been sent."))


@auth_bp.post("/forgot-username/verify")
def verify_forgot_username():
    d = body()
    email, otp = str(d.get("email", "")).strip().lower(), str(d.get("otp", "")).strip()
    if not valid_email(email):
        return reply(fail("Please enter a valid email address."), 400)
    if not six_digits(otp):
        return reply(fail("Please enter a valid 6-digit OTP."), 400)
    verified, message = verify_email_otp(email, otp, "forgot_username", user_id=None)
    if not verified:
        return reply(fail(message), 400)
    users = (User.query.filter(func.lower(User.email) == email, User.is_email_verified.is_(True))
             .order_by(User.created_at).all())
    return reply(ok(message="Email verified. Your associated usernames are listed below.", usernames=[u.username for u in users]))


@auth_bp.post("/forgot-password")
def forgot_password():
    username = str(body().get("username", "")).strip()
    if not valid_username(username):
        return reply(fail("Please enter a valid username."), 400)
    user = find_user_by_username(username)
    if user and user.is_email_verified:
        sent, message = send_otp_safely(user.email, "password_reset", user.id)
        if not sent:
            return reply(fail(message), otp_status(message))
    return reply(ok(message="If a verified account exists for this username, a password reset OTP will be sent to its registered email."))


@auth_bp.post("/reset-password")
def reset_password():
    d = body()
    username, otp, new_password = str(d.get("username", "")).strip(), str(d.get("otp", "")).strip(), d.get("new_password", "")
    if not valid_username(username):
        return reply(fail("Please enter a valid username."), 400)
    if not six_digits(otp):
        return reply(fail("Please enter a valid 6-digit OTP."), 400)
    if not valid_password(new_password):
        return reply(fail(PASSWORD_RULE), 400)
    user = find_user_by_username(username)
    if not user or not user.is_email_verified:
        return reply(fail("Invalid or expired password reset request."), 400)
    verified, message = verify_email_otp(user.email, otp, "password_reset", user_id=user.id)
    if not verified:
        return reply(fail(message), 400)
    try:
        user.password_hash = hash_password(new_password)
        user.password_changed_at = utc_now()
        user.failed_login_count, user.locked_until = 0, None
        db.session.commit()
        session.clear()
    except Exception:
        db.session.rollback()
        return reply(fail("Password could not be reset right now."), 500)
    log_event("password_reset", user, "Password reset with e-mail OTP")
    return reply(ok(message="Password reset successfully. You can now log in."))


# ------------------------------------------------------------------ 2FA

def need_user():
    user = current_user()
    return user, (None if user else reply(fail("Please log in first."), 401))


@auth_bp.post("/2fa/request-enable")
def request_enable_2fa():
    user, err = need_user()
    if err: return err
    if user.is_2fa_enabled:
        return reply(ok(message="Two-factor authentication is already enabled."))
    sent, message = send_otp_safely(user.email, "enable_2fa", user.id)
    if not sent:
        return reply(fail(message), otp_status(message))
    return reply(ok(message="An OTP has been sent to verify your request to enable 2FA."))


@auth_bp.post("/2fa/verify-enable")
def verify_enable_2fa():
    user, err = need_user()
    if err: return err
    if user.is_2fa_enabled:
        return reply(ok(message="Two-factor authentication is already enabled.", user=user.to_dict()))
    otp = str(body().get("otp", "")).strip()
    if not six_digits(otp):
        return reply(fail("Please enter a valid 6-digit OTP."), 400)
    verified, message = verify_email_otp(user.email, otp, "enable_2fa", user_id=user.id)
    if not verified:
        return reply(fail(message), 400)
    user.is_2fa_enabled = True
    db.session.commit()
    log_event("2fa_enabled", user)
    return reply(ok(message="Two-factor authentication enabled. Login OTPs are now required.", user=user.to_dict()))


@auth_bp.post("/2fa/disable")
def disable_2fa():
    user, err = need_user()
    if err: return err
    if not check_password(user.password_hash, body().get("password", "")):
        return reply(fail("Your current password is incorrect."), 401)
    user.is_2fa_enabled = False
    db.session.commit()
    log_event("2fa_disabled", user)
    return reply(ok(message="Two-factor authentication disabled.", user=user.to_dict()))


# ------------------------------------------------------------------ ACCOUNT SETTINGS

@auth_bp.post("/account/change-password")
def change_password():
    user, err = need_user()
    if err: return err
    d = body()
    if not check_password(user.password_hash, d.get("current_password", "")):
        return reply(fail("Your current password is incorrect."), 401)
    if not valid_password(d.get("new_password", "")):
        return reply(fail(PASSWORD_RULE), 400)
    user.password_hash = hash_password(d["new_password"])
    user.password_changed_at = utc_now()
    db.session.commit()
    log_event("password_changed", user, "Changed from account settings")
    return reply(ok(message="Password changed successfully."))


@auth_bp.post("/account/change-email/request")
def change_email_request():
    user, err = need_user()
    if err: return err
    d = body()
    new_email = str(d.get("new_email", "")).strip().lower()
    if not valid_email(new_email):
        return reply(fail("Please enter a valid email address."), 400)
    if new_email == user.email:
        return reply(fail("This is already your email address."), 400)
    if not check_password(user.password_hash, d.get("password", "")):
        return reply(fail("Your password is incorrect."), 401)
    sent, message = send_otp_safely(new_email, "change_email", user.id)
    if not sent:
        return reply(fail(message), otp_status(message))
    session["pending_email"] = new_email
    return reply(ok(message=f"An OTP was sent to {mask_email(new_email)}."))


@auth_bp.post("/account/change-email/confirm")
def change_email_confirm():
    user, err = need_user()
    if err: return err
    new_email, otp = session.get("pending_email"), str(body().get("otp", "")).strip()
    if not new_email:
        return reply(fail("Start the email change again."), 400)
    if not six_digits(otp):
        return reply(fail("Please enter a valid 6-digit OTP."), 400)
    verified, message = verify_email_otp(new_email, otp, "change_email", user_id=user.id)
    if not verified:
        return reply(fail(message), 400)
    old = user.email
    user.email, user.is_email_verified = new_email, True
    db.session.commit()
    session.pop("pending_email", None)
    log_event("email_change", user, f"{old} -> {new_email}")
    return reply(ok(message="Email updated.", user=user.to_dict()))


@auth_bp.post("/account/delete")
def delete_account():
    user, err = need_user()
    if err: return err
    if not check_password(user.password_hash, body().get("password", "")):
        return reply(fail("Your password is incorrect."), 401)
    uid, uname, mail, n = user.id, user.username, user.email, len(user.projects)
    cloud.delete_user_thumbnails(uid)
    db.session.delete(user)
    db.session.commit()
    session.clear()
    log_event("account_deleted", username=uname, email=mail, user_id=uid, detail=f"Deleted by owner with {n} project(s)")
    return reply(ok(message="Your account and all its projects were deleted."))


@auth_bp.post("/logout")
def logout():
    uid = session.get("user_id")
    session.clear()
    if uid:
        log_event("logout", user_id=uid, commit=True)
    return reply(ok(message="Logged out successfully."))


@auth_bp.get("/me")
def me():
    uid = session.get("user_id")
    if session.get("admin_gate") or session.get("admin_unlocked"):
        return reply(fail("Admin session.", admin=True), 401)
    if not uid:
        return reply(fail("Please log in first."), 401)
    user = db.session.get(User, uid)
    if not user:
        session.clear()
        return reply(fail("Please log in first."), 401)
    if user.is_blocked:
        session.clear()
        return reply(fail("Your account has been blocked by the administrator.", blocked=True), 403)
    return reply(ok(user=user.to_dict(), projects_count=Project.query.filter_by(user_id=user.id).count()))

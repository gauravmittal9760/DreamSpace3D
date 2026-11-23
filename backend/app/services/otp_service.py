import hashlib
import hmac
import os
import secrets
from datetime import timedelta

from app import db
from app.models.otp import OTPVerification
from app.timeutil import as_utc, utc_now

OTP_EXPIRY_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

ALLOWED_OTP_PURPOSES = {
    "signup", "login_2fa", "enable_2fa", "password_reset",
    "admin_recovery", "forgot_username", "change_email", "admin_email",
}


def _hash_otp(otp, email, purpose):
    secret = os.getenv("SECRET_KEY")
    if not secret:
        raise RuntimeError("SECRET_KEY is not configured.")
    msg = f"dreamspace-otp:{purpose}:{email}:{otp}".encode()
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()


def generate_otp():
    return f"{secrets.randbelow(1000000):06d}"


def _find_active_otp(email, purpose, user_id):
    return (OTPVerification.query
            .filter_by(email=email, purpose=purpose, user_id=user_id, is_used=False)
            .order_by(OTPVerification.created_at.desc()).first())


def create_otp(email, purpose, user_id=None):
    email = (email or "").strip().lower()
    if not email:
        return False, "Email address is required.", None
    if purpose not in ALLOWED_OTP_PURPOSES:
        return False, "Invalid OTP purpose.", None
    now = utc_now()
    try:
        # cooldown is per e-mail + purpose (NOT per account) so several accounts on one address cannot be used to spam it
        latest = (OTPVerification.query.filter_by(email=email, purpose=purpose)
                  .order_by(OTPVerification.last_sent_at.desc()).first())
        if latest:
            elapsed = (now - as_utc(latest.last_sent_at)).total_seconds()
            if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                remaining = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed) + 1
                return False, f"Please wait {remaining} seconds before requesting another OTP.", None
        existing = _find_active_otp(email, purpose, user_id)
        if existing:
            existing.is_used = True

        otp = generate_otp()
        db.session.add(OTPVerification(
            user_id=user_id, email=email, purpose=purpose,
            otp_hash=_hash_otp(otp, email, purpose),
            expires_at=now + timedelta(minutes=OTP_EXPIRY_MINUTES),
            attempts=0, last_sent_at=now, is_used=False,
        ))
        db.session.commit()
        return True, "OTP created successfully.", otp
    except Exception:
        db.session.rollback()
        return False, "Unable to create OTP. Please try again.", None


def cancel_otp(email, purpose, user_id=None):
    """Used when the e-mail could not be delivered, so the user is not stuck in the cooldown."""
    try:
        rec = _find_active_otp((email or "").strip().lower(), purpose, user_id)
        if rec:
            rec.is_used = True
            rec.last_sent_at = utc_now() - timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS * 2)  # lifts the cooldown
            db.session.commit()
    except Exception:
        db.session.rollback()


def verify_otp(email, purpose, submitted_otp, user_id=None):
    email = (email or "").strip().lower()
    submitted_otp = str(submitted_otp or "").strip()
    if not email or not submitted_otp:
        return False, "Email and OTP are required."
    if purpose not in ALLOWED_OTP_PURPOSES:
        return False, "Invalid OTP purpose."
    if not submitted_otp.isdigit() or len(submitted_otp) != 6:
        return False, "Please enter a valid 6-digit OTP."
    try:
        rec = _find_active_otp(email, purpose, user_id)
        if not rec:
            return False, "OTP not found. Please request a new OTP."
        if rec.is_expired():
            rec.is_used = True
            db.session.commit()
            return False, "OTP has expired. Please request a new one."
        if rec.attempts >= OTP_MAX_ATTEMPTS:
            rec.is_used = True
            db.session.commit()
            return False, "Maximum verification attempts reached. Request a new OTP."
        rec.attempts += 1
        if not hmac.compare_digest(rec.otp_hash, _hash_otp(submitted_otp, email, purpose)):
            if rec.attempts >= OTP_MAX_ATTEMPTS:
                rec.is_used = True
            db.session.commit()
            return False, "Incorrect OTP."
        rec.is_used = True
        db.session.commit()
        return True, "OTP verified successfully."
    except Exception:
        db.session.rollback()
        return False, "Unable to verify OTP. Please try again."

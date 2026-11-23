import logging

from app import db
from app.models.misc import ActivityLog

log = logging.getLogger("dreamspace")

# Human-friendly names for the admin panel (frontend mirrors this list).
EVENTS = [
    "signup", "email_verified", "login", "login_failed", "account_locked", "logout",
    "password_changed", "password_reset", "email_change", "account_deleted",
    "2fa_enabled", "2fa_disabled", "project_created", "project_deleted",
    "admin_login", "admin_unlock", "admin_action", "admin_settings", "backup", "restore", "error",
]


def log_event(event, user=None, detail="", actor="user", username=None, email=None, user_id=None, commit=True):
    try:
        entry = ActivityLog(
            event=event,
            user_id=user.id if user is not None else user_id,
            username=(user.username if user is not None else username),
            email=(user.email if user is not None else email),
            detail=(detail or "")[:400],
            actor=actor,
        )
        db.session.add(entry)
        if commit:
            db.session.commit()
    except Exception:
        db.session.rollback()
        log.exception("could not write activity log")

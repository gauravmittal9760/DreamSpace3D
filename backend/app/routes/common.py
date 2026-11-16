import re

from flask import request, session

from app import db
from app.models.user import User
from sqlalchemy import func


def body():
    return request.get_json(silent=True) or {}


def ok(**kw):
    return {"success": True, **kw}


def fail(message, **kw):
    return {"success": False, "message": message, **kw}


def valid_email(email):
    return bool(isinstance(email, str) and 0 < len(email) <= 255 and re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email))


def valid_username(username):
    return bool(isinstance(username, str) and re.fullmatch(r"[A-Za-z0-9_]{3,40}", username))


def valid_password(password):
    if not isinstance(password, str) or not 10 <= len(password) <= 128:
        return False
    return any(c.islower() for c in password) and any(c.isupper() for c in password) and any(c.isdigit() for c in password)


PASSWORD_RULE = "Password must be 10-128 characters and include uppercase, lowercase and a number."
USERNAME_RULE = "Username must be 3-40 characters: letters, numbers or underscores only."


def find_user_by_username(username):
    return User.query.filter(func.lower(User.username) == (username or "").lower()).first()


def current_user():
    """Logged-in, non-blocked user or None."""
    uid = session.get("user_id")
    if not uid:
        return None
    user = db.session.get(User, uid)
    if not user or user.is_blocked:
        session.pop("user_id", None)
        return None
    return user

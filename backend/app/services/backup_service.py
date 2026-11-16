import json
import logging
import secrets

from app import db
from app.models.misc import Backup
from app.models.project import Project
from app.models.user import User
from app.services import cloud
from app.timeutil import as_utc, ist_iso, ist_now, utc_now

log = logging.getLogger("dreamspace")
FORMAT = "dreamspace-backup-v2"


def _user_block(user):
    return {
        "username": user.username, "email": user.email, "password_hash": user.password_hash,
        "is_email_verified": user.is_email_verified, "is_2fa_enabled": user.is_2fa_enabled,
        "is_blocked": bool(user.is_blocked), "created_at": ist_iso(user.created_at),
        "last_login_at": ist_iso(user.last_login_at),
        "projects": [
            {"name": p.name, "description": p.description, "project_data": p.project_data,
             "created_at": ist_iso(p.created_at), "updated_at": ist_iso(p.updated_at)}
            for p in user.projects
        ],
    }


def create_backup(scope, user_id=None):
    if scope == "user":
        user = db.session.get(User, user_id)
        if not user:
            raise ValueError("User not found.")
        users, label = [user], f"User backup - {user.username}"
    else:
        users, label = User.query.order_by(User.id).all(), "Full app backup"

    payload = {"format": FORMAT, "scope": scope, "created_at_ist": ist_iso(utc_now()), "users": [_user_block(u) for u in users]}
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    stamp = ist_now().strftime("%Y%m%d-%H%M%S")
    pid = f"{scope}-{(user_id or 'all')}-{stamp}-{secrets.token_hex(3)}"
    cloud_id = None
    try:
        cloud_id = cloud.upload_backup(pid, raw)
    except Exception:
        log.exception("backup upload to Cloudinary failed")
    row = Backup(scope=scope, user_id=user_id if scope == "user" else None, label=label, public_id=cloud_id,
                 size_bytes=len(raw), users_count=len(users),
                 projects_count=sum(len(u.projects) for u in users))
    db.session.add(row)
    db.session.commit()
    return row, raw


def load_backup_bytes(row):
    if not row.public_id:
        raise ValueError("This backup was not stored in Cloudinary.")
    return cloud.fetch_backup(row.public_id)


def restore(raw):
    """Merge-restore: never overwrites existing accounts, only re-creates what is missing."""
    data = json.loads(raw)
    if data.get("format") != FORMAT:
        raise ValueError("Unknown backup format.")
    users_new = projects_new = 0
    for ub in data.get("users", []):
        user = (
            User.query.filter(User.username.ilike(ub["username"])).first())
        if not user:
            user = User(username=ub["username"], email=ub["email"], password_hash=ub["password_hash"],
                        is_email_verified=ub.get("is_email_verified", True),
                        is_2fa_enabled=ub.get("is_2fa_enabled", False), is_blocked=ub.get("is_blocked", False))
            db.session.add(user)
            db.session.flush()
            users_new += 1
        have = {(p.name, json.dumps(p.project_data, sort_keys=True)) for p in user.projects}
        for pb in ub.get("projects", []):
            sig = (pb["name"], json.dumps(pb["project_data"], sort_keys=True))
            if sig in have:
                continue
            db.session.add(Project(user_id=user.id, name=pb["name"], description=pb.get("description"),
                                   project_data=pb["project_data"]))
            projects_new += 1
    db.session.commit()
    return {"users_restored": users_new, "projects_restored": projects_new}

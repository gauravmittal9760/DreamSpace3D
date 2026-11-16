from app import db
from app.timeutil import ist_iso, utc_now


class ActivityLog(db.Model):
    """Audit trail: signups, logins, deletions, password/email changes, admin actions ..."""
    __tablename__ = "activity_logs"

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, index=True)
    event = db.Column(db.String(40), nullable=False, index=True)
    # No FK on purpose: the log must survive account deletion.
    user_id = db.Column(db.Integer, nullable=True, index=True)
    username = db.Column(db.String(40), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    detail = db.Column(db.String(400), nullable=True)
    actor = db.Column(db.String(12), nullable=False, default="user")

    def to_dict(self):
        return {
            "id": self.id, "at": ist_iso(self.created_at), "event": self.event,
            "user_id": self.user_id, "username": self.username, "email": self.email,
            "detail": self.detail, "actor": self.actor,
        }


class AppSetting(db.Model):
    """Small key/value store (admin overrides, price overrides, lockout counters)."""
    __tablename__ = "app_settings"

    key = db.Column(db.String(80), primary_key=True)
    value = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class Backup(db.Model):
    __tablename__ = "backups"

    id = db.Column(db.Integer, primary_key=True)
    scope = db.Column(db.String(10), nullable=False)  # "user" | "full"
    user_id = db.Column(db.Integer, nullable=True)
    label = db.Column(db.String(160), nullable=False)
    public_id = db.Column(db.String(300), nullable=True)
    size_bytes = db.Column(db.Integer, nullable=False, default=0)
    users_count = db.Column(db.Integer, nullable=False, default=0)
    projects_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    def to_dict(self):
        return {
            "id": self.id, "scope": self.scope, "user_id": self.user_id, "label": self.label,
            "size_bytes": self.size_bytes, "users_count": self.users_count,
            "projects_count": self.projects_count, "created_at": ist_iso(self.created_at),
            "stored_in_cloud": bool(self.public_id),
        }

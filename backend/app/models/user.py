from app import db
from app.timeutil import ist_iso, utc_now


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(40), unique=True, nullable=False, index=True)
    # Email is intentionally NOT unique: one email can own many accounts.
    email = db.Column(db.String(255), nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    is_email_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_2fa_enabled = db.Column(db.Boolean, default=False, nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    last_login_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # --- v2 columns (added automatically by app.schema.sync) ---
    login_count = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    failed_login_count = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    locked_until = db.Column(db.DateTime(timezone=True), nullable=True)
    is_blocked = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    blocked_reason = db.Column(db.String(200), nullable=True)
    password_changed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    # bumped on password change/reset: every other device/session is signed out
    session_version = db.Column(db.Integer, nullable=False, default=0, server_default="0")

    projects = db.relationship("Project", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "is_email_verified": self.is_email_verified,
            "is_2fa_enabled": self.is_2fa_enabled,
            "created_at": ist_iso(self.created_at),
            "last_login_at": ist_iso(self.last_login_at),
        }

    def admin_dict(self, projects_count=0):
        d = self.to_dict()
        d.update({
            "is_blocked": bool(self.is_blocked),
            "blocked_reason": self.blocked_reason,
            "login_count": self.login_count or 0,
            "failed_login_count": self.failed_login_count or 0,
            "locked_until": ist_iso(self.locked_until),
            "password_changed_at": ist_iso(self.password_changed_at),
            "projects_count": projects_count,
        })
        return d

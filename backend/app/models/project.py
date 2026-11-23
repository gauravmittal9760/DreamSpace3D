from app import db
from app.timeutil import ist_iso, utc_now


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    # Lives inside Neon (Postgres JSON column) - no local json/sqlite files are ever used.
    project_data = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # --- v2 columns ---
    thumbnail_url = db.Column(db.String(500), nullable=True)
    share_token = db.Column(db.String(40), nullable=True, unique=True, index=True)
    share_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    share_password_hash = db.Column(db.String(255), nullable=True)

    user = db.relationship("User", back_populates="projects")

    def stats(self):
        data = self.project_data or {}
        floors = data.get("floors") or []
        rooms = [r for f in floors for r in (f.get("rooms") or [])]
        items = sum(len(r.get("objects") or []) for r in rooms)
        return {"floors": len(floors), "rooms": len(rooms), "items": items}

    def summary(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "thumbnail_url": self.thumbnail_url,
            "shared": bool(self.share_token),
            "share_token": self.share_token,
            "share_expires_at": ist_iso(self.share_expires_at),
            "share_protected": bool(self.share_password_hash),
            "stats": self.stats(),
            "created_at": ist_iso(self.created_at),
            "updated_at": ist_iso(self.updated_at),
        }

    def to_dict(self):
        d = self.summary()
        d["user_id"] = self.user_id
        d["project_data"] = self.project_data
        return d

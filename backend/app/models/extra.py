from app import db
from app.timeutil import ist_iso, utc_now


class ProjectVersion(db.Model):
    """Time machine: snapshots of a project's scene."""
    __tablename__ = "project_versions"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    number = db.Column(db.Integer, nullable=False, default=1)
    label = db.Column(db.String(120), nullable=True)
    auto = db.Column(db.Boolean, nullable=False, default=True)
    digest = db.Column(db.String(40), nullable=True)
    project_data = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    project = db.relationship("Project", backref=db.backref("versions", lazy=True, cascade="all, delete-orphan"))

    def summary(self):
        d = self.project_data or {}
        rooms = [r for f in d.get("floors") or [] for r in f.get("rooms") or []]
        return {"id": self.id, "number": self.number, "label": self.label, "auto": self.auto, "created_at": ist_iso(self.created_at),
                "floors": len(d.get("floors") or []), "rooms": len(rooms), "items": sum(len(r.get("objects") or []) for r in rooms)}


class ProjectMember(db.Model):
    __tablename__ = "project_members"
    __table_args__ = (db.UniqueConstraint("project_id", "user_id", name="uq_project_member"),)

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = db.Column(db.String(10), nullable=False, default="viewer")  # editor | viewer
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    project = db.relationship("Project", backref=db.backref("members", lazy=True, cascade="all, delete-orphan"))
    user = db.relationship("User", backref=db.backref("memberships", lazy=True, cascade="all, delete-orphan"))


class ProjectComment(db.Model):
    __tablename__ = "project_comments"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = db.Column(db.String(600), nullable=False)
    room_id = db.Column(db.String(60), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    project = db.relationship("Project", backref=db.backref("comments", lazy=True, cascade="all, delete-orphan"))
    user = db.relationship("User", backref=db.backref("comments", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {"id": self.id, "user": self.user.username, "user_id": self.user_id, "body": self.body, "room_id": self.room_id, "at": ist_iso(self.created_at)}


class Product(db.Model):
    """Real purchasable products, managed by the admin; matched to catalogue item types in the Studio."""
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    item_type = db.Column(db.String(30), nullable=False, index=True)  # e.g. "sofa", "wardrobe"
    name = db.Column(db.String(160), nullable=False)
    brand = db.Column(db.String(80), nullable=True)
    price = db.Column(db.Float, nullable=False, default=0)
    material = db.Column(db.String(80), nullable=True)
    width = db.Column(db.Float, nullable=True)
    height = db.Column(db.Float, nullable=True)
    depth = db.Column(db.Float, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    purchase_url = db.Column(db.String(600), nullable=True)
    in_stock = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    def to_dict(self):
        return {"id": self.id, "item_type": self.item_type, "name": self.name, "brand": self.brand, "price": self.price, "material": self.material,
                "dims": [self.width, self.height, self.depth], "image_url": self.image_url, "purchase_url": self.purchase_url, "in_stock": self.in_stock}

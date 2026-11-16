from app import db
from app.timeutil import as_utc, utc_now


class OTPVerification(db.Model):
    __tablename__ = "otp_verifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    purpose = db.Column(db.String(30), nullable=False)
    otp_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    last_sent_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    is_used = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    user = db.relationship("User", backref=db.backref("otp_records", lazy=True, cascade="all, delete-orphan"))

    def is_expired(self):
        return utc_now() >= as_utc(self.expires_at)

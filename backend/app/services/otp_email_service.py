import logging

from app.services.email_service import send_otp_email
from app.services.otp_service import cancel_otp, create_otp, verify_otp

log = logging.getLogger("dreamspace")


def send_verification_otp(email, purpose="signup", user_id=None):
    ok, message, otp = create_otp(email=email, purpose=purpose, user_id=user_id)
    if not ok:
        return False, message
    sent, detail = send_otp_email(recipient_email=email, otp=otp, purpose=purpose, expiry_minutes=10)
    if not sent:
        log.warning("OTP email failed (%s): %s", purpose, detail)
        cancel_otp(email, purpose, user_id)  # don't make the user wait 60s for a mail that never left
        return False, "Unable to send OTP email. Please try again later."
    return True, "OTP sent successfully to your email."


def verify_email_otp(email, otp, purpose="signup", user_id=None):
    return verify_otp(email=email, purpose=purpose, submitted_otp=otp, user_id=user_id)

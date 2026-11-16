import html
import os

import requests

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

OTP_PURPOSES = {
    "signup": "Email Verification",
    "login_2fa": "Two-Factor Login Verification",
    "enable_2fa": "Enable Two-Factor Authentication",
    "password_reset": "Password Reset",
    "admin_recovery": "Admin Account Recovery",
    "forgot_username": "Forgot Username Verification",
    "change_email": "Confirm Your New Email",
}


def send_otp_email(recipient_email, otp, purpose="signup", expiry_minutes=10):
    api_key = os.getenv("BREVO_API_KEY")
    sender_email = os.getenv("MAIL_DEFAULT_SENDER")
    sender_name = os.getenv("MAIL_SENDER_NAME", "DreamSpace 3D")
    if not api_key or not sender_email:
        return False, "Email service is not configured."
    if not recipient_email or not otp:
        return False, "Recipient email or OTP is missing."
    title = OTP_PURPOSES.get(purpose)
    if not title:
        return False, "Invalid email purpose."

    name, code, mins = html.escape(sender_name), html.escape(str(otp)), html.escape(str(expiry_minutes))
    body = f"""<!doctype html><html><body style="margin:0;background:#070b18;font-family:Segoe UI,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:28px 16px;">
 <div style="background:linear-gradient(135deg,#0f1a3a,#1a0f3a);border:1px solid #2a3b7a;border-radius:18px;padding:30px;color:#e8ecff;">
  <div style="font-size:13px;letter-spacing:3px;color:#5ee7ff;text-transform:uppercase;">{name}</div>
  <h2 style="margin:8px 0 4px;font-size:22px;color:#fff;">{html.escape(title)}</h2>
  <p style="color:#a9b4e6;margin:0 0 18px;">Use this one-time code to continue:</p>
  <div style="font-size:38px;letter-spacing:12px;font-weight:700;color:#5ee7ff;background:#0a1230;border:1px dashed #3b5bdb;border-radius:12px;text-align:center;padding:16px 0;">{code}</div>
  <p style="color:#a9b4e6;margin:18px 0 0;font-size:14px;">This code expires in <b>{mins} minutes</b>. If you did not request it, you can safely ignore this email.</p>
 </div></div></body></html>"""
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": recipient_email}],
        "subject": f"{sender_name} - {title}",
        "htmlContent": body,
        "textContent": f"Your {sender_name} OTP is {otp}. It expires in {expiry_minutes} minutes.",
    }
    headers = {"accept": "application/json", "api-key": api_key, "content-type": "application/json"}
    try:
        r = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=20)
        if r.status_code in (200, 201, 202):
            return True, "Email accepted by Brevo."
        try:
            msg = r.json().get("message", "No additional error information.")
        except ValueError:
            msg = "Unreadable error response."
        return False, f"Brevo HTTP {r.status_code}: {str(msg)[:300]}"
    except requests.RequestException as e:
        return False, f"Email connection error: {type(e).__name__}"

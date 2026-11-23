"""End-to-end smoke test. Run:  ALLOW_SQLITE=1 python tests/smoke_test.py   (uses an in-memory DB, no network)."""
import os, sys, json, re
os.environ.update(ALLOW_SQLITE="1", SECRET_KEY="test-secret", ADMIN_USERNAME="boss", ADMIN_EMAIL="boss@example.com",
                  ADMIN_PASSWORD="AdminPass#123", ADMIN_PANEL_PASSWORD="PanelPass#456",
                  ADMIN_SECURITY_QUESTION="Favourite colour?", ADMIN_SECURITY_ANSWER="Neon Blue")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "BREVO_API_KEY"):
    os.environ.pop(k, None)

from app import create_app, db
import app.services.otp_email_service as oes

SENT = []
oes.send_otp_email = lambda recipient_email, otp, purpose, expiry_minutes=10: (SENT.append((recipient_email, purpose, otp)) or (True, "ok"))
from app.models.user import User
from app.models.misc import AppSetting
from app.models.project import Project
from app.models.otp import OTPVerification
from app.timeutil import utc_now
from datetime import timedelta


def age_otps():
    """pretend 2 minutes passed (OTP cooldown is per e-mail + purpose)"""
    with app.app_context():
        for r in OTPVerification.query.all():
            r.last_sent_at = utc_now() - timedelta(minutes=2)
        db.session.commit()


app = create_app()
H = {"X-DS-Client": "web"}
passed = 0


def check(name, cond, extra=""):
    global passed
    if not cond:
        print("FAIL:", name, extra)
        sys.exit(1)
    passed += 1
    print("ok  ", name)


def new_client():
    return app.test_client()


def post(c, url, data=None, method="post"):
    r = getattr(c, method)(url, data=json.dumps(data or {}), content_type="application/json", headers=H)
    return r.status_code, (r.get_json(silent=True) or {})


def last_otp(purpose):
    return [o for (_, p, o) in SENT if p == purpose][-1]


c = new_client()
# csrf guard
r = c.post("/api/auth/login", data="{}", content_type="application/json")
check("csrf header required", r.status_code == 403)

# ---- signup + verify + multi-accounts per email
s, j = post(c, "/api/auth/signup", {"username": "alice", "email": "Alice@Example.com", "password": "Passw0rdAAA"})
check("signup", s == 201 and j["email_sent"], j)
s, j = post(c, "/api/auth/login", {"identifier": "alice", "password": "Passw0rdAAA"})
check("unverified login refused", s == 403 and j.get("needs_verification"))
s, j = post(c, "/api/auth/verify-email", {"username": "alice", "otp": last_otp("signup")})
check("verify email", s == 200, j)
age_otps()
s, j = post(c, "/api/auth/signup", {"username": "alice2", "email": "alice@example.com", "password": "Passw0rdAAA"})
check("2nd account same email", s == 201, j)
post(c, "/api/auth/verify-email", {"username": "alice2", "otp": last_otp("signup")})
s, j = post(c, "/api/auth/signup", {"username": "ALICE", "email": "x@example.com", "password": "Passw0rdAAA"})
check("username unique case-insensitive", s == 409)
s, j = post(c, "/api/auth/signup", {"username": "boss", "email": "x@example.com", "password": "Passw0rdAAA"})
check("admin username reserved", s == 409)

# ---- login by email (two accounts, same password -> choose) and by username
s, j = post(c, "/api/auth/login", {"identifier": "alice@example.com", "password": "Passw0rdAAA"})
check("email login with 2 matching accounts asks to choose", s == 200 and j.get("choose_account") and len(j["accounts"]) == 2, j)
s, j = post(c, "/api/auth/login", {"identifier": "alice2", "password": "Passw0rdAAA"})
check("username login", s == 200 and j["user"]["username"] == "alice2")
check("ist offset in timestamps", j["user"]["last_login_at"].endswith("+05:30"), j["user"]["last_login_at"])
rme = c.get("/api/auth/me")
check("/me", rme.status_code == 200 and rme.get_json()["user"]["username"] == "alice2")

# ---- lockout after 5 wrong passwords
c2 = new_client()
for i in range(4):
    s, j = post(c2, "/api/auth/login", {"identifier": "alice", "password": "wrong"})
    check(f"wrong pw {i+1}", s == 401, j)
s, j = post(c2, "/api/auth/login", {"identifier": "alice", "password": "wrong"})
check("5th wrong locks 15 min", s == 423, j)
s, j = post(c2, "/api/auth/login", {"identifier": "alice", "password": "Passw0rdAAA"})
check("correct pw refused while locked", s == 423)

# ---- projects
scene = {"version": 2, "floors": [{"id": "f1", "name": "Ground", "height": 3, "rooms": [
    {"id": "r1", "name": "Bedroom", "type": "bedroom", "w": 4, "l": 4, "x": 0, "z": 0, "wallColor": "#7aa2f7", "floorColor": "#caa472",
     "objects": [
        {"id": "o1", "key": "bed.b02", "type": "bed", "name": "Queen bed", "x": 0, "z": -1.5, "ry": 0, "dims": [1.6, 0.6, 2.0], "color": "#8b6f47"},
        {"id": "o2", "key": "wardrobe.w01", "type": "wardrobe", "name": "Wardrobe", "x": 1.5, "z": 0, "ry": 270, "dims": [1.6, 2.2, 0.6], "color": "#a07850"},
        {"id": "o3", "key": "door.d01", "type": "door", "wall": "S", "t": 0.8, "dims": [0.9, 2.1, 0.12]}]}]}]}
s, j = post(c, "/api/projects", {"name": "My Home", "project_data": scene})
check("create project", s == 201, j)
pid = j["project"]["id"]
s, j = post(c, f"/api/projects/{pid}", {"name": "My Home v2"}, method="put")
check("update project", s == 200 and j["project"]["name"] == "My Home v2")
s, j = post(c, f"/api/projects/{pid}/share", {"enabled": True})
tok = j["share_token"]
r = new_client().get(f"/api/projects/shared/{tok}")
check("public share link", r.status_code == 200 and r.get_json()["project"]["owner"] == "alice2")
s, j = post(c, f"/api/projects/{pid}/duplicate")
check("duplicate", s == 201)

# ---- AI
s, j = post(c, "/api/ai/recommend", {"room_type": "bedroom", "types": ["bed", "door"]})
check("recommend", s == 200 and j["suggestions"] and j["model"]["prior_rooms"] > 0, j)
print("      top suggestions:", [(x["type"], x["relevance"]) for x in j["suggestions"][:5]])
objs = [{"id": f"i{n}", "type": t, "name": t, "dims": d} for n, (t, d) in enumerate([("bed", [1.6, .5, 2]), ("wardrobe", [1.8, 2.2, .6]), ("bedside", [.5, .5, .4]), ("desk", [1.2, .75, .6]), ("chair", [.5, .9, .5])])]
objs.append({"id": "door", "type": "door", "wall": "S", "t": 1, "dims": [.9, 2.1, .1]})
s, j = post(c, "/api/ai/arrange", {"room": {"w": 4, "l": 4.5}, "objects": objs})
check("arrange", s == 200 and len(j["placements"]) == 5 and j["review"]["score"] > 40, j)
print("      arrange cost:", j["cost"], "score:", j["review"]["score"], "coverage:", j["review"]["coverage_pct"], j["review"]["issues"])
s, j = post(c, "/api/ai/review", {"scene": scene})
check("review", s == 200 and j["palette"]["harmony"]["template"], j)
print("      review overall:", j["overall"], j["palette"]["harmony"], j["palette"]["mood"])

# ---- account settings
s, j = post(c, "/api/auth/account/change-password", {"current_password": "Passw0rdAAA", "new_password": "NewPassw0rdBBB"})
check("change password", s == 200)
s, j = post(c, "/api/auth/account/change-email/request", {"new_email": "new@example.com", "password": "NewPassw0rdBBB"})
check("change email request", s == 200, j)
s, j = post(c, "/api/auth/account/change-email/confirm", {"otp": last_otp("change_email")})
check("change email confirm", s == 200 and j["user"]["email"] == "new@example.com", j)

# ---- forgot username
s, j = post(c2, "/api/auth/forgot-username", {"email": "alice@example.com"})
check("forgot username otp", s == 200)
s, j = post(c2, "/api/auth/forgot-username/verify", {"email": "alice@example.com", "otp": last_otp("forgot_username")})
check("forgot username list", s == 200 and j["usernames"] == ["alice"], j)

# ---- admin
ca = new_client()
s, j = post(ca, "/api/admin/unlock", {"panel_password": "PanelPass#456"})
check("panel locked before login", s == 401)
s, j = post(ca, "/api/auth/login", {"identifier": "boss", "password": "AdminPass#123"})
check("admin login -> gate", s == 200 and j.get("admin_gate"), j)
s, j = post(ca, "/api/admin/unlock", {"panel_password": "wrong"})
check("wrong panel password", s == 401)
r = ca.get("/api/admin/overview")
check("overview requires unlock", r.status_code == 401)
s, j = post(ca, "/api/admin/unlock", {"panel_password": "PanelPass#456"})
check("panel unlock", s == 200, j)
r = ca.get("/api/admin/overview").get_json()
check("overview", r["success"] and r["totals"]["users"] == 2 and r["totals"]["projects"] == 2, r.get("totals"))
print("      forecast:", r["forecast"]["signups"]["direction"], "items:", r["top_items"][:3])
us = ca.get("/api/admin/users").get_json()
check("users list", us["total"] == 2, us["total"])
alice2_row = [u for u in us["users"] if u["username"] == "alice2"][0]
check("last login recorded (IST offset)", alice2_row["last_login_at"] and alice2_row["last_login_at"].endswith("+05:30") and alice2_row["login_count"] >= 1, alice2_row)
uid = [u for u in us["users"] if u["username"] == "alice"][0]["id"]
s, j = post(ca, f"/api/admin/users/{uid}/unblock")
check("unblock clears lock", s == 200 and j["user"]["locked_until"] is None)
s, j = post(ca, f"/api/admin/users/{uid}/block", {"reason": "spam"})
check("block", s == 200 and j["user"]["is_blocked"])
s, j = post(c2, "/api/auth/login", {"identifier": "alice", "password": "Passw0rdAAA"})
check("blocked user refused", s == 403 and j.get("blocked"))
post(ca, f"/api/admin/users/{uid}/unblock")
items = ca.get("/api/admin/items").get_json()
check("item usage", any(i["key"] == "bed.b02" for i in items["items"]))
act = ca.get("/api/admin/activity?event=signup,account_deleted").get_json()
check("activity log", act["total"] >= 2, act["total"])
st = ca.get("/api/admin/storage").get_json()
check("storage", st["success"] and "neon" in st)
s, j = post(ca, "/api/admin/backups", {"scope": "full"})
check("full backup", s == 200 and j["backup"]["projects_count"] == 2, j)
s, j = post(ca, "/api/admin/backups", {"scope": "user", "user_id": uid})
check("user backup", s == 200)
s, j = post(ca, "/api/admin/prices", {"prices": {"bed.b02": 12345}}, method="put")
check("price override", s == 200)
check("public prices", new_client().get("/api/catalog/prices").get_json()["prices"]["bed.b02"] == 12345)
# admin recovery
s, j = post(ca, "/api/admin/recovery/answer", {"answer": "nope"})
check("wrong security answer", s == 401)
s, j = post(ca, "/api/admin/recovery/answer", {"answer": " neon  BLUE "})
check("right security answer sends otp", s == 200 and j["otp_sent"], j)
s, j = post(ca, "/api/admin/recovery/reset", {"target": "login", "new_password": "BrandNewAdmin9", "otp": last_otp("admin_recovery")})
check("admin password reset", s == 200, j)
cb = new_client()
s, j = post(cb, "/api/auth/login", {"identifier": "boss@example.com", "password": "BrandNewAdmin9"})
check("admin login with email + new password", s == 200 and j.get("admin_gate"))
# delete entire app
s, j = post(ca, "/api/admin/danger/delete-app", {"panel_password": "PanelPass#456", "confirm": "nope"})
check("delete app needs phrase", s == 400)
s, j = post(ca, "/api/admin/danger/delete-app", {"panel_password": "PanelPass#456", "confirm": "DELETE ENTIRE APP"})
check("delete entire app", s == 200 and j["users"] == 2, j)
with app.app_context():
    check("db empty after delete-app", User.query.count() == 0 and Project.query.count() == 0)
print(f"\nALL {passed} CHECKS PASSED")

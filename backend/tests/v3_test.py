"""v3 features + bug-fix regression tests.  ALLOW_SQLITE=1 python tests/v3_test.py"""
import os, sys, json
os.environ.update(ALLOW_SQLITE="1", SECRET_KEY="t3", ADMIN_USERNAME="boss", ADMIN_EMAIL="boss@example.com", ADMIN_PASSWORD="AdminPass#123",
                  ADMIN_PANEL_PASSWORD="PanelPass#456", ADMIN_SECURITY_QUESTION="q?", ADMIN_SECURITY_ANSWER="a")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "BREVO_API_KEY"):
    os.environ.pop(k, None)
from datetime import timedelta
from app import create_app, db
import app.services.otp_email_service as oes
SENT = []
oes.send_otp_email = lambda recipient_email, otp, purpose, expiry_minutes=10: (SENT.append((recipient_email, purpose, otp)) or (True, "ok"))
from app.models import OTPVerification, Project
from app.timeutil import utc_now

app = create_app()
H = {"X-DS-Client": "web"}
n = 0


def check(name, cond, extra=""):
    global n
    if not cond:
        print("FAIL:", name, extra); sys.exit(1)
    n += 1; print("ok  ", name)


def call(c, method, url, data=None, headers=None):
    r = getattr(c, method)(url, data=json.dumps(data or {}), content_type="application/json", headers={**H, **(headers or {})})
    return r.status_code, (r.get_json(silent=True) or {})


def otp(purpose): return [o for (_, p, o) in SENT if p == purpose][-1]


def age():
    with app.app_context():
        for r in OTPVerification.query.all(): r.last_sent_at = utc_now() - timedelta(minutes=5)
        db.session.commit()


def mkuser(name, email):
    c = app.test_client(); age()
    s, j = call(c, "post", "/api/auth/signup", {"username": name, "email": email, "password": "Passw0rdAAA"}); assert s == 201, j
    call(c, "post", "/api/auth/verify-email", {"username": name, "otp": otp("signup")})
    s, j = call(c, "post", "/api/auth/login", {"identifier": name, "password": "Passw0rdAAA"}); assert s == 200, j
    return c


def scene(**room):
    r = {"id": "r1", "name": "Bed", "type": "bedroom", "w": 4, "l": 4, "x": 0, "z": 0, "objects": [
        {"id": "o1", "key": "bed.b02", "type": "bed", "name": "Bed", "x": 0, "z": -1, "ry": 0, "dims": [1.5, 0.9, 2.05]},
        {"id": "fan", "key": "fan.f01", "type": "fan", "name": "Fan", "x": 0.3, "z": 0.3, "ry": 0, "y": 0, "dims": [1.3, 0.35, 1.3]}]}
    r.update(room)
    return {"version": 2, "floors": [{"id": "f1", "name": "G", "height": 3, "rooms": [r]}]}


# ============ validation (bug 4)
owner = mkuser("owner", "owner@example.com")
bad = {"negative width": scene(w=-3), "zero length": scene(l=0), "huge room": scene(w=500), "objects not a list": scene(objects=5),
       "null object": scene(objects=[None]), "string object": scene(objects=["x"]), "neg dims": scene(objects=[{"type": "bed", "dims": [-1, 1, 1]}]),
       "unknown type": scene(objects=[{"type": "spaceship", "dims": [1, 1, 1]}]), "bad position": scene(objects=[{"type": "bed", "x": "abc"}])}
for label, data in bad.items():
    s, j = call(owner, "post", "/api/projects", {"name": "x", "project_data": data})
    check(f"rejects {label}", s == 400, (s, j))
check("rejects floor height 100", call(owner, "post", "/api/projects", {"name": "x", "project_data": {"floors": [{"height": 100, "rooms": []}]}})[0] == 400)
check("rejects floors not a list", call(owner, "post", "/api/projects", {"name": "x", "project_data": {"floors": "nope"}})[0] == 400)
s, j = call(owner, "post", "/api/projects", {"name": "Home", "project_data": scene()})
check("valid scene accepted", s == 201, j); pid = j["project"]["id"]
check("ai requires login", app.test_client().post("/api/ai/arrange", data="{}", content_type="application/json", headers=H).status_code == 401)
check("ai arrange: garbage payload -> 400 not 500", call(owner, "post", "/api/ai/arrange", {"room": "garbage", "objects": 7})[0] == 400)
check("ai review: garbage payload -> 200 not 500", call(owner, "post", "/api/ai/review", {"scene": {"floors": [None, {"rooms": "x"}, {"rooms": [None, {"objects": 3}]}]}})[0] == 200)

# ============ ai classification (bug 2) - the client even lies with floor=True
objs = [{"id": "o1", "type": "bed", "name": "Bed", "dims": [1.5, .9, 2], "x": 0, "z": 0, "floor": True},
        {"id": "fan", "type": "fan", "name": "Fan", "dims": [1.3, .3, 1.3], "x": 1, "z": 1, "floor": True},
        {"id": "ac", "type": "ac", "name": "AC", "dims": [1, .3, .2], "x": 1.5, "z": -1.9, "floor": True},
        {"id": "ch", "type": "chandelier", "name": "Ch", "dims": [.8, .7, .8], "x": 0, "z": 0, "floor": True},
        {"id": "wd", "type": "wardrobe", "name": "Wardrobe", "dims": [1.6, 2.2, .6], "x": -1, "z": 1}]
s, j = call(owner, "post", "/api/ai/arrange", {"room": {"w": 4, "l": 4}, "objects": objs})
check("arrange moves only floor furniture", {p["id"] for p in j["placements"]} == {"o1", "wd"}, j.get("placements"))
s, j = call(owner, "post", "/api/ai/arrange", {"room": {"w": 4, "l": 4}, "objects": [{"id": f"c{i}", "type": "chair", "dims": [.5, .9, .5]} for i in range(70)]})
check("arrange reports truncation of >60 items", j["truncated"] == 10 and j["limit"] == 60, j.get("truncated"))

# ============ design doctor
s, j = call(owner, "post", "/api/ai/review", {"scene": scene(objects=[
    {"id": "b", "type": "bed", "name": "Bed", "x": 0, "z": 0, "dims": [1.5, .9, 2]},
    {"id": "dr", "type": "door", "wall": "S", "t": 0, "dims": [.9, 2.1, .1]},
    {"id": "w", "type": "wardrobe", "name": "Wardrobe", "x": 0, "z": 1.6, "dims": [1.6, 2.2, .6]}])})
codes = {i["code"] for r in j["rooms"] for i in r["doctor"]}
check("doctor: no window + door swing found", {"no_light", "door_swing"} <= codes, codes)
check("review has all four scores", all(k in j for k in ("overall", "doctor_score", "layout_score", "harmony_score")))

# ============ architect
s, j = call(owner, "post", "/api/ai/architect", {"plot_w": 30, "plot_l": 40, "unit": "ft", "floors": 2, "bedrooms": 3, "bathrooms": 3, "balcony": True})
check("architect plan generated", s == 200 and len(j["plan"]["floors"]) == 2 and j["plan"]["doors"], (s, j))
rooms = [r for f in j["plan"]["floors"] for r in f["rooms"]]
check("plan has the requested 3 bedrooms + 3 bathrooms", sum(1 for r in rooms if r["type"] == "bedroom") == 3 and sum(1 for r in rooms if r["type"] == "bathroom") == 3)
check("architect rejects tiny plot", call(owner, "post", "/api/ai/architect", {"plot_w": 5, "plot_l": 5})[0] == 400)
check("architect rejects impossible program", call(owner, "post", "/api/ai/architect", {"plot_w": 6, "plot_l": 8, "bedrooms": 6, "bathrooms": 6})[0] == 400)

# ============ versions (time machine)
s, j = call(owner, "get", f"/api/projects/{pid}/versions")
check("initial version exists", len(j["versions"]) == 1 and j["versions"][0]["label"] == "Created")
s2 = scene(name="Renamed")
call(owner, "put", f"/api/projects/{pid}", {"project_data": s2, "snapshot": True, "label": "Renamed room"})
s, j = call(owner, "get", f"/api/projects/{pid}/versions")
check("manual snapshot stored", len(j["versions"]) == 2 and j["versions"][0]["label"] == "Renamed room")
call(owner, "put", f"/api/projects/{pid}", {"project_data": s2, "snapshot": True})
s, j = call(owner, "get", f"/api/projects/{pid}/versions")
check("identical scene does not create a duplicate version", len(j["versions"]) == 2)
v1 = j["versions"][-1]["id"]
call(owner, "put", f"/api/projects/{pid}", {"project_data": scene(name="Unsaved edit")})
s, j = call(owner, "post", f"/api/projects/{pid}/versions/{v1}/restore")
check("restore version", s == 200 and j["project_data"]["floors"][0]["rooms"][0]["name"] == "Bed", j)
s, j = call(owner, "get", f"/api/projects/{pid}/versions")
check("restore is itself undoable (safety snapshot)", any((v["label"] or "").startswith("Before restoring") for v in j["versions"]))

# ============ share link with password + expiry
s, j = call(owner, "post", f"/api/projects/{pid}/share", {"enabled": True, "password": "sesame", "expires_days": 7})
tok = j["share_token"]; check("share with password + expiry", s == 200 and j["share_protected"] and j["share_expires_at"])
anon = app.test_client()
check("no password -> 401", anon.get(f"/api/projects/shared/{tok}").status_code == 401)
check("wrong password -> 401", anon.get(f"/api/projects/shared/{tok}", headers={"X-Share-Password": "x"}).status_code == 401)
check("right password -> 200", anon.get(f"/api/projects/shared/{tok}", headers={"X-Share-Password": "sesame"}).status_code == 200)
with app.app_context():
    p = db.session.get(Project, pid); p.share_expires_at = utc_now() - timedelta(days=1); db.session.commit()
check("expired link -> 404", anon.get(f"/api/projects/shared/{tok}", headers={"X-Share-Password": "sesame"}).status_code == 404)

# ============ collaboration
editor, viewer = mkuser("edita", "e@example.com"), mkuser("viewa", "v@example.com")
check("invite editor", call(owner, "post", f"/api/projects/{pid}/members", {"username": "edita", "role": "editor"})[0] == 200)
check("invite viewer", call(owner, "post", f"/api/projects/{pid}/members", {"username": "viewa", "role": "viewer"})[0] == 200)
check("stranger cannot see project", call(mkuser("rando", "r@example.com"), "get", f"/api/projects/{pid}")[0] == 404)
s, j = call(editor, "get", "/api/projects"); check("shared project listed for editor", len(j["shared_with_me"]) == 1 and j["shared_with_me"][0]["role"] == "editor")
check("editor can save scene", call(editor, "put", f"/api/projects/{pid}", {"project_data": scene(name="By editor")})[0] == 200)
check("editor cannot rename", call(editor, "put", f"/api/projects/{pid}", {"name": "hax"})[0] == 403)
check("editor cannot delete", call(editor, "delete", f"/api/projects/{pid}")[0] == 404)
check("editor cannot share", call(editor, "post", f"/api/projects/{pid}/share", {})[0] == 404)
check("viewer can read", call(viewer, "get", f"/api/projects/{pid}")[0] == 200)
check("viewer cannot save", call(viewer, "put", f"/api/projects/{pid}", {"project_data": scene()})[0] == 403)
check("viewer can comment", call(viewer, "post", f"/api/projects/{pid}/comments", {"body": "Nice layout!"})[0] == 201)
s, j = call(owner, "get", f"/api/projects/{pid}/comments"); check("owner sees the comment", j["comments"][0]["user"] == "viewa")

# ============ session revocation + OTP cooldown across accounts
a = mkuser("sess", "s@example.com")
b = app.test_client(); call(b, "post", "/api/auth/login", {"identifier": "sess", "password": "Passw0rdAAA"})
check("second device logged in", b.get("/api/auth/me").status_code == 200)
check("password change ok", call(a, "post", "/api/auth/account/change-password", {"current_password": "Passw0rdAAA", "new_password": "BrandNewPass9"})[0] == 200)
check("changing device stays logged in", a.get("/api/auth/me").status_code == 200)
check("OTHER device is signed out", b.get("/api/auth/me").status_code == 401)
c1 = app.test_client(); age()
call(c1, "post", "/api/auth/signup", {"username": "twin1", "email": "twin@example.com", "password": "Passw0rdAAA"})
before = len(SENT)
s, j = call(c1, "post", "/api/auth/signup", {"username": "twin2", "email": "twin@example.com", "password": "Passw0rdAAA"})
check("2nd account on same e-mail cannot trigger another OTP within 60 s", s == 201 and j["email_sent"] is False and len(SENT) == before, j)

# ============ admin: features, products, email OTP, system, telemetry
ca = app.test_client()
call(ca, "post", "/api/auth/login", {"identifier": "boss", "password": "AdminPass#123"}); call(ca, "post", "/api/admin/unlock", {"panel_password": "PanelPass#456"})
s, j = call(ca, "put", "/api/admin/features", {"features": {"ai": False, "signup": False}}); check("feature switches saved", j["features"]["ai"] is False)
check("AI blocked when disabled", call(owner, "post", "/api/ai/recommend", {"room_type": "bedroom"})[0] == 403)
check("signup blocked when disabled", call(app.test_client(), "post", "/api/auth/signup", {"username": "late", "email": "l@e.com", "password": "Passw0rdAAA"})[0] == 403)
call(ca, "put", "/api/admin/features", {"features": {"ai": True, "signup": True}})
s, j = call(ca, "post", "/api/admin/products", {"item_type": "sofa", "name": "Test Sofa", "brand": "ACME", "price": 25000, "purchase_url": "https://example.com/s", "w": 2, "h": .9, "d": .9})
check("admin adds product", s == 201); prid = j["product"]["id"]
check("javascript: link rejected", call(ca, "post", "/api/admin/products", {"item_type": "sofa", "name": "x", "price": 1, "purchase_url": "javascript:alert(1)"})[0] == 400)
check("bad product type rejected", call(ca, "post", "/api/admin/products", {"item_type": "nope", "name": "x", "price": 1})[0] == 400)
s, j = call(owner, "get", "/api/catalog/products?type=sofa"); check("users see matching products", j["products"][0]["name"] == "Test Sofa")
check("admin deletes product", call(ca, "delete", f"/api/admin/products/{prid}")[0] == 200)
s, j = call(ca, "post", "/api/admin/settings/email", {"new_email": "newboss@example.com", "password": "AdminPass#123"})
check("admin email change sends OTP first", s == 200 and j.get("pending"))
check("wrong OTP rejected", call(ca, "post", "/api/admin/settings/email/confirm", {"otp": "000000"})[0] == 400)
age()
s, j = call(ca, "post", "/api/admin/settings/email/confirm", {"otp": otp("admin_email")}); check("admin email changed after OTP", s == 200, j)
call(app.test_client(), "post", "/api/telemetry/error", {"message": "TypeError: x is undefined", "where": "/studio/1"})
r = ca.get("/api/admin/system"); j = r.get_json()
check("system health + error monitoring", j["success"] and j["errors_24h"] >= 1 and j["db_latency_ms"] >= 0, j)
print(f"\nALL {n} V3 CHECKS PASSED")

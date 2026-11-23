import json
from datetime import timedelta

from flask import Blueprint, Response, jsonify, request, session
from sqlalchemy import func, or_

from app import db
from app.ml.forecast import forecast
from app.models.extra import ProjectComment, ProjectMember, ProjectVersion
from app.models.misc import ActivityLog, Backup
from app.models.otp import OTPVerification
from app.models.project import Project
from app.models.user import User
from app.routes.common import PASSWORD_RULE, body, fail, ok, valid_email, valid_password
from app.security import check_password, hash_password
from app.services import admin_auth, analytics, backup_service, cloud, settings_store as store, storage_stats
from app.services.activity import EVENTS, log_event
from app.services.admin_auth import admin_required
from app.services.otp_email_service import send_verification_otp, verify_email_otp
from app.timeutil import as_utc, ist_iso, utc_now

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def reply(p, s=200):
    return jsonify(p), s


def mask(email):
    n, _, d = email.partition("@")
    return f"{n[:2]}{'*' * max(1, len(n) - 2)}@{d}"


# ================================================================ session stages

@admin_bp.get("/status")
def status():
    return reply(ok(configured=admin_auth.configured(), gate=admin_auth.gate_ok(), unlocked=admin_auth.panel_ok(),
                    username=admin_auth.username() if admin_auth.gate_ok() else None,
                    email=mask(admin_auth.email()) if admin_auth.gate_ok() and admin_auth.email() else None))


@admin_bp.post("/unlock")
def unlock():
    if not admin_auth.gate_ok():
        return reply(fail("Please sign in with the admin username and password first.", need_login=True), 401)
    locked, left = admin_auth.lock_status("panel")
    if locked:
        return reply(fail(f"Too many wrong attempts. Try again in {left // 60 + 1} minute(s)."), 423)
    if not admin_auth.check_panel_password(str(body().get("panel_password", ""))):
        now_locked, remaining = admin_auth.register_failure("panel")
        log_event("login_failed", username=admin_auth.username(), actor="admin", detail="Wrong admin panel password")
        if now_locked:
            return reply(fail(f"Too many wrong attempts. Locked for {admin_auth.LOCK_MINUTES} minutes."), 423)
        return reply(fail(f"Wrong panel password. {remaining} attempt(s) left."), 401)
    admin_auth.clear_failures("panel")
    admin_auth.unlock()
    log_event("admin_unlock", username=admin_auth.username(), actor="admin", detail="Admin panel opened")
    return reply(ok(message="Welcome back, admin."))


@admin_bp.post("/logout")
def admin_logout():
    admin_auth.clear()
    session.clear()
    return reply(ok(message="Signed out."))


# ================================================================ recovery (security question + e-mail OTP)

@admin_bp.get("/recovery/question")
def recovery_question():
    if not admin_auth.gate_ok():
        return reply(fail("Please sign in with the admin username and password first."), 401)
    q = admin_auth.security_question()
    if not q:
        return reply(fail("No security question is configured in .env."), 400)
    return reply(ok(question=q))


@admin_bp.post("/recovery/answer")
def recovery_answer():
    if not admin_auth.gate_ok():
        return reply(fail("Please sign in with the admin username and password first."), 401)
    locked, left = admin_auth.lock_status("recovery")
    if locked:
        return reply(fail(f"Too many wrong answers. Try again in {left // 60 + 1} minute(s)."), 423)
    if not admin_auth.check_security_answer(str(body().get("answer", ""))):
        now_locked, remaining = admin_auth.register_failure("recovery")
        log_event("login_failed", username=admin_auth.username(), actor="admin", detail="Wrong security answer")
        return reply(fail("Wrong answer." + (" Locked for 15 minutes." if now_locked else f" {remaining} attempt(s) left.")), 423 if now_locked else 401)
    admin_auth.clear_failures("recovery")
    session["admin_recovery_stage"] = "answered"
    sent, msg = send_verification_otp(admin_auth.email(), "admin_recovery", None)
    if not sent:
        return reply(ok(otp_sent=False, message=msg, email=mask(admin_auth.email())))
    return reply(ok(otp_sent=True, message=f"Security answer accepted. An OTP was sent to {mask(admin_auth.email())}.", email=mask(admin_auth.email())))


@admin_bp.post("/recovery/resend")
def recovery_resend():
    if session.get("admin_recovery_stage") != "answered":
        return reply(fail("Answer the security question first."), 400)
    sent, msg = send_verification_otp(admin_auth.email(), "admin_recovery", None)
    return reply(ok(message="A new OTP has been sent.") if sent else fail(msg), 200 if sent else 429 if "wait" in msg.lower() else 502)


@admin_bp.post("/recovery/reset")
def recovery_reset():
    d = body()
    if session.get("admin_recovery_stage") != "answered":
        return reply(fail("Answer the security question first."), 400)
    target = d.get("target", "login")
    new_pw = d.get("new_password", "")
    if target not in ("login", "panel"):
        return reply(fail("Choose which password to reset."), 400)
    if not valid_password(new_pw):
        return reply(fail(PASSWORD_RULE), 400)
    ok_otp, msg = verify_email_otp(admin_auth.email(), str(d.get("otp", "")), "admin_recovery", None)
    if not ok_otp:
        return reply(fail(msg), 400)
    (admin_auth.set_login_password if target == "login" else admin_auth.set_panel_password)(new_pw)
    session.pop("admin_recovery_stage", None)
    admin_auth.clear_failures("login" if target == "login" else "panel")
    log_event("admin_settings", username=admin_auth.username(), actor="admin", detail=f"Admin {target} password reset via security question + OTP")
    return reply(ok(message=f"Admin {target} password updated. Use the new password next time."))


# ================================================================ dashboard

@admin_bp.get("/overview")
@admin_required
def overview():
    snap = analytics.usage_snapshot(force=request.args.get("fresh") == "1")
    series = analytics.daily_series(30)
    recent = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(14).all()
    return reply(ok(
        totals=snap["totals"], series=series,
        forecast={"signups": forecast([s["signups"] for s in series]),
                  "projects": forecast([s["projects"] for s in series]),
                  "logins": forecast([s["logins"] for s in series])},
        top_items=snap["items"][:8], top_types=snap["types"][:8], room_types=snap["room_types"],
        top_users=analytics.top_users(), recent=[r.to_dict() for r in recent],
        storage_brief=_brief_storage(),
    ))


def _brief_storage():
    try:
        n = storage_stats.neon_stats()
        return {"neon_bytes": n.get("database_bytes", 0), "neon_limit": n.get("limit_bytes", 0)}
    except Exception:
        return None


# ================================================================ users

@admin_bp.get("/users")
@admin_required
def users():
    q = (request.args.get("q") or "").strip()
    flt = request.args.get("filter", "all")
    page, per = max(1, int(request.args.get("page", 1) or 1)), 25
    query = db.session.query(User, func.count(Project.id)).outerjoin(Project, Project.user_id == User.id).group_by(User.id)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(or_(func.lower(User.username).like(like), func.lower(User.email).like(like)))
    now = utc_now()
    if flt == "blocked": query = query.filter(User.is_blocked.is_(True))
    elif flt == "unverified": query = query.filter(User.is_email_verified.is_(False))
    elif flt == "locked": query = query.filter(User.locked_until > now)
    elif flt == "2fa": query = query.filter(User.is_2fa_enabled.is_(True))
    total = query.count()
    sort = request.args.get("sort", "created")
    order = {"login": User.last_login_at.desc().nullslast(), "name": User.username.asc(), "projects": func.count(Project.id).desc()}.get(sort, User.created_at.desc())
    rows = query.order_by(order).offset((page - 1) * per).limit(per).all()
    return reply(ok(users=[u.admin_dict(c) for u, c in rows], total=total, page=page, pages=max(1, -(-total // per))))


@admin_bp.get("/users/<int:uid>")
@admin_required
def user_detail(uid):
    u = db.session.get(User, uid)
    if not u:
        return reply(fail("User not found."), 404)
    logins = (ActivityLog.query.filter(ActivityLog.user_id == uid, ActivityLog.event.in_(["login", "login_failed", "account_locked"]))
              .order_by(ActivityLog.created_at.desc()).limit(25).all())
    return reply(ok(user=u.admin_dict(len(u.projects)), projects=[p.summary() for p in sorted(u.projects, key=lambda p: p.updated_at, reverse=True)],
                    history=[l.to_dict() for l in logins]))


@admin_bp.post("/users/<int:uid>/block")
@admin_required
def block_user(uid):
    u = db.session.get(User, uid)
    if not u: return reply(fail("User not found."), 404)
    u.is_blocked, u.blocked_reason = True, str(body().get("reason", ""))[:200] or None
    db.session.commit()
    log_event("admin_action", u, f"Blocked by admin. {u.blocked_reason or ''}", actor="admin")
    return reply(ok(user=u.admin_dict(len(u.projects))))


@admin_bp.post("/users/<int:uid>/unblock")
@admin_required
def unblock_user(uid):
    u = db.session.get(User, uid)
    if not u: return reply(fail("User not found."), 404)
    u.is_blocked, u.blocked_reason, u.locked_until, u.failed_login_count = False, None, None, 0
    db.session.commit()
    log_event("admin_action", u, "Unblocked by admin", actor="admin")
    return reply(ok(user=u.admin_dict(len(u.projects))))


@admin_bp.delete("/users/<int:uid>")
@admin_required
def delete_user(uid):
    u = db.session.get(User, uid)
    if not u: return reply(fail("User not found."), 404)
    uname, mail, n = u.username, u.email, len(u.projects)
    cloud.delete_user_thumbnails(uid)
    db.session.delete(u)
    db.session.commit()
    log_event("account_deleted", username=uname, email=mail, user_id=uid, actor="admin", detail=f"Deleted by admin with {n} project(s)")
    analytics.usage_snapshot(force=True)
    return reply(ok(message=f"{uname} deleted."))


@admin_bp.get("/projects/<int:pid>")
@admin_required
def project_view(pid):
    p = db.session.get(Project, pid)
    if not p: return reply(fail("Project not found."), 404)
    d = p.to_dict()
    d["owner"] = p.user.username
    return reply(ok(project=d))


@admin_bp.delete("/projects/<int:pid>")
@admin_required
def project_delete(pid):
    p = db.session.get(Project, pid)
    if not p: return reply(fail("Project not found."), 404)
    owner = p.user
    name, uid = p.name, p.user_id
    db.session.delete(p)
    db.session.commit()
    cloud.delete_thumbnail(uid, pid)
    log_event("admin_action", owner, f"Admin deleted project '{name}'", actor="admin")
    return reply(ok(message="Project deleted."))


# ================================================================ activity / items / prices

@admin_bp.get("/activity")
@admin_required
def activity():
    q = ActivityLog.query
    ev = request.args.get("event")
    if ev and ev != "all":
        q = q.filter(ActivityLog.event.in_(ev.split(",")))
    s = (request.args.get("q") or "").strip().lower()
    if s:
        like = f"%{s}%"
        q = q.filter(or_(func.lower(ActivityLog.username).like(like), func.lower(ActivityLog.email).like(like), func.lower(ActivityLog.detail).like(like)))
    page, per = max(1, int(request.args.get("page", 1) or 1)), 40
    total = q.count()
    rows = q.order_by(ActivityLog.created_at.desc()).offset((page - 1) * per).limit(per).all()
    return reply(ok(events=[r.to_dict() for r in rows], total=total, page=page, pages=max(1, -(-total // per)), known=EVENTS))


@admin_bp.get("/items")
@admin_required
def items():
    snap = analytics.usage_snapshot(force=request.args.get("fresh") == "1")
    return reply(ok(items=snap["items"], types=snap["types"], wall_colors=snap["wall_colors"],
                    floor_materials=snap["floor_materials"], room_types=snap["room_types"], totals=snap["totals"]))


@admin_bp.get("/prices")
@admin_required
def prices_get():
    return reply(ok(prices=store.get_json("price_overrides", {}) or {}))


@admin_bp.put("/prices")
@admin_required
def prices_put():
    incoming = body().get("prices")
    if not isinstance(incoming, dict) or len(incoming) > 2000:
        return reply(fail("Invalid prices."), 400)
    clean = {}
    for k, v in incoming.items():
        try:
            f = float(v)
        except (TypeError, ValueError):
            continue
        if 0 <= f <= 100_000_000 and isinstance(k, str) and len(k) <= 60:
            clean[k] = round(f, 2)
    store.put_json("price_overrides", clean)
    log_event("admin_settings", username=admin_auth.username(), actor="admin", detail=f"Updated {len(clean)} price override(s)")
    return reply(ok(prices=clean))


# ================================================================ storage + backups

@admin_bp.get("/storage")
@admin_required
def storage():
    return reply(ok(**storage_stats.storage_overview()))


@admin_bp.get("/backups")
@admin_required
def backups():
    rows = Backup.query.order_by(Backup.created_at.desc()).limit(100).all()
    return reply(ok(backups=[b.to_dict() for b in rows], cloud=cloud.configured()))


@admin_bp.post("/backups")
@admin_required
def backup_create():
    d = body()
    scope = d.get("scope", "full")
    if scope not in ("full", "user"):
        return reply(fail("Invalid backup scope."), 400)
    try:
        row, raw = backup_service.create_backup(scope, int(d["user_id"]) if scope == "user" else None)
    except (ValueError, KeyError, TypeError) as e:
        return reply(fail(str(e) or "Invalid request."), 400)
    log_event("backup", username=admin_auth.username(), actor="admin", detail=f"{row.label} ({row.size_bytes} bytes, {'stored in Cloudinary' if row.public_id else 'download only'})")
    return reply(ok(backup=row.to_dict(), message="Backup created."))


@admin_bp.get("/backups/<int:bid>/download")
@admin_required
def backup_download(bid):
    row = db.session.get(Backup, bid)
    if not row: return reply(fail("Backup not found."), 404)
    try:
        raw = backup_service.load_backup_bytes(row)
    except Exception as e:
        return reply(fail(f"Could not fetch backup: {e}"), 502)
    fname = f"dreamspace-{row.scope}-backup-{row.id}.json"
    return Response(raw, mimetype="application/json", headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@admin_bp.post("/backups/<int:bid>/restore")
@admin_required
def backup_restore(bid):
    row = db.session.get(Backup, bid)
    if not row: return reply(fail("Backup not found."), 404)
    try:
        res = backup_service.restore(backup_service.load_backup_bytes(row))
    except Exception as e:
        db.session.rollback()
        return reply(fail(f"Restore failed: {e}"), 400)
    log_event("restore", username=admin_auth.username(), actor="admin", detail=f"Restored '{row.label}': {res}")
    analytics.usage_snapshot(force=True)
    return reply(ok(**res, message="Backup merged into the database."))


@admin_bp.delete("/backups/<int:bid>")
@admin_required
def backup_delete(bid):
    row = db.session.get(Backup, bid)
    if not row: return reply(fail("Backup not found."), 404)
    cloud.delete_backup(row.public_id)
    db.session.delete(row)
    db.session.commit()
    return reply(ok(message="Backup deleted."))


# ================================================================ admin account settings

@admin_bp.post("/settings/email")
@admin_required
def set_email():
    """Step 1: verify the admin password and e-mail an OTP to the NEW address."""
    d = body()
    new = str(d.get("new_email", "")).strip().lower()
    if not valid_email(new):
        return reply(fail("Enter a valid email address."), 400)
    if not admin_auth.check_login_password(str(d.get("password", ""))):
        return reply(fail("Admin password is incorrect."), 401)
    sent, msg = send_verification_otp(new, "admin_email", None)
    if not sent:
        return reply(fail(msg), 429 if "wait" in msg.lower() else 502)
    session["admin_pending_email"] = new
    return reply(ok(message=f"An OTP was sent to {mask(new)}. Enter it to confirm the change.", pending=True))


@admin_bp.post("/settings/email/confirm")
@admin_required
def confirm_email():
    new = session.get("admin_pending_email")
    if not new:
        return reply(fail("Start the email change again."), 400)
    good, msg = verify_email_otp(new, str(body().get("otp", "")), "admin_email", None)
    if not good:
        return reply(fail(msg), 400)
    admin_auth.set_email(new)
    session.pop("admin_pending_email", None)
    log_event("admin_settings", username=admin_auth.username(), actor="admin", detail=f"Admin email changed to {mask(new)} (OTP verified)")
    return reply(ok(message="Admin email updated.", email=mask(new)))


@admin_bp.post("/settings/password")
@admin_required
def set_password():
    d = body()
    which = d.get("which", "login")
    if which not in ("login", "panel"):
        return reply(fail("Invalid request."), 400)
    check = admin_auth.check_login_password if which == "login" else admin_auth.check_panel_password
    if not check(str(d.get("current_password", ""))):
        return reply(fail("Current password is incorrect."), 401)
    if not valid_password(d.get("new_password", "")):
        return reply(fail(PASSWORD_RULE), 400)
    (admin_auth.set_login_password if which == "login" else admin_auth.set_panel_password)(d["new_password"])
    log_event("admin_settings", username=admin_auth.username(), actor="admin", detail=f"Admin {which} password changed")
    return reply(ok(message=f"Admin {which} password updated."))


# ================================================================ danger zone

CONFIRM_PHRASE = "DELETE ENTIRE APP"


@admin_bp.post("/danger/delete-app")
@admin_required
def delete_app():
    d = body()
    if not admin_auth.check_panel_password(str(d.get("panel_password", ""))):
        return reply(fail("Panel password is incorrect."), 401)
    if str(d.get("confirm", "")).strip() != CONFIRM_PHRASE:
        return reply(fail(f'Type "{CONFIRM_PHRASE}" exactly to continue.'), 400)
    counts = {"users": User.query.count(), "projects": Project.query.count()}
    wiped = cloud.wipe_everything()
    # order matters because of foreign keys
    for model in (OTPVerification, ProjectComment, ProjectMember, ProjectVersion, Project, User, ActivityLog, Backup):
        db.session.query(model).delete(synchronize_session=False)
    db.session.commit()
    analytics.usage_snapshot(force=True)
    log_event("admin_action", username=admin_auth.username(), actor="admin", detail=f"ENTIRE APP DELETED: {counts}, cloud assets {wiped.get('deleted', 0)}")
    return reply(ok(message="All users, projects, logs, backups and cloud files were deleted.", **counts, cloud_deleted=wiped.get("deleted", 0)))


# ================================================================ product catalogue (real purchasable products)
from app.models.extra import Product  # noqa: E402
from app.services import features as feature_flags  # noqa: E402


def _product_from(d, p=None):
    p = p or Product()
    name = str(d.get("name", "")).strip()
    itype = str(d.get("item_type", "")).strip()
    from app.ml.catalog_types import ALL_TYPES
    if not name or len(name) > 160 or itype not in ALL_TYPES:
        raise ValueError("Name and a valid item type are required.")
    try:
        price = float(d.get("price", 0))
    except (TypeError, ValueError):
        raise ValueError("Price must be a number.")
    if not 0 <= price <= 1e8:
        raise ValueError("Price is out of range.")
    p.name, p.item_type, p.price = name, itype, price
    p.brand = str(d.get("brand", ""))[:80] or None
    p.material = str(d.get("material", ""))[:80] or None
    for k, attr in (("w", "width"), ("h", "height"), ("d", "depth")):
        v = d.get(k)
        setattr(p, attr, float(v) if v not in (None, "") else None)
    for k in ("image_url", "purchase_url"):
        v = str(d.get(k, "") or "").strip()
        if v and not v.lower().startswith(("http://", "https://")):
            raise ValueError("Links must start with http:// or https://")
        setattr(p, k, v[:600] or None)
    p.in_stock = bool(d.get("in_stock", True))
    return p


@admin_bp.get("/products")
@admin_required
def products_list():
    return reply(ok(products=[p.to_dict() for p in Product.query.order_by(Product.item_type, Product.price).all()]))


@admin_bp.post("/products")
@admin_required
def products_create():
    try:
        p = _product_from(body())
    except (ValueError, TypeError) as e:
        return reply(fail(str(e)), 400)
    db.session.add(p); db.session.commit()
    return reply(ok(product=p.to_dict()), 201)


@admin_bp.put("/products/<int:pid>")
@admin_required
def products_update(pid):
    p = db.session.get(Product, pid)
    if not p: return reply(fail("Product not found."), 404)
    try:
        _product_from(body(), p)
    except (ValueError, TypeError) as e:
        return reply(fail(str(e)), 400)
    db.session.commit()
    return reply(ok(product=p.to_dict()))


@admin_bp.delete("/products/<int:pid>")
@admin_required
def products_delete(pid):
    p = db.session.get(Product, pid)
    if not p: return reply(fail("Product not found."), 404)
    db.session.delete(p); db.session.commit()
    return reply(ok(message="Product deleted."))


# ================================================================ feature switches + system health
@admin_bp.get("/features")
@admin_required
def features_get():
    return reply(ok(features=feature_flags.all_flags(), labels=feature_flags.LABELS))


@admin_bp.put("/features")
@admin_required
def features_put():
    cur = feature_flags.set_flags(body().get("features"))
    log_event("admin_settings", username=admin_auth.username(), actor="admin", detail=f"Feature switches: {cur}")
    return reply(ok(features=cur))


@admin_bp.get("/system")
@admin_required
def system_health():
    import os as _os
    import time as _t
    from sqlalchemy import text as _text
    t0 = _t.perf_counter()
    db.session.execute(_text("select 1"))
    ms = round((_t.perf_counter() - t0) * 1000, 1)
    since = utc_now() - timedelta(hours=24)
    errs = ActivityLog.query.filter(ActivityLog.event == "error", ActivityLog.created_at >= since).count()
    recent = ActivityLog.query.filter(ActivityLog.event == "error").order_by(ActivityLog.created_at.desc()).limit(12).all()
    return reply(ok(db_latency_ms=ms, errors_24h=errs, recent_errors=[e.to_dict() for e in recent], version="3.0.0",
                    cloud=cloud.configured(), mail_configured=bool(_os.getenv("BREVO_API_KEY"))))

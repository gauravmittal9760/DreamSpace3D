import copy
import hashlib
import json
import math
import secrets
from datetime import timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.ml.catalog_types import ALL_TYPES
from app.models.extra import ProjectComment, ProjectMember, ProjectVersion
from app.models.project import Project
from app.routes.common import body, current_user, fail, find_user_by_username, ok
from app.security import check_password, hash_password
from app.services import cloud, features
from app.services.activity import log_event
from app.timeutil import as_utc, utc_now

projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")

MAX_PROJECTS_PER_USER = 30
MAX_SCENE_BYTES = 2 * 1024 * 1024
MAX_FLOORS, MAX_ROOMS_PER_FLOOR, MAX_OBJECTS_PER_ROOM = 12, 40, 400
MAX_VERSIONS, AUTO_VERSION_EVERY = 40, timedelta(minutes=10)
MAX_MEMBERS = 12


def reply(payload, status=200):
    return jsonify(payload), status


def unauth():
    return reply(fail("Please log in first."), 401)


def valid_name(name):
    return isinstance(name, str) and 0 < len(name.strip()) <= 120


# ---------------------------------------------------------------- strict scene validation
def _num(v, lo, hi):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and lo <= v <= hi


def scene_problem(data):
    if not isinstance(data, dict):
        return "Project scene data is invalid."
    try:
        if len(json.dumps(data, allow_nan=False)) > MAX_SCENE_BYTES:
            return "Project scene is too large (max 2 MB)."
    except (TypeError, ValueError):
        return "Project scene data is invalid."
    floors = data.get("floors", [])
    if not isinstance(floors, list) or len(floors) > MAX_FLOORS:
        return f"A project can have at most {MAX_FLOORS} floors."
    for fi, f in enumerate(floors, 1):
        if not isinstance(f, dict):
            return f"Floor {fi} is invalid."
        if "height" in f and not _num(f["height"], 2, 8):
            return f"Floor {fi}: height must be between 2 and 8 metres."
        rooms = f.get("rooms", [])
        if not isinstance(rooms, list) or len(rooms) > MAX_ROOMS_PER_FLOOR:
            return f"A floor can have at most {MAX_ROOMS_PER_FLOOR} rooms."
        for r in rooms:
            if not isinstance(r, dict):
                return "A room entry is invalid."
            for k in ("w", "l"):
                if k in r and not _num(r[k], 0.5, 80):
                    return f"Room “{str(r.get('name', ''))[:30]}”: {'width' if k == 'w' else 'length'} must be between 0.5 and 80 metres."
            for k in ("x", "z"):
                if k in r and not _num(r[k], -2000, 2000):
                    return "A room position is out of range."
            objs = r.get("objects", [])
            if objs is None:
                objs = []
            if not isinstance(objs, list):
                return "Room items must be a list."
            if len(objs) > MAX_OBJECTS_PER_ROOM:
                return f"A room can have at most {MAX_OBJECTS_PER_ROOM} items."
            for o in objs:
                if not isinstance(o, dict):
                    return "An item entry is invalid."
                if o.get("type") is not None and o.get("type") not in ALL_TYPES:
                    return f"Unsupported item type “{str(o.get('type'))[:30]}”."
                dims = o.get("dims")
                if dims is not None and (not isinstance(dims, list) or len(dims) != 3 or not all(_num(d, 0.02, 40) for d in dims)):
                    return "An item has invalid dimensions."
                for k in ("x", "z", "y", "ry", "t"):
                    if k in o and o[k] is not None and not _num(o[k], -2000, 2000):
                        return "An item has an invalid position or rotation."
    return None


# ---------------------------------------------------------------- access control
def access(project_id, user):
    """Returns (project, role) with role in owner | editor | viewer | None."""
    p = db.session.get(Project, project_id)
    if not p:
        return None, None
    if p.user_id == user.id:
        return p, "owner"
    m = ProjectMember.query.filter_by(project_id=project_id, user_id=user.id).first()
    if m and features.enabled("collab"):
        return p, m.role
    return None, None


def digest_of(data):
    return hashlib.sha1(json.dumps(data, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def snapshot(p, label=None, auto=True):
    """Store a version unless the scene equals the latest one. Keeps at most MAX_VERSIONS (named ones last longest)."""
    dg = digest_of(p.project_data)
    last = ProjectVersion.query.filter_by(project_id=p.id).order_by(ProjectVersion.number.desc()).first()
    if last and last.digest == dg:
        return last
    v = ProjectVersion(project_id=p.id, number=(last.number if last else 0) + 1, label=label, auto=auto, digest=dg, project_data=copy.deepcopy(p.project_data))
    db.session.add(v)
    db.session.flush()
    extra = ProjectVersion.query.filter_by(project_id=p.id).count() - MAX_VERSIONS
    if extra > 0:
        for o in ProjectVersion.query.filter_by(project_id=p.id, auto=True).order_by(ProjectVersion.number).limit(extra).all():
            db.session.delete(o)
    return v


# ---------------------------------------------------------------- list / create / read / update
@projects_bp.get("")
def list_projects():
    user = current_user()
    if not user: return unauth()
    rows = Project.query.filter_by(user_id=user.id).order_by(Project.updated_at.desc()).all()
    shared = []
    if features.enabled("collab"):
        for m in ProjectMember.query.filter_by(user_id=user.id).all():
            s = m.project.summary(); s.update(owner=m.project.user.username, role=m.role); shared.append(s)
    return reply(ok(projects=[p.summary() for p in rows], shared_with_me=shared, total=len(rows), limit=MAX_PROJECTS_PER_USER))


@projects_bp.post("")
def create_project():
    user, d = current_user(), body()
    if not user: return unauth()
    if Project.query.filter_by(user_id=user.id).count() >= MAX_PROJECTS_PER_USER:
        return reply(fail(f"You can keep up to {MAX_PROJECTS_PER_USER} projects. Delete one to create another."), 400)
    name, desc, data = d.get("name", "Untitled Project"), d.get("description", ""), d.get("project_data", {})
    if not valid_name(name):
        return reply(fail("Project name must contain 1-120 characters."), 400)
    if desc is not None and not isinstance(desc, str):
        return reply(fail("Invalid project description."), 400)
    problem = scene_problem(data)
    if problem:
        return reply(fail(problem), 400)
    try:
        p = Project(user_id=user.id, name=name.strip(), description=(desc or "").strip() or None, project_data=data)
        db.session.add(p)
        db.session.flush()
        snapshot(p, "Created", auto=False)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return reply(fail("Unable to create project right now."), 500)
    log_event("project_created", user, p.name)
    return reply(ok(message="Project created.", project=p.to_dict()), 201)


@projects_bp.get("/<int:pid>")
def get_project(pid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p:
        return reply(fail("Project not found."), 404)
    d = p.to_dict(); d.update(role=role, owner=p.user.username)
    return reply(ok(project=d))


@projects_bp.route("/<int:pid>", methods=["PUT", "PATCH"])
def update_project(pid):
    user, d = current_user(), body()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p:
        return reply(fail("Project not found."), 404)
    if role == "viewer":
        return reply(fail("You have view-only access to this project."), 403)
    if "name" in d:
        if role != "owner":
            return reply(fail("Only the owner can rename the project."), 403)
        if not valid_name(d["name"]):
            return reply(fail("Project name must contain 1-120 characters."), 400)
        p.name = d["name"].strip()
    if "description" in d:
        if d["description"] is not None and not isinstance(d["description"], str):
            return reply(fail("Invalid project description."), 400)
        p.description = (d["description"] or "").strip() or None
    if "project_data" in d:
        problem = scene_problem(d["project_data"])
        if problem:
            return reply(fail(problem), 400)
        p.project_data = d["project_data"]
        last = ProjectVersion.query.filter_by(project_id=p.id).order_by(ProjectVersion.number.desc()).first()
        if d.get("snapshot") or not last or utc_now() - as_utc(last.created_at) > AUTO_VERSION_EVERY:
            snapshot(p, (str(d.get("label"))[:120] if d.get("label") else None), auto=not d.get("snapshot"))
    p.updated_at = utc_now()
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return reply(fail("Unable to save project right now."), 500)
    return reply(ok(message="Project saved.", project=p.summary(), saved_at=p.updated_at.isoformat() if p.updated_at else None))


@projects_bp.post("/<int:pid>/thumbnail")
def save_thumbnail(pid):
    user, d = current_user(), body()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p or role == "viewer":
        return reply(fail("Project not found."), 404)
    img = d.get("image", "")
    if not isinstance(img, str) or not img.startswith("data:image/") or len(img) > 1_500_000:
        return reply(fail("Invalid thumbnail image."), 400)
    try:
        url = cloud.upload_thumbnail(p.user_id, p.id, img)
    except Exception:
        return reply(fail("Thumbnail upload failed."), 502)
    if not url:
        return reply(ok(message="Cloudinary is not configured; thumbnail skipped.", thumbnail_url=None))
    p.thumbnail_url = url
    db.session.commit()
    return reply(ok(thumbnail_url=url))


@projects_bp.post("/<int:pid>/duplicate")
def duplicate_project(pid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p:
        return reply(fail("Project not found."), 404)
    if Project.query.filter_by(user_id=user.id).count() >= MAX_PROJECTS_PER_USER:
        return reply(fail(f"You can keep up to {MAX_PROJECTS_PER_USER} projects."), 400)
    c = Project(user_id=user.id, name=(p.name[:110] + " (copy)"), description=p.description, project_data=copy.deepcopy(p.project_data))
    db.session.add(c)
    db.session.flush()
    snapshot(c, "Created", auto=False)
    db.session.commit()
    log_event("project_created", user, f"Duplicate of {p.name}")
    return reply(ok(project=c.summary()), 201)


@projects_bp.delete("/<int:pid>")
def delete_project(pid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p or role != "owner":
        return reply(fail("Project not found."), 404)
    name = p.name
    try:
        db.session.delete(p)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return reply(fail("Unable to delete project right now."), 500)
    cloud.delete_thumbnail(user.id, pid)
    log_event("project_deleted", user, name)
    return reply(ok(message="Project deleted."))


# ---------------------------------------------------------------- version history ("time machine")
@projects_bp.get("/<int:pid>/versions")
def list_versions(pid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p:
        return reply(fail("Project not found."), 404)
    rows = ProjectVersion.query.filter_by(project_id=pid).order_by(ProjectVersion.number.desc()).all()
    return reply(ok(versions=[v.summary() for v in rows], max=MAX_VERSIONS))


@projects_bp.post("/<int:pid>/versions")
def create_version(pid):
    user, d = current_user(), body()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p or role == "viewer":
        return reply(fail("Project not found."), 404)
    v = snapshot(p, str(d.get("label") or "Manual snapshot")[:120], auto=False)
    db.session.commit()
    return reply(ok(version=v.summary()), 201)


@projects_bp.get("/<int:pid>/versions/<int:vid>")
def get_version(pid, vid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    v = ProjectVersion.query.filter_by(id=vid, project_id=pid).first() if p else None
    if not v:
        return reply(fail("Version not found."), 404)
    return reply(ok(version={**v.summary(), "project_data": v.project_data}))


@projects_bp.post("/<int:pid>/versions/<int:vid>/restore")
def restore_version(pid, vid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    v = ProjectVersion.query.filter_by(id=vid, project_id=pid).first() if p else None
    if not v or role == "viewer":
        return reply(fail("Version not found."), 404)
    snapshot(p, f"Before restoring v{v.number}", auto=True)  # restoring is itself undoable
    p.project_data = copy.deepcopy(v.project_data)
    p.updated_at = utc_now()
    db.session.commit()
    return reply(ok(message=f"Restored version {v.number}.", project_data=p.project_data))


@projects_bp.delete("/<int:pid>/versions/<int:vid>")
def delete_version(pid, vid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    v = ProjectVersion.query.filter_by(id=vid, project_id=pid).first() if p else None
    if not v or role != "owner":
        return reply(fail("Version not found."), 404)
    db.session.delete(v); db.session.commit()
    return reply(ok(message="Version deleted."))


# ---------------------------------------------------------------- public share link (optional password + expiry)
@projects_bp.post("/<int:pid>/share")
def share_project(pid):
    user, d = current_user(), body()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p or role != "owner":
        return reply(fail("Project not found."), 404)
    if d.get("enabled", True):
        if not features.enabled("sharing"):
            return reply(fail("Sharing is disabled by the administrator."), 403)
        p.share_token = p.share_token or secrets.token_urlsafe(18)
        days = d.get("expires_days")
        p.share_expires_at = utc_now() + timedelta(days=int(days)) if isinstance(days, (int, float)) and 0 < days <= 365 else None
        pw = d.get("password")
        if pw is not None:
            p.share_password_hash = hash_password(pw) if isinstance(pw, str) and 4 <= len(pw) <= 64 else None
    else:
        p.share_token = None; p.share_expires_at = None; p.share_password_hash = None
    db.session.commit()
    return reply(ok(share_token=p.share_token, share_expires_at=p.summary()["share_expires_at"], share_protected=bool(p.share_password_hash)))


@projects_bp.get("/shared/<token>")
def shared_project(token):
    p = Project.query.filter_by(share_token=token).first() if token and features.enabled("sharing") else None
    if not p or (p.share_expires_at and as_utc(p.share_expires_at) < utc_now()):
        return reply(fail("This shared design does not exist, has expired, or sharing was turned off."), 404)
    if p.share_password_hash and not check_password(p.share_password_hash, request.headers.get("X-Share-Password", "")):
        return reply(fail("This design is password protected.", needs_password=True), 401)
    return reply(ok(project={"id": p.id, "name": p.name, "description": p.description, "owner": p.user.username,
                             "project_data": p.project_data, "updated_at": p.summary()["updated_at"]}))


# ---------------------------------------------------------------- collaboration
@projects_bp.get("/<int:pid>/members")
def list_members(pid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p:
        return reply(fail("Project not found."), 404)
    ms = [{"user_id": m.user_id, "username": m.user.username, "role": m.role} for m in p.members]
    return reply(ok(owner=p.user.username, role=role, members=ms, limit=MAX_MEMBERS))


@projects_bp.post("/<int:pid>/members")
def add_member(pid):
    user, d = current_user(), body()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p or role != "owner":
        return reply(fail("Only the owner can invite people."), 403)
    if not features.enabled("collab"):
        return reply(fail("Collaboration is disabled by the administrator."), 403)
    target = find_user_by_username(str(d.get("username", "")).strip())
    r = d.get("role", "viewer")
    if r not in ("viewer", "editor"):
        return reply(fail("Role must be viewer or editor."), 400)
    if not target or not target.is_email_verified or target.is_blocked:
        return reply(fail("No active user with that username."), 404)
    if target.id == user.id:
        return reply(fail("You already own this project."), 400)
    if len(p.members) >= MAX_MEMBERS:
        return reply(fail(f"At most {MAX_MEMBERS} collaborators per project."), 400)
    m = ProjectMember.query.filter_by(project_id=pid, user_id=target.id).first()
    if m: m.role = r
    else: db.session.add(ProjectMember(project_id=pid, user_id=target.id, role=r))
    db.session.commit()
    return reply(ok(message=f"{target.username} can now {'edit' if r == 'editor' else 'view'} this project."))


@projects_bp.delete("/<int:pid>/members/<int:uid>")
def remove_member(pid, uid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p or (role != "owner" and uid != user.id):
        return reply(fail("Not allowed."), 403)
    ProjectMember.query.filter_by(project_id=pid, user_id=uid).delete()
    db.session.commit()
    return reply(ok(message="Removed."))


@projects_bp.get("/<int:pid>/comments")
def list_comments(pid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p:
        return reply(fail("Project not found."), 404)
    rows = ProjectComment.query.filter_by(project_id=pid).order_by(ProjectComment.created_at.desc()).limit(100).all()
    return reply(ok(comments=[c.to_dict() for c in rows]))


@projects_bp.post("/<int:pid>/comments")
def add_comment(pid):
    user, d = current_user(), body()
    if not user: return unauth()
    p, role = access(pid, user)
    if not p:
        return reply(fail("Project not found."), 404)
    text = str(d.get("body", "")).strip()
    if not 1 <= len(text) <= 600:
        return reply(fail("Comment must be 1-600 characters."), 400)
    if ProjectComment.query.filter_by(project_id=pid).count() >= 500:
        return reply(fail("Comment limit reached for this project."), 400)
    c = ProjectComment(project_id=pid, user_id=user.id, body=text, room_id=str(d["room_id"])[:60] if d.get("room_id") else None)
    db.session.add(c); db.session.commit()
    return reply(ok(comment=c.to_dict()), 201)


@projects_bp.delete("/<int:pid>/comments/<int:cid>")
def delete_comment(pid, cid):
    user = current_user()
    if not user: return unauth()
    p, role = access(pid, user)
    c = ProjectComment.query.filter_by(id=cid, project_id=pid).first() if p else None
    if not c or (c.user_id != user.id and role != "owner"):
        return reply(fail("Not allowed."), 403)
    db.session.delete(c); db.session.commit()
    return reply(ok(message="Deleted."))

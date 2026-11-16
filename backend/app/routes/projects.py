import copy
import json
import secrets

from flask import Blueprint, jsonify
from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.models.project import Project
from app.routes.common import body, current_user, fail, ok
from app.services import cloud
from app.services.activity import log_event
from app.timeutil import utc_now

projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")

MAX_PROJECTS_PER_USER = 30
MAX_SCENE_BYTES = 2 * 1024 * 1024
MAX_FLOORS, MAX_ROOMS_PER_FLOOR, MAX_OBJECTS_PER_ROOM = 12, 40, 400


def reply(payload, status=200):
    return jsonify(payload), status


def unauth():
    return reply(fail("Please log in first."), 401)


def owned(project_id, user_id):
    return Project.query.filter_by(id=project_id, user_id=user_id).first()


def valid_name(name):
    return isinstance(name, str) and 0 < len(name.strip()) <= 120


def scene_problem(data):
    if not isinstance(data, dict):
        return "Project scene data is invalid."
    try:
        if len(json.dumps(data)) > MAX_SCENE_BYTES:
            return "Project scene is too large (max 2 MB)."
    except (TypeError, ValueError):
        return "Project scene data is invalid."
    floors = data.get("floors", [])
    if not isinstance(floors, list) or len(floors) > MAX_FLOORS:
        return f"A project can have at most {MAX_FLOORS} floors."
    for f in floors:
        rooms = f.get("rooms", []) if isinstance(f, dict) else None
        if not isinstance(rooms, list) or len(rooms) > MAX_ROOMS_PER_FLOOR:
            return f"A floor can have at most {MAX_ROOMS_PER_FLOOR} rooms."
        for r in rooms:
            if not isinstance(r, dict) or len(r.get("objects", []) or []) > MAX_OBJECTS_PER_ROOM:
                return f"A room can have at most {MAX_OBJECTS_PER_ROOM} items."
    return None


@projects_bp.get("")
def list_projects():
    user = current_user()
    if not user: return unauth()
    rows = Project.query.filter_by(user_id=user.id).order_by(Project.updated_at.desc()).all()
    return reply(ok(projects=[p.summary() for p in rows], total=len(rows), limit=MAX_PROJECTS_PER_USER))


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
    p = owned(pid, user.id)
    return reply(ok(project=p.to_dict()) if p else fail("Project not found."), 200 if p else 404)


@projects_bp.route("/<int:pid>", methods=["PUT", "PATCH"])
def update_project(pid):
    user, d = current_user(), body()
    if not user: return unauth()
    p = owned(pid, user.id)
    if not p:
        return reply(fail("Project not found."), 404)
    if "name" in d:
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
    p = owned(pid, user.id)
    if not p:
        return reply(fail("Project not found."), 404)
    img = d.get("image", "")
    if not isinstance(img, str) or not img.startswith("data:image/") or len(img) > 1_500_000:
        return reply(fail("Invalid thumbnail image."), 400)
    try:
        url = cloud.upload_thumbnail(user.id, p.id, img)
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
    p = owned(pid, user.id)
    if not p:
        return reply(fail("Project not found."), 404)
    if Project.query.filter_by(user_id=user.id).count() >= MAX_PROJECTS_PER_USER:
        return reply(fail(f"You can keep up to {MAX_PROJECTS_PER_USER} projects."), 400)
    c = Project(user_id=user.id, name=(p.name[:110] + " (copy)"), description=p.description, project_data=copy.deepcopy(p.project_data))
    db.session.add(c)
    db.session.commit()
    log_event("project_created", user, f"Duplicate of {p.name}")
    return reply(ok(project=c.summary()), 201)


@projects_bp.post("/<int:pid>/share")
def share_project(pid):
    user, d = current_user(), body()
    if not user: return unauth()
    p = owned(pid, user.id)
    if not p:
        return reply(fail("Project not found."), 404)
    if d.get("enabled", True):
        p.share_token = p.share_token or secrets.token_urlsafe(18)
    else:
        p.share_token = None
    db.session.commit()
    return reply(ok(share_token=p.share_token))


@projects_bp.get("/shared/<token>")
def shared_project(token):
    p = Project.query.filter_by(share_token=token).first() if token else None
    if not p:
        return reply(fail("This shared design does not exist or sharing was turned off."), 404)
    return reply(ok(project={"id": p.id, "name": p.name, "description": p.description, "owner": p.user.username,
                             "project_data": p.project_data, "updated_at": p.summary()["updated_at"]}))


@projects_bp.delete("/<int:pid>")
def delete_project(pid):
    user = current_user()
    if not user: return unauth()
    p = owned(pid, user.id)
    if not p:
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

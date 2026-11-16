"""Aggregations for the admin dashboard. Everything is computed live from Neon - nothing is hard-coded."""
import time
from collections import Counter, defaultdict
from datetime import timedelta

from sqlalchemy import func

from app import db
from app.models.misc import ActivityLog
from app.models.project import Project
from app.models.user import User
from app.timeutil import as_utc, ist_date, ist_now, utc_now

_cache = {"at": 0, "val": None}


def _iter_rooms():
    for pid, uid, data in db.session.query(Project.id, Project.user_id, Project.project_data).yield_per(100):
        data = data or {}
        for floor in data.get("floors") or []:
            for room in floor.get("rooms") or []:
                yield pid, uid, floor, room


def usage_snapshot(force=False):
    if not force and _cache["val"] and time.time() - _cache["at"] < 45:
        return _cache["val"]

    key_count, key_users, key_projects = Counter(), defaultdict(set), defaultdict(set)
    type_count = Counter()
    wall_colors, floor_mats, room_types, ceil = Counter(), Counter(), Counter(), Counter()
    floors_total = rooms_total = items_total = 0
    seen_floor = set()

    for pid, uid, floor, room in _iter_rooms():
        fid = (pid, floor.get("id"))
        if fid not in seen_floor:
            seen_floor.add(fid)
            floors_total += 1
        rooms_total += 1
        room_types[room.get("type") or "room"] += 1
        if room.get("wallColor"):
            wall_colors[str(room["wallColor"]).lower()] += 1
        if room.get("floorMat"):
            floor_mats[str(room["floorMat"])] += 1
        for o in room.get("objects") or []:
            k = o.get("key") or o.get("type")
            if not k:
                continue
            items_total += 1
            key_count[k] += 1
            key_users[k].add(uid)
            key_projects[k].add(pid)
            type_count[o.get("type") or str(k).split(".")[0]] += 1

    items = [
        {"key": k, "count": c, "users": len(key_users[k]), "projects": len(key_projects[k])}
        for k, c in key_count.most_common()
    ]
    now = utc_now()
    q = db.session.query
    totals = {
        "users": q(func.count(User.id)).scalar() or 0,
        "verified": q(func.count(User.id)).filter(User.is_email_verified.is_(True)).scalar() or 0,
        "blocked": q(func.count(User.id)).filter(User.is_blocked.is_(True)).scalar() or 0,
        "with_2fa": q(func.count(User.id)).filter(User.is_2fa_enabled.is_(True)).scalar() or 0,
        "locked_now": q(func.count(User.id)).filter(User.locked_until > now).scalar() or 0,
        "new_7d": q(func.count(User.id)).filter(User.created_at >= now - timedelta(days=7)).scalar() or 0,
        "active_24h": q(func.count(User.id)).filter(User.last_login_at >= now - timedelta(hours=24)).scalar() or 0,
        "projects": q(func.count(Project.id)).scalar() or 0,
        "floors": floors_total, "rooms": rooms_total, "items": items_total,
    }
    snap = {
        "totals": totals,
        "items": items,
        "types": [{"type": t, "count": c} for t, c in type_count.most_common()],
        "wall_colors": [{"color": c, "count": n} for c, n in wall_colors.most_common(12)],
        "floor_materials": [{"key": c, "count": n} for c, n in floor_mats.most_common(12)],
        "room_types": [{"type": c, "count": n} for c, n in room_types.most_common()],
    }
    _cache.update(at=time.time(), val=snap)
    return snap


def daily_series(days=30):
    start_date = ist_now().date() - timedelta(days=days - 1)
    since = utc_now() - timedelta(days=days + 1)
    idx = {start_date + timedelta(days=i): i for i in range(days)}
    out = [{"date": d.isoformat(), "signups": 0, "logins": 0, "projects": 0} for d in sorted(idx)]

    def bump(rows, field):
        for (dt,) in rows:
            d = ist_date(dt)
            if d in idx:
                out[idx[d]][field] += 1

    bump(db.session.query(User.created_at).filter(User.created_at >= since), "signups")
    bump(db.session.query(ActivityLog.created_at).filter(ActivityLog.event == "login", ActivityLog.created_at >= since), "logins")
    bump(db.session.query(Project.created_at).filter(Project.created_at >= since), "projects")
    return out


def top_users(limit=6):
    rows = (db.session.query(User.id, User.username, func.count(Project.id))
            .outerjoin(Project, Project.user_id == User.id)
            .group_by(User.id, User.username)
            .order_by(func.count(Project.id).desc()).limit(limit).all())
    return [{"id": i, "username": u, "projects": c} for i, u, c in rows]

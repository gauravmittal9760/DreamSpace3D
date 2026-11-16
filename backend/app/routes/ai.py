from flask import Blueprint, jsonify

from app.ml import layout, palette, recommender
from app.routes.common import body, current_user, fail, ok

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

STRUCT = {"door", "window"}


def reply(p, s=200):
    return jsonify(p), s


def num(v, default, lo, hi):
    try:
        return max(lo, min(hi, float(v)))
    except (TypeError, ValueError):
        return default


def clean_room(r):
    return {"w": num(r.get("w"), 4, 1, 60), "l": num(r.get("l"), 4, 1, 60)}


def split_objects(objs):
    floor_items, fixed = [], []
    for o in (objs or [])[:200]:
        if not isinstance(o, dict) or not o.get("type"):
            continue
        dims = o.get("dims") or [1, 1, 1]
        if o["type"] in STRUCT:
            fixed.append({"type": o["type"], "wall": o.get("wall", "S"), "t": num(o.get("t"), 0, -60, 60), "w": num(dims[0], 0.9, 0.3, 6)})
        elif o.get("floor", True):
            floor_items.append({
                "id": str(o.get("id")), "type": str(o["type"]), "name": str(o.get("name") or o["type"])[:40],
                "w": num(dims[0], 1, 0.05, 20), "d": num(dims[2] if len(dims) > 2 else dims[0], 1, 0.05, 20),
                "x": num(o.get("x"), 0, -100, 100), "z": num(o.get("z"), 0, -100, 100), "ry": num(o.get("ry"), 0, -720, 720),
            })
    return floor_items, fixed


@ai_bp.post("/recommend")
def recommend():
    if not current_user():
        return reply(fail("Please log in first."), 401)
    d = body()
    types = [str(t) for t in (d.get("types") or [])][:200]
    res = recommender.recommend(str(d.get("room_type") or "room")[:20], types, limit=int(num(d.get("limit"), 8, 1, 20)))
    return reply(ok(**res))


@ai_bp.post("/arrange")
def arrange():
    if not current_user():
        return reply(fail("Please log in first."), 401)
    d = body()
    room = clean_room(d.get("room") or {})
    items, fixed = split_objects(d.get("objects"))
    movable = [i for i in items if i["id"] in set(map(str, d.get("movable_ids") or [i["id"] for i in items]))]
    res = layout.arrange(room, movable, fixed, seed=int(num(d.get("seed"), 7, 0, 10_000)))
    return reply(ok(**res, review=layout.analyze(room, apply_placements(items, res["placements"]), fixed)))


def apply_placements(items, placements):
    by = {p["id"]: p for p in placements}
    out = []
    for i in items:
        p = by.get(i["id"])
        out.append({**i, "x": p["x"], "z": p["z"], "ry": p["ry"]} if p else i)
    return out


@ai_bp.post("/review")
def review():
    if not current_user():
        return reply(fail("Please log in first."), 401)
    scene = (body().get("scene") or {})
    colors, rooms_out, scores = [], [], []
    for floor in (scene.get("floors") or [])[:12]:
        for room in (floor.get("rooms") or [])[:40]:
            if not isinstance(room, dict):
                continue
            r = clean_room(room)
            height = num(floor.get("height"), 3, 2, 8)
            wall_area = 2 * (r["w"] + r["l"]) * height
            if room.get("wallColor"):
                colors.append({"hex": room["wallColor"], "weight": wall_area})
            if room.get("floorColor"):
                colors.append({"hex": room["floorColor"], "weight": r["w"] * r["l"]})
            items, fixed = split_objects(room.get("objects"))
            for o in room.get("objects") or []:
                if isinstance(o, dict) and o.get("color") and o.get("type") not in STRUCT:
                    dims = o.get("dims") or [1, 1, 1]
                    colors.append({"hex": o["color"], "weight": max(0.05, num(dims[0], 1, 0, 10) * num(dims[2] if len(dims) > 2 else 1, 1, 0, 10))})
            if room.get("type") in ("garden",):
                continue
            a = layout.analyze(r, items, fixed)
            scores.append(a["score"])
            rooms_out.append({"floor": floor.get("name"), "room": room.get("name"), "room_id": room.get("id"), **a})
    pal = palette.analyze(colors) if colors else {"empty": True}
    layout_score = sum(scores) / len(scores) if scores else 100
    harmony = (pal.get("harmony") or {}).get("score", 80) if not pal.get("empty") else 80
    overall = round(0.7 * layout_score + 0.3 * harmony)
    return reply(ok(overall=overall, layout_score=round(layout_score), harmony_score=round(harmony), palette=pal, rooms=rooms_out))

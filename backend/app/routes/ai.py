import math

from flask import Blueprint, jsonify

from app.ml import architect, doctor, layout, palette, recommender
from app.ml.catalog_types import ALL_TYPES, FIXED_FLOOR, FLOOR, STRUCTURAL
from app.routes.common import body, current_user, fail, ok
from app.services import features

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


def reply(p, s=200):
    return jsonify(p), s


def gate():
    """None when the caller may use AI, otherwise an error response."""
    if not current_user():
        return reply(fail("Please log in first."), 401)
    if not features.enabled("ai"):
        return reply(fail("AI tools are temporarily disabled by the administrator."), 403)
    return None


def num(v, default, lo, hi):
    try:
        f = float(v)
        return max(lo, min(hi, f)) if math.isfinite(f) else default
    except (TypeError, ValueError):
        return default


def clean_room(r):
    r = r if isinstance(r, dict) else {}
    return {"w": num(r.get("w"), 4, 1, 80), "l": num(r.get("l"), 4, 1, 80)}


def split_objects(objs):
    """Classify items SERVER-SIDE by type (client flags are ignored): only floor-standing furniture is arrangeable;
    wall-mounted / ceiling-hung items are never moved. Doors & windows become fixed constraints."""
    floor_items, fixed = [], []
    if not isinstance(objs, list):
        return floor_items, fixed
    for o in objs[:400]:
        if not isinstance(o, dict) or o.get("type") not in ALL_TYPES:
            continue
        dims = o.get("dims") if isinstance(o.get("dims"), list) and len(o.get("dims")) == 3 else [1, 1, 1]
        t = o["type"]
        if t in STRUCTURAL:
            wall = o.get("wall") if o.get("wall") in ("N", "E", "S", "W") else "S"
            fixed.append({"type": t, "wall": wall, "t": num(o.get("t"), 0, -80, 80), "w": num(dims[0], 0.9, 0.3, 6), "h": num(dims[1], 1.2, 0.3, 4)})
        elif t in FLOOR:
            floor_items.append({
                "id": str(o.get("id"))[:60], "type": t, "name": str(o.get("name") or t)[:40],
                "w": num(dims[0], 1, 0.05, 20), "d": num(dims[2], 1, 0.05, 20),
                "x": num(o.get("x"), 0, -100, 100), "z": num(o.get("z"), 0, -100, 100), "ry": num(o.get("ry"), 0, -720, 720),
            })
    return floor_items, fixed


@ai_bp.post("/recommend")
def recommend():
    g = gate()
    if g: return g
    d = body()
    types = [str(t) for t in d["types"] if isinstance(t, str)][:200] if isinstance(d.get("types"), list) else []
    res = recommender.recommend(str(d.get("room_type") or "room")[:20], types, limit=int(num(d.get("limit"), 8, 1, 20)))
    return reply(ok(**res))


def apply_placements(items, placements):
    by = {p["id"]: p for p in placements}
    return [{**i, "x": by[i["id"]]["x"], "z": by[i["id"]]["z"], "ry": by[i["id"]]["ry"]} if i["id"] in by else i for i in items]


@ai_bp.post("/arrange")
def arrange():
    g = gate()
    if g: return g
    d = body()
    room = clean_room(d.get("room"))
    items, fixed = split_objects(d.get("objects"))
    wanted = {str(x) for x in d["movable_ids"]} if isinstance(d.get("movable_ids"), list) else None
    movable = [i for i in items if i["type"] not in FIXED_FLOOR and (wanted is None or i["id"] in wanted)]
    if not movable:
        return reply(fail("This room has no movable floor furniture to arrange."), 400)
    res = layout.arrange(room, movable, fixed, seed=int(num(d.get("seed"), 7, 0, 10_000)))
    return reply(ok(**res, review=layout.analyze(room, apply_placements(items, res["placements"]), fixed)))


@ai_bp.post("/review")
def review():
    g = gate()
    if g: return g
    scene = body().get("scene")
    scene = scene if isinstance(scene, dict) else {}
    colors, rooms_out, lscores, dscores = [], [], [], []
    floors = scene.get("floors")
    for floor in (floors[:12] if isinstance(floors, list) else []):
        if not isinstance(floor, dict):
            continue
        height = num(floor.get("height"), 3, 2, 8)
        rl = floor.get("rooms")
        for room in (rl[:40] if isinstance(rl, list) else []):
            if not isinstance(room, dict):
                continue
            r = clean_room(room)
            rtype = str(room.get("type") or "room")[:20]
            if isinstance(room.get("wallColor"), str):
                colors.append({"hex": room["wallColor"], "weight": 2 * (r["w"] + r["l"]) * height})
            if isinstance(room.get("floorColor"), str):
                colors.append({"hex": room["floorColor"], "weight": r["w"] * r["l"]})
            raw = room.get("objects") if isinstance(room.get("objects"), list) else []
            items, fixed = split_objects(raw)
            for o in raw:
                if isinstance(o, dict) and isinstance(o.get("color"), str) and o.get("type") in ALL_TYPES and o.get("type") not in STRUCTURAL:
                    dims = o.get("dims") if isinstance(o.get("dims"), list) and len(o["dims"]) == 3 else [1, 1, 1]
                    colors.append({"hex": o["color"], "weight": max(0.05, num(dims[0], 1, 0, 10) * num(dims[2], 1, 0, 10))})
            if rtype == "garden":
                continue
            a = layout.analyze(r, items, fixed)
            dscore, dissues = doctor.diagnose(rtype, r["w"], r["l"], items, fixed)
            lscores.append(a["score"]); dscores.append(dscore)
            rooms_out.append({"floor": floor.get("name"), "room": room.get("name"), "room_id": room.get("id"), "doctor_score": dscore, "doctor": dissues, **a})
    pal = palette.analyze(colors) if colors else {"empty": True}
    layout_score = sum(lscores) / len(lscores) if lscores else 100
    doctor_score = sum(dscores) / len(dscores) if dscores else 100
    harmony = (pal.get("harmony") or {}).get("score", 80) if not pal.get("empty") else 80
    overall = round(0.4 * layout_score + 0.35 * doctor_score + 0.25 * harmony)
    return reply(ok(overall=overall, layout_score=round(layout_score), doctor_score=round(doctor_score), harmony_score=round(harmony), palette=pal, rooms=rooms_out))


@ai_bp.post("/architect")
def architect_route():
    g = gate()
    if g: return g
    d = body()
    k = 0.3048 if d.get("unit") == "ft" else 1.0
    brief = {
        "plot_w": num(d.get("plot_w"), 0, 0, 500) * k, "plot_l": num(d.get("plot_l"), 0, 0, 500) * k,
        "floors": int(num(d.get("floors"), 1, 1, 3)), "bedrooms": int(num(d.get("bedrooms"), 2, 1, 6)), "bathrooms": int(num(d.get("bathrooms"), 2, 1, 8)),
        "kitchen": bool(d.get("kitchen", True)), "dining": bool(d.get("dining", True)), "study": bool(d.get("study")), "pooja": bool(d.get("pooja")),
        "balcony": bool(d.get("balcony")), "garden": bool(d.get("garden", True)), "kids": bool(d.get("kids")),
    }
    try:
        plan = architect.generate(brief, seed=int(num(d.get("seed"), 11, 0, 100000)))
    except architect.PlanError as e:
        return reply(fail(str(e)), 400)
    return reply(ok(plan=plan))

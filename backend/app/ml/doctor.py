"""Design Doctor: rule-based architectural health checks on top of the geometric analysis in layout.py."""
from app.ml.layout import TALL_TYPES, _door_zones, _dims, _overlap, _rect, _window_rects

MIN_AREA = {"bedroom": 9.0, "kids": 7.5, "living": 11.0, "kitchen": 5.0, "bathroom": 2.2, "dining": 7.0, "study": 5.5, "hall": 4.0}
MIN_SIDE = {"bedroom": 2.6, "kids": 2.4, "living": 2.8, "kitchen": 1.8, "bathroom": 1.2, "dining": 2.2, "study": 2.0}
HABITABLE = {"bedroom", "kids", "living", "dining", "kitchen", "study"}
OUTDOOR = {"garden", "terrace", "balcony"}


def diagnose(room_type, w, l, items, fixed):
    """items: floor items [{id,type,name,x,z,ry,w,d}]; fixed: doors/windows. Returns (score, issues)."""
    issues = []
    if room_type in OUTDOOR:
        return 100, issues
    room = {"w": w, "l": l}
    area = w * l
    if room_type in MIN_AREA and area < MIN_AREA[room_type]:
        issues.append({"severity": "medium", "code": "small_room", "msg": f"Room is only {area:.1f} m²; a comfortable {room_type} usually needs {MIN_AREA[room_type]:.0f} m² or more.", "fix": "Enlarge the room or merge it with a neighbour."})
    if room_type in MIN_SIDE and min(w, l) < MIN_SIDE[room_type]:
        issues.append({"severity": "medium", "code": "narrow", "msg": f"Narrowest side is {min(w, l):.1f} m (recommended ≥ {MIN_SIDE[room_type]} m).", "fix": "Make the room less elongated."})
    doors = [f for f in fixed if f["type"] == "door"]
    windows = [f for f in fixed if f["type"] == "window"]
    if not doors:
        issues.append({"severity": "high", "code": "no_door", "msg": "No door - the room cannot be entered.", "fix": "Add a door from the Doors & Windows catalogue."})
    if room_type in HABITABLE:
        ratio = sum(f["w"] * f.get("h", 1.2) for f in windows) / area if area else 0
        if not windows:
            issues.append({"severity": "high", "code": "no_light", "msg": "No window: no daylight or fresh air.", "fix": "Add a window on an exterior wall."})
        elif ratio < 0.10:
            issues.append({"severity": "medium", "code": "low_light", "msg": f"Window area is {ratio * 100:.0f}% of the floor (target ≥ 10%).", "fix": "Add or enlarge a window."})
        walls = {f["wall"] for f in windows}
        if windows and len(walls) < 2:
            issues.append({"severity": "low", "code": "no_cross_vent", "msg": "Windows on only one wall: weak cross-ventilation.", "fix": "Add a window (or ventilator) on an adjacent or opposite wall."})
    elif room_type == "bathroom" and not windows:
        issues.append({"severity": "low", "code": "bath_vent", "msg": "Bathroom has no window/ventilator.", "fix": "Add a small ventilator window or plan an exhaust fan."})
    zones = _door_zones(room, doors)
    for it in items:
        if it["type"] == "rug":
            continue
        rot = int(round(float(it.get("ry", 0)))) % 180
        iw, idp = _dims(it, 90 if 45 <= rot < 135 else 0)
        r = _rect(it["x"], it["z"], iw, idp)
        if any(_overlap(r, z) > 0.03 for z in zones):
            issues.append({"severity": "medium", "code": "door_swing", "ids": [it["id"]], "msg": f"{it.get('name', it['type'])} blocks the door swing.", "fix": "Move it away from the door."})
        if it["type"] in TALL_TYPES and any(_overlap(r, wr) > 0.02 for wr in _window_rects(room, windows)):
            issues.append({"severity": "low", "code": "window_blocked", "ids": [it["id"]], "msg": f"{it.get('name', it['type'])} stands in front of a window.", "fix": "Move tall furniture to a solid wall."})
    score = 100 - sum({"high": 22, "medium": 10, "low": 4}[i["severity"]] for i in issues)
    return max(0, score), issues

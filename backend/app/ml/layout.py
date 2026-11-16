"""Room layout intelligence (pure Python).

* arrange()  - simulated annealing that places floor-standing furniture: wall affinity, clearances,
               door swing zones, chair-table / sofa-tv relations, then verified with a BFS walkability check.
* analyze()  - rasterises a room on a 10 cm grid and runs BFS from the doors to find blocked furniture.
Coordinates are metres, relative to the room centre. Item "front" is +Z at rotation 0 (rotation about Y, degrees).
"""
import math
import random
from collections import deque

WALL_TYPES = {"bed", "wardrobe", "cabinet", "bookshelf", "tv_unit", "dresser", "shoe_rack", "sofa", "fridge", "kitchen_counter",
              "washing_machine", "toilet", "washbasin", "vanity", "desk", "bedside", "hob", "kitchen_sink", "geyser", "bench"}
CORNER_TYPES = {"bathtub", "shower"}
CENTER_TYPES = {"table", "coffee_table", "kitchen_island", "rug", "fountain", "pool", "swing"}
FRONT_CLEAR = {"wardrobe": 0.7, "cabinet": 0.5, "dresser": 0.6, "kitchen_counter": 0.8, "desk": 0.6, "tv_unit": 0.8,
               "fridge": 0.7, "washbasin": 0.5, "toilet": 0.5, "bookshelf": 0.5, "sofa": 0.5, "shower": 0.4, "bathtub": 0.3}
SIDE_CLEAR = {"bed": 0.5}
TALL_TYPES = {"wardrobe", "bookshelf", "cabinet", "fridge"}
NO_BLOCK = {"rug", "curtain", "painting", "mirror", "clock", "fan", "light", "chandelier", "ac", "window", "door", "tv"}


def _dims(o, rot):
    w, d = max(0.05, float(o["w"])), max(0.05, float(o["d"]))
    return (d, w) if rot % 180 == 90 else (w, d)


def _rect(cx, cz, w, d):
    return (cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2)


def _overlap(a, b):
    ox = min(a[2], b[2]) - max(a[0], b[0])
    oz = min(a[3], b[3]) - max(a[1], b[1])
    return ox * oz if ox > 0 and oz > 0 else 0.0


def _front_rect(o, cx, cz, rot, depth):
    w, d = _dims(o, rot)
    r = rot % 360
    if r == 0:
        return _rect(cx, cz + d / 2 + depth / 2, w, depth)
    if r == 180:
        return _rect(cx, cz - d / 2 - depth / 2, w, depth)
    if r == 90:
        return _rect(cx + w / 2 + depth / 2, cz, depth, d)
    return _rect(cx - w / 2 - depth / 2, cz, depth, d)


def _door_zones(room, fixed):
    W, L = room["w"], room["l"]
    zones = []
    for f in fixed:
        if f.get("type") != "door":
            continue
        wall, t, width = f.get("wall", "S"), float(f.get("t", 0)), float(f.get("w", 0.9))
        sw = width + 0.2
        if wall == "N":
            zones.append(_rect(t, -L / 2 + sw / 2, width, sw))
        elif wall == "S":
            zones.append(_rect(t, L / 2 - sw / 2, width, sw))
        elif wall == "W":
            zones.append(_rect(-W / 2 + sw / 2, t, sw, width))
        else:
            zones.append(_rect(W / 2 - sw / 2, t, sw, width))
    return zones


def _window_rects(room, fixed):
    W, L = room["w"], room["l"]
    out = []
    for f in fixed:
        if f.get("type") != "window":
            continue
        wall, t, width = f.get("wall", "N"), float(f.get("t", 0)), float(f.get("w", 1.2))
        dep = 0.5
        if wall == "N":
            out.append(_rect(t, -L / 2 + dep / 2, width, dep))
        elif wall == "S":
            out.append(_rect(t, L / 2 - dep / 2, width, dep))
        elif wall == "W":
            out.append(_rect(-W / 2 + dep / 2, t, dep, width))
        else:
            out.append(_rect(W / 2 - dep / 2, t, dep, width))
    return out


WALL_ROT = {"N": 0, "S": 180, "E": 270, "W": 90}


def _place_on_wall(o, wall, t, W, L, rot=None):
    rot = WALL_ROT[wall] if rot is None else rot
    w, d = _dims(o, rot)
    if wall == "N":
        return (max(-W / 2 + w / 2, min(W / 2 - w / 2, t)), -L / 2 + d / 2, rot)
    if wall == "S":
        return (max(-W / 2 + w / 2, min(W / 2 - w / 2, t)), L / 2 - d / 2, rot)
    if wall == "W":
        return (-W / 2 + w / 2, max(-L / 2 + d / 2, min(L / 2 - d / 2, t)), rot)
    return (W / 2 - w / 2, max(-L / 2 + d / 2, min(L / 2 - d / 2, t)), rot)


def _random_state(o, W, L, rnd):
    pref = o["pref"]
    if pref == "wall":
        wall = rnd.choice("NSEW")
        span = (W if wall in "NS" else L) / 2
        return _place_on_wall(o, wall, rnd.uniform(-span, span), W, L)
    if pref == "corner":
        wall = rnd.choice("NSEW")
        t = (W if wall in "NS" else L) / 2 * rnd.choice((-1, 1))
        return _place_on_wall(o, wall, t * 10, W, L)
    rot = rnd.choice((0, 90, 180, 270))
    w, d = _dims(o, rot)
    return (rnd.uniform(-W / 2 + w / 2, W / 2 - w / 2) if W > w else 0, rnd.uniform(-L / 2 + d / 2, L / 2 - d / 2) if L > d else 0, rot)


def _cost(items, st, room, doors, windows):
    W, L = room["w"], room["l"]
    c = 0.0
    rects, fronts = [], []
    for o, (x, z, r) in zip(items, st):
        w, d = _dims(o, r)
        rects.append(_rect(x, z, w, d))
        fc = FRONT_CLEAR.get(o["type"], 0.0)
        fronts.append(_front_rect(o, x, z, r, fc) if fc else None)
        if x - w / 2 < -W / 2 - 1e-6 or x + w / 2 > W / 2 + 1e-6 or z - d / 2 < -L / 2 - 1e-6 or z + d / 2 > L / 2 + 1e-6:
            c += 60
    n = len(items)
    for i in range(n):
        ti = items[i]["type"]
        for j in range(i + 1, n):
            tj = items[j]["type"]
            if ti == "rug" or tj == "rug":
                continue
            c += 120 * _overlap(rects[i], rects[j])
            if fronts[i]: c += 25 * _overlap(fronts[i], rects[j]) * (0.3 if tj in ("chair", "bench") else 1)
            if fronts[j]: c += 25 * _overlap(fronts[j], rects[i]) * (0.3 if ti in ("chair", "bench") else 1)
        for z in doors:
            if ti not in NO_BLOCK:
                c += 90 * _overlap(rects[i], z)
        if ti in TALL_TYPES:
            for wr in windows:
                c += 12 * _overlap(rects[i], wr)
        x, z, r = st[i]
        pref = items[i]["pref"]
        if pref == "wall":
            w, d = _dims(items[i], r)
            gap = min(x - w / 2 + W / 2, W / 2 - x - w / 2, z - d / 2 + L / 2, L / 2 - z - d / 2)
            c += 4 * max(0.0, gap)
        elif pref == "corner":
            w, d = _dims(items[i], r)
            gx = min(x - w / 2 + W / 2, W / 2 - x - w / 2)
            gz = min(z - d / 2 + L / 2, L / 2 - z - d / 2)
            c += 5 * (max(0.0, gx) + max(0.0, gz))
        elif pref == "center":
            c += 0.6 * (abs(x) / max(W, 1) + abs(z) / max(L, 1))
    # relations
    def pos(idx): return st[idx][0], st[idx][1]
    tabs = [i for i, o in enumerate(items) if o["type"] in ("table", "desk", "kitchen_island")]
    for i, o in enumerate(items):
        t = o["type"]
        if t == "chair" and tabs:
            c += 1.5 * min(math.dist(pos(i), pos(k)) for k in tabs)
        elif t == "coffee_table":
            sofas = [k for k, p in enumerate(items) if p["type"] == "sofa"]
            if sofas:
                c += 1.5 * min(abs(math.dist(pos(i), pos(k)) - 1.4) for k in sofas)
        elif t == "bedside":
            beds = [k for k, p in enumerate(items) if p["type"] == "bed"]
            if beds:
                c += 3 * min(math.dist(pos(i), pos(k)) for k in beds)
        elif t == "tv_unit":
            sofas = [k for k, p in enumerate(items) if p["type"] == "sofa"]
            if sofas:
                k = sofas[0]
                c += 0.8 * abs(math.dist(pos(i), pos(k)) - 3.0)
                dx, dz = pos(k)[0] - pos(i)[0], pos(k)[1] - pos(i)[1]
                a = math.degrees(math.atan2(dx, dz)) % 360
                diff = min(abs(a - st[i][2]) % 360, 360 - abs(a - st[i][2]) % 360)
                c += 0.05 * diff
    return c


def arrange(room, objects, fixed=None, seed=7, iters=5000):
    """room: {w,l}; objects: [{id,type,w,d}]; fixed: [{type:'door'|'window', wall, t, w}]. Returns placements + cost."""
    W, L = float(room["w"]), float(room["l"])
    fixed = fixed or []
    items = []
    for o in objects[:60]:
        t = o["type"]
        pref = "wall" if t in WALL_TYPES else "corner" if t in CORNER_TYPES else "center" if t in CENTER_TYPES else "free"
        items.append({**o, "pref": pref})
    if not items:
        return {"placements": [], "cost": 0.0, "iterations": 0}
    # big items first = better seeds; keep original index for output
    order = sorted(range(len(items)), key=lambda i: -items[i]["w"] * items[i]["d"])
    items = [items[i] for i in order]
    doors, windows = _door_zones(room, fixed), _window_rects(room, fixed)

    best_state, best_cost = None, float("inf")
    for restart in range(3):
        rnd = random.Random(seed * 100 + restart)
        st = [_random_state(o, W, L, rnd) for o in items]
        cur = _cost(items, st, room, doors, windows)
        T0 = 6.0
        for k in range(iters // 3):
            T = T0 * (1 - k / (iters / 3)) + 0.02
            i = rnd.randrange(len(items))
            o, old = items[i], st[i]
            r = rnd.random()
            if r < 0.45:
                new = _random_state(o, W, L, rnd) if o["pref"] in ("wall", "corner") else old
                if o["pref"] in ("wall", "corner") and r < 0.2:
                    wall = rnd.choice("NSEW")
                    new = _place_on_wall(o, wall, old[0] if wall in "NS" else old[1], W, L)
            elif r < 0.85:
                if o["pref"] in ("wall", "corner"):
                    # slide along the current wall
                    rot = old[2]
                    wall = {0: "N", 180: "S", 270: "E", 90: "W"}[rot % 360]
                    cur_t = old[0] if wall in "NS" else old[1]
                    new = _place_on_wall(o, wall, cur_t + rnd.gauss(0, 0.4), W, L, rot)
                else:
                    w, d = _dims(o, old[2])
                    new = (max(-W / 2 + w / 2, min(W / 2 - w / 2, old[0] + rnd.gauss(0, 0.35))),
                           max(-L / 2 + d / 2, min(L / 2 - d / 2, old[1] + rnd.gauss(0, 0.35))), old[2])
            else:
                if o["pref"] in ("free", "center"):
                    rot = rnd.choice((0, 90, 180, 270))
                    w, d = _dims(o, rot)
                    new = (max(-W / 2 + w / 2, min(W / 2 - w / 2, old[0])), max(-L / 2 + d / 2, min(L / 2 - d / 2, old[1])), rot)
                else:
                    new = old
            st[i] = new
            nc = _cost(items, st, room, doors, windows)
            if nc <= cur or rnd.random() < math.exp((cur - nc) / T):
                cur = nc
            else:
                st[i] = old
        if cur < best_cost:
            best_cost, best_state = cur, list(st)

    placements = [{"id": o["id"], "x": round(round(x / 0.05) * 0.05, 3), "z": round(round(z / 0.05) * 0.05, 3), "ry": r % 360}
                  for o, (x, z, r) in zip(items, best_state)]
    return {"placements": placements, "cost": round(best_cost, 2), "iterations": 3 * (iters // 3),
            "method": "simulated annealing, 3 restarts"}


# ---------------------------------------------------------------- analysis

def analyze(room, objects, fixed=None, cell=0.1):
    W, L = float(room["w"]), float(room["l"])
    fixed = fixed or []
    nx, nz = max(1, int(round(W / cell))), max(1, int(round(L / cell)))
    occ = [[0] * nx for _ in range(nz)]
    owner = [[None] * nx for _ in range(nz)]
    footprints = []
    for o in objects:
        t = o["type"]
        if t in NO_BLOCK:
            continue
        rot = int(round(float(o.get("ry", 0)))) % 180
        w, d = _dims(o, 90 if 45 <= rot < 135 else 0)
        r = _rect(o["x"], o["z"], w, d)
        footprints.append((o, r))
        x0, x1 = int(max(0, (r[0] + W / 2) / cell)), int(min(nx, math.ceil((r[2] + W / 2) / cell)))
        z0, z1 = int(max(0, (r[1] + L / 2) / cell)), int(min(nz, math.ceil((r[3] + L / 2) / cell)))
        for zz in range(z0, z1):
            for xx in range(x0, x1):
                occ[zz][xx] = 1
                owner[zz][xx] = o["id"]

    total = nx * nz
    blocked = sum(sum(row) for row in occ)
    free_cells = total - blocked

    starts = []
    for f in fixed:
        if f.get("type") != "door":
            continue
        wall, t = f.get("wall", "S"), float(f.get("t", 0))
        px = {"W": 0, "E": nx - 1}.get(wall, int((t + W / 2) / cell))
        pz = {"N": 0, "S": nz - 1}.get(wall, int((t + L / 2) / cell))
        starts.append((max(0, min(nx - 1, px)), max(0, min(nz - 1, pz))))
    if not starts:
        starts = [(nx // 2, nz // 2)]

    seen = [[False] * nx for _ in range(nz)]
    dq = deque()
    for sx, sz in starts:
        # step inwards until a free cell is found (the door cell may itself be under furniture)
        for k in range(0, 8):
            cx = sx + (k if sx == 0 else -k if sx == nx - 1 else 0)
            cz = sz + (k if sz == 0 else -k if sz == nz - 1 else 0)
            if 0 <= cx < nx and 0 <= cz < nz and not occ[cz][cx]:
                seen[cz][cx] = True
                dq.append((cx, cz))
                break
    reach = len(dq)
    while dq:
        cx, cz = dq.popleft()
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ax, az = cx + dx, cz + dz
            if 0 <= ax < nx and 0 <= az < nz and not seen[az][ax] and not occ[az][ax]:
                seen[az][ax] = True
                reach += 1
                dq.append((ax, az))

    issues = []
    for o, r in footprints:
        # can a person reach any cell touching this piece?
        x0, x1 = int(max(0, (r[0] + W / 2) / cell)) - 1, int(min(nx, math.ceil((r[2] + W / 2) / cell)))
        z0, z1 = int(max(0, (r[1] + L / 2) / cell)) - 1, int(min(nz, math.ceil((r[3] + L / 2) / cell)))
        touch = False
        for zz in range(max(0, z0), min(nz, z1 + 1)):
            for xx in range(max(0, x0), min(nx, x1 + 1)):
                if seen[zz][xx]:
                    touch = True
                    break
            if touch:
                break
        if not touch:
            issues.append({"severity": "high", "code": "unreachable", "ids": [o["id"]], "msg": f"{o.get('name', o['type'])} cannot be reached from the door."})
        if r[0] < -W / 2 - 0.02 or r[2] > W / 2 + 0.02 or r[1] < -L / 2 - 0.02 or r[3] > L / 2 + 0.02:
            issues.append({"severity": "high", "code": "outside", "ids": [o["id"]], "msg": f"{o.get('name', o['type'])} sticks out of the room."})
    for i in range(len(footprints)):
        for j in range(i + 1, len(footprints)):
            a, b = footprints[i], footprints[j]
            if "rug" in (a[0]["type"], b[0]["type"]):
                continue
            ov = _overlap(a[1], b[1])
            if ov > 0.04:
                issues.append({"severity": "medium", "code": "overlap", "ids": [a[0]["id"], b[0]["id"]],
                               "msg": f"{a[0].get('name', a[0]['type'])} overlaps {b[0].get('name', b[0]['type'])}."})
    for o, r in footprints:
        fc = FRONT_CLEAR.get(o["type"])
        if fc:
            rot = int(o.get("ry", 0)) % 360
            rot = min((0, 90, 180, 270), key=lambda a: min(abs(rot - a), 360 - abs(rot - a)))
            fr = _front_rect(o, o["x"], o["z"], rot, fc)
            for o2, r2 in footprints:
                if o2 is not o and _overlap(fr, r2) > 0.05 and o2["type"] not in ("chair", "bench"):
                    issues.append({"severity": "low", "code": "clearance", "ids": [o["id"], o2["id"]],
                                   "msg": f"Not enough walking space in front of {o.get('name', o['type'])}."})
                    break

    area = W * L
    coverage = 100 * blocked * cell * cell / area if area else 0
    circulation = 100 * reach / free_cells if free_cells else 0
    score = 100.0
    score -= sum({"high": 14, "medium": 8, "low": 3}[i["severity"]] for i in issues)
    if coverage > 55: score -= (coverage - 55) * 0.8
    if circulation < 90: score -= (90 - circulation) * 0.6
    return {
        "score": int(max(0, min(100, round(score)))),
        "coverage_pct": round(coverage, 1),
        "circulation_pct": round(circulation, 1),
        "free_area_m2": round(free_cells * cell * cell, 2),
        "issues": issues[:25],
        "method": "10 cm occupancy grid + BFS walkability from doors",
    }

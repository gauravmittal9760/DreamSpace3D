"""AI Smart Home Architect - generates an initial floor plan from a brief.

Method: the buildable footprint is split into rooms by a *slicing floor-plan* (binary space partition).
Thousands of random room orderings are generated and scored by a cost function (aspect ratios, minimum
dimensions, natural light access, kitchen-dining-living adjacency, attached bathrooms ...); the best plan
wins. Doors are then routed with a connectivity solver and windows are placed on exterior walls.
Pure Python, deterministic for a given seed. Not an architectural/structural approval.
"""
import random

TARGET = {"living": 15, "dining": 9, "kitchen": 7.5, "master": 12.5, "bedroom": 10, "bath": 3.6, "study": 7, "balcony": 4, "kids": 9, "pooja": 2.2}
MIN_SIDE = {"living": 2.8, "dining": 2.2, "kitchen": 1.9, "master": 2.9, "bedroom": 2.6, "bath": 1.4, "study": 2.0, "balcony": 1.1, "kids": 2.4, "pooja": 1.2}
HABITABLE = {"living", "dining", "kitchen", "master", "bedroom", "study", "kids"}
TYPE_MAP = {"master": "bedroom", "bedroom": "bedroom", "kids": "kids", "bath": "bathroom", "living": "living", "dining": "dining", "kitchen": "kitchen",
            "study": "study", "balcony": "balcony", "pooja": "room", "hall": "hall"}
NAMES = {"living": "Living Room", "dining": "Dining", "kitchen": "Kitchen", "master": "Master Bedroom", "bedroom": "Bedroom", "bath": "Bathroom",
         "study": "Study", "balcony": "Balcony", "kids": "Kids Room", "pooja": "Pooja Room", "hall": "Passage & Stairs"}
STRIP_W = 2.1


class PlanError(ValueError):
    pass


def program_for_floors(brief):
    """Distribute the requested rooms over the floors."""
    floors = max(1, min(3, int(brief.get("floors", 1))))
    beds = max(1, min(6, int(brief.get("bedrooms", 2))))
    baths = max(1, min(8, int(brief.get("bathrooms", 2))))
    lists = [[] for _ in range(floors)]
    lists[0] += ["living"]
    if brief.get("dining", True): lists[0].append("dining")
    if brief.get("kitchen", True): lists[0].append("kitchen")
    if brief.get("pooja"): lists[0].append("pooja")
    if brief.get("study"): lists[min(floors - 1, 1) if floors > 1 else 0].append("study")
    ground_beds = beds if floors == 1 else 1
    bed_slots = [0 if i < ground_beds else 1 + (i - ground_beds) % max(1, floors - 1) for i in range(beds)]
    for i, fl in enumerate(bed_slots):
        lists[fl].append("master" if i == 0 else "kids" if (brief.get("kids") and i == beds - 1 and beds > 2) else "bedroom")
    for i in range(baths):  # attach to bedrooms first, remaining as common baths on the ground floor
        lists[bed_slots[i] if i < beds else 0].append("bath")
    if brief.get("balcony"):
        lists[1 if floors > 1 else 0].append("balcony")
    return lists


def _split(items, rect, rnd, jitter):
    x, z, w, l = rect
    if len(items) == 1:
        return [(items[0], rect)]
    total = sum(a for _, a in items)
    acc, best, bd = 0.0, 1, 1e18
    for i in range(1, len(items)):
        acc += items[i - 1][1]
        d = abs(acc - total / 2)
        if d < bd:
            best, bd = i, d
    if jitter and len(items) > 2 and rnd.random() < 0.3:
        best = max(1, min(len(items) - 1, best + rnd.choice((-1, 1))))
    g1, g2 = items[:best], items[best:]
    f = sum(a for _, a in g1) / total
    along_x = (w >= l) if rnd.random() < 0.85 else (w < l)
    if along_x:
        w1 = w * f
        return _split(g1, (x, z, w1, l), rnd, jitter) + _split(g2, (x + w1, z, w - w1, l), rnd, jitter)
    l1 = l * f
    return _split(g1, (x, z, w, l1), rnd, jitter) + _split(g2, (x, z + l1, w, l - l1), rnd, jitter)


def _shared(a, b):
    """length of the common wall between rectangles a and b (x, z, w, l)."""
    ax, az, aw, al = a; bx, bz, bw, bl = b
    if abs(ax + aw - bx) < 1e-3 or abs(bx + bw - ax) < 1e-3:
        return max(0.0, min(az + al, bz + bl) - max(az, bz))
    if abs(az + al - bz) < 1e-3 or abs(bz + bl - az) < 1e-3:
        return max(0.0, min(ax + aw, bx + bw) - max(ax, bx))
    return 0.0


def _exterior(rect, region):
    x, z, w, l = rect; rx, rz, rw, rl = region
    out = {}
    if abs(z - rz) < 1e-3: out["N"] = w
    if abs(z + l - (rz + rl)) < 1e-3: out["S"] = w
    if abs(x - rx) < 1e-3: out["W"] = l
    return out


ADJ_GOOD = [("kitchen", "dining", 10), ("dining", "living", 8), ("kitchen", "living", 4), ("study", "living", 2), ("pooja", "living", 3)]


def _score(placed, region, attached):
    sc = 0.0
    for name, r in placed:
        x, z, w, l = r
        ratio = max(w, l) / max(1e-6, min(w, l))
        if ratio > 1.6: sc -= (ratio - 1.6) * 7
        mn = MIN_SIDE.get(name, 2.0)
        if min(w, l) < mn: sc -= 18 + (mn - min(w, l)) * 25
        ext = _exterior(r, region)
        if name in HABITABLE and not any(v >= 1.2 for v in ext.values()): sc -= 25
        if name == "balcony" and not any(v >= 1.5 for v in ext.values()): sc -= 40
        if name == "living" and ext.get("S", 0) >= 2: sc += 6
        if name == "bath" and any(v >= 0.9 for v in ext.values()): sc += 3
    for i in range(len(placed)):
        for j in range(i + 1, len(placed)):
            s = _shared(placed[i][1], placed[j][1])
            if s < 1.0: continue
            a, b = placed[i][0], placed[j][0]
            for p, q, bonus in ADJ_GOOD:
                if {a, b} == {p, q}: sc += bonus
            if {a, b} in ({"kitchen", "master"}, {"kitchen", "bedroom"}): sc -= 6
    return sc


def _layout_region(names, region, rnd, tries=1500):
    rx, rz, rw, rl = region
    area = rw * rl
    base = [(n, TARGET[n]) for n in names]
    need = sum(a for _, a in base)
    if (area * 0.97) / need < 0.7:
        raise PlanError("The plot is too small for this room list. Reduce rooms or increase plot size.")
    items0 = [(n, a * area / need) for n, a in base]
    best, best_sc = None, -1e18
    for t in range(tries):
        items = items0[:]
        rnd.shuffle(items)
        placed = [(it[0], r) for it, r in _split(items, region, rnd, jitter=t % 2 == 1)]
        attached = set()
        baths = [i for i, (n, _) in enumerate(placed) if n == "bath"]
        beds = [i for i, (n, _) in enumerate(placed) if n in ("master", "bedroom", "kids")]
        used = set()
        for b in baths:
            cand = sorted(((_shared(placed[b][1], placed[k][1]), k) for k in beds if k not in used), reverse=True)
            if cand and cand[0][0] >= 1.0:
                attached.add((b, cand[0][1])); used.add(cand[0][1])
        sc = _score(placed, region, attached) + 16 * len(attached)
        if sc > best_sc:
            best_sc, best = sc, placed
    return best, best_sc


def _door(a_rect, b_rect, width=0.9):
    """door on the wall of `a` shared with `b`: (wall_of_a, t_relative_to_a_center, shared_len) or None."""
    ax, az, aw, al = a_rect; bx, bz, bw, bl = b_rect
    if abs(ax + aw - bx) < 1e-3:
        lo, hi, wall, c = max(az, bz), min(az + al, bz + bl), "E", az + al / 2
    elif abs(bx + bw - ax) < 1e-3:
        lo, hi, wall, c = max(az, bz), min(az + al, bz + bl), "W", az + al / 2
    elif abs(az + al - bz) < 1e-3:
        lo, hi, wall, c = max(ax, bx), min(ax + aw, bx + bw), "S", ax + aw / 2
    elif abs(bz + bl - az) < 1e-3:
        lo, hi, wall, c = max(ax, bx), min(ax + aw, bx + bw), "N", ax + aw / 2
    else:
        return None
    if hi - lo < width + 0.3:
        return None
    return wall, round(((lo + hi) / 2 - c), 2), round(hi - lo, 2)


def _connect(rooms, entrance_idx):
    """Choose doors so that every room is reachable from the entrance."""
    n = len(rooms)
    pref = {"living": ["hall", "dining"], "dining": ["living", "kitchen", "hall"], "kitchen": ["dining", "hall", "living"], "bath": ["bedroom", "master", "kids", "hall"],
            "master": ["hall", "bath", "living"], "bedroom": ["hall", "living"], "kids": ["hall", "living"], "study": ["hall", "living"],
            "balcony": ["living", "master", "bedroom", "dining", "kids"], "pooja": ["living", "hall"], "hall": []}
    connected, edges = {entrance_idx}, []
    for _ in range(n * 2):
        pending = [i for i in range(n) if i not in connected]
        if not pending:
            break
        progress = False
        for i in sorted(pending, key=lambda k: (rooms[k]["name"] == "bath", k)):
            cands = []
            for j in connected:
                if _door(rooms[i]["rect"], rooms[j]["rect"]) is None:
                    continue
                order = pref.get(rooms[i]["name"], [])
                rank = order.index(rooms[j]["name"]) if rooms[j]["name"] in order else len(order) + 1
                cands.append((rank, -_shared(rooms[i]["rect"], rooms[j]["rect"]), j))
            if cands:
                cands.sort()
                edges.append((i, cands[0][2])); connected.add(i); progress = True
        if not progress:
            break
    return edges, [i for i in range(n) if i not in connected]


def generate(brief, seed=11):
    W, L = float(brief["plot_w"]), float(brief["plot_l"])
    if not (6 <= W <= 80 and 6 <= L <= 80):
        raise PlanError("Plot sides must be between 6 and 80 metres.")
    garden = bool(brief.get("garden", True))
    front = 3.0 if garden else 1.5
    side, rear = 1.0, 1.0
    fw, fl = W - 2 * side, L - front - rear
    if fw < 4.5 or fl < 5:
        raise PlanError("Plot is too small after setbacks (need at least ~6.5 m x 9 m).")
    rnd = random.Random(seed)
    lists = program_for_floors(brief)
    multi = len(lists) > 1
    strip = STRIP_W if (multi or fw > 7.5) else 0.0
    region = (0.0, 0.0, fw - strip, fl)   # x 0..fw (left->right), z 0..fl (rear/north -> front/south)
    floors, notes, scores = [], [], []
    doors, windows = [], []
    ox, oz = -fw / 2, -L / 2 + rear        # footprint origin in plot-centred coordinates
    for fi, names in enumerate(lists):
        placed, sc = _layout_region(names, region, rnd)
        scores.append(sc)
        rooms = [{"name": n, "rect": r} for n, r in placed]
        if strip:
            rooms.append({"name": "hall", "rect": (fw - strip, 0.0, strip, fl)})
        entrance = len(rooms) - 1 if strip else max(range(len(rooms)), key=lambda i: (rooms[i]["name"] == "living", rooms[i]["rect"][1] + rooms[i]["rect"][3]))
        edges, orphans = _connect(rooms, entrance)
        fr = []
        for i, rm in enumerate(rooms):
            x, z, w, l = rm["rect"]
            idx = sum(1 for k in range(i) if rooms[k]["name"] == rm["name"] and rm["name"] in ("bedroom", "bath")) + 1
            many = sum(1 for q in rooms if q["name"] == rm["name"]) > 1
            label = NAMES[rm["name"]] + (f" {idx}" if rm["name"] in ("bedroom", "bath") and many else "")
            fr.append({"id": f"f{fi}r{i}", "kind": rm["name"], "type": TYPE_MAP[rm["name"]], "name": label, "x": round(ox + x + w / 2, 2), "z": round(oz + z + l / 2, 2), "w": round(w, 2), "l": round(l, 2)})
        for i, j in edges:
            d = _door(rooms[i]["rect"], rooms[j]["rect"])
            if d:
                wall, t, _ln = d
                kind = "glass" if "balcony" in (rooms[i]["name"], rooms[j]["name"]) else "bath" if "bath" in (rooms[i]["name"], rooms[j]["name"]) else "main"
                doors.append({"room": fr[i]["id"], "wall": wall, "t": t, "kind": kind})
        if fi == 0:
            doors.append({"room": fr[entrance]["id"], "wall": "S", "t": 0.0, "kind": "entrance"})
        for i, rm in enumerate(rooms):
            ext = {"E": fl, "N": strip} if rm["name"] == "hall" else _exterior(rm["rect"], region)
            kindw = "vent" if rm["name"] == "bath" else "window"
            for wall, ln in ext.items():
                if rm["name"] == "balcony" or ln < (0.9 if kindw == "vent" else 1.6):
                    continue
                n = 1 if kindw == "vent" else max(1, int(ln // 3.0))
                for k in range(n):
                    windows.append({"room": fr[i]["id"], "wall": wall, "t": round(-ln / 2 + ln * (k + 0.5) / n, 2), "kind": kindw})
        for o in orphans:
            notes.append(f"{fr[o]['name']} on floor {fi + 1} has no direct door - connect it through a corridor.")
        floors.append({"name": ["Ground Floor", "First Floor", "Second Floor"][fi], "height": 3.2 if fi == 0 else 3.0, "rooms": fr})
    garden_room = None
    if garden:
        garden_room = {"id": "garden", "kind": "garden", "type": "garden", "name": "Front Garden", "x": 0.0, "z": round(L / 2 - front / 2, 2), "w": round(W, 2), "l": round(front, 2)}
    quality = max(0, min(100, round(70 + sum(scores) / max(1, len(scores)) / 2)))
    return {"footprint": {"w": round(fw, 2), "l": round(fl, 2), "x": 0.0, "z": round(oz + fl / 2, 2)}, "floors": floors, "doors": doors, "windows": windows,
            "garden": garden_room, "plot": {"w": W, "l": L}, "score": quality, "notes": notes, "strip": strip,
            "method": "slicing floor-plan search (1500 random plans / floor) + connectivity-based door routing"}

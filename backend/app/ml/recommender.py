"""Item-item co-occurrence recommender (PMI / lift) trained on real rooms stored in Neon.

* Real rooms (every room saved by every user) count with weight 1.
* A small bootstrap prior (synthetic rooms sampled from the room-type templates below) has weight
  PRIOR_WEIGHT so that the very first users still get sensible suggestions. As real data grows, the
  prior is automatically drowned out - the API reports exactly how many real/prior rooms were used.
"""
import math
import random
import time
from collections import Counter, defaultdict

from app import db
from app.models.project import Project

PRIOR_WEIGHT = 0.15
PRIOR_ROOMS_PER_TYPE = 40
SINGULAR_EXCLUDE = {"bed", "wardrobe", "sofa", "tv", "tv_unit", "fridge", "toilet", "washbasin", "bathtub", "shower",
                    "kitchen_counter", "hob", "chimney", "kitchen_sink", "desk", "coffee_table", "table", "microwave",
                    "washing_machine", "geyser", "fountain", "pool", "gate", "stairs"}
STRUCTURAL = {"door", "window"}

PRIOR = {
    "bedroom": {"bed": .98, "wardrobe": .85, "bedside": .7, "ac": .5, "fan": .8, "dresser": .4, "tv": .3, "curtain": .7,
                "rug": .4, "window": .9, "door": 1, "lamp": .5, "chair": .3, "desk": .2, "painting": .4, "plant": .3, "light": .6},
    "living": {"sofa": .97, "coffee_table": .8, "tv": .85, "tv_unit": .6, "fan": .85, "ac": .5, "rug": .6, "curtain": .75,
               "plant": .5, "painting": .6, "lamp": .5, "window": .9, "door": 1, "cabinet": .35, "chair": .4,
               "bookshelf": .25, "chandelier": .25, "light": .5, "clock": .3, "vase": .3},
    "kitchen": {"kitchen_counter": .95, "hob": .8, "chimney": .6, "kitchen_sink": .9, "fridge": .85, "microwave": .6,
                "cabinet": .5, "window": .8, "door": 1, "light": .7, "fan": .4, "table": .3, "chair": .3,
                "washing_machine": .2, "geyser": .2},
    "bathroom": {"toilet": .98, "washbasin": .95, "shower": .7, "bathtub": .25, "mirror": .8, "geyser": .6, "door": 1,
                 "window": .5, "vanity": .3, "light": .6, "washing_machine": .15},
    "dining": {"table": .98, "chair": .95, "cabinet": .4, "fan": .8, "chandelier": .4, "light": .5, "window": .7,
               "door": 1, "painting": .4, "plant": .3, "curtain": .4},
    "study": {"desk": .95, "chair": .95, "bookshelf": .8, "lamp": .6, "fan": .6, "window": .8, "door": 1, "ac": .3,
              "cabinet": .3, "plant": .3, "painting": .2, "light": .4, "rug": .2},
    "kids": {"bed": .95, "desk": .6, "chair": .6, "wardrobe": .7, "bookshelf": .5, "rug": .6, "fan": .8, "window": .8,
             "door": 1, "lamp": .4, "curtain": .5, "plant": .1},
    "balcony": {"plant": .9, "chair": .6, "table": .4, "railing": .8, "light": .4, "bench": .3, "swing": .15},
    "terrace": {"bench": .4, "plant": .7, "table": .3, "chair": .4, "railing": .8, "pergola": .2, "lamp_post": .2},
    "garden": {"tree": .9, "bush": .8, "bench": .6, "fountain": .3, "lamp_post": .5, "swing": .3, "fence": .6,
               "gate": .5, "pergola": .3, "pool": .15, "plant": .8},
}

_model = {"sig": None, "at": 0, "m": None}


class Model:
    def __init__(self):
        self.N = 0.0
        self.ci = defaultdict(float)
        self.cij = defaultdict(float)
        self.cr = defaultdict(float)          # room-type totals
        self.cri = defaultdict(float)         # (room type, item)
        self.key_by_type = defaultdict(Counter)  # (room_type, type) -> Counter(key) from real rooms
        self.real = 0
        self.prior = 0

    def add(self, rtype, types, w, keys=None):
        s = set(types)
        self.N += w
        self.cr[rtype] += w
        for a in s:
            self.ci[a] += w
            self.cri[(rtype, a)] += w
            for b in s:
                if a != b:
                    self.cij[(a, b)] += w
        if keys:
            for t, k in keys:
                self.key_by_type[(rtype, t)][k] += 1
                self.key_by_type[("*", t)][k] += 1


def _train():
    m = Model()
    for (data,) in db.session.query(Project.project_data).yield_per(100):
        for floor in (data or {}).get("floors") or []:
            for room in floor.get("rooms") or []:
                objs = room.get("objects") or []
                types = [o.get("type") for o in objs if o.get("type")]
                if types:
                    m.add(room.get("type") or "room", types, 1.0, [(o["type"], o.get("key") or o["type"]) for o in objs if o.get("type")])
                    m.real += 1
    rnd = random.Random(20260101)
    for rtype, probs in PRIOR.items():
        for _ in range(PRIOR_ROOMS_PER_TYPE):
            m.add(rtype, [t for t, p in probs.items() if rnd.random() < p], PRIOR_WEIGHT)
            m.prior += 1
    return m


def get_model():
    total, last = db.session.query(db.func.count(Project.id), db.func.max(Project.updated_at)).one()
    sig = (total, str(last))
    if _model["m"] is None or sig != _model["sig"] or time.time() - _model["at"] > 300:
        _model.update(m=_train(), sig=sig, at=time.time())
    return _model["m"]


def recommend(room_type, present_types, limit=8):
    m = get_model()
    present = Counter(present_types)
    have = set(present)
    alpha = 0.5
    cands = {t for t in m.ci if t not in STRUCTURAL}
    scored = []
    cr = max(m.cr.get(room_type, 0.0), 0.0)
    for j in cands:
        if j in have and (j in SINGULAR_EXCLUDE or present[j] >= 3):
            continue
        # prior of the item inside this room type (falls back to global frequency)
        if cr > 0:
            p_j = (m.cri.get((room_type, j), 0.0) + alpha) / (cr + 2 * alpha)
        else:
            p_j = (m.ci[j] + alpha) / (m.N + 2 * alpha)
        score = math.log(p_j)
        because = []
        for i in have:
            if i in STRUCTURAL:
                continue
            lift = ((m.cij.get((i, j), 0.0) + alpha) * m.N) / ((m.ci[i] + alpha) * (m.ci[j] + alpha))
            score += 0.5 * math.log(lift)
            because.append((math.log(lift), i, lift))
        because.sort(reverse=True)
        scored.append((score, j, p_j, [b for b in because if b[0] > 0.15][:2]))
    scored.sort(reverse=True)
    out = []
    for score, j, p_j, because in scored[:limit]:
        pk = m.key_by_type.get((room_type, j)) or m.key_by_type.get(("*", j))
        out.append({
            "type": j,
            "relevance": round(100 / (1 + math.exp(-(score + 1.2))), 1),
            "room_frequency": round(p_j * 100, 1),
            "because": [{"type": i, "lift": round(l, 2)} for _, i, l in because],
            "popular_key": pk.most_common(1)[0][0] if pk else None,
        })
    return {
        "suggestions": out,
        "model": {"name": "item-item PMI co-occurrence", "real_rooms": m.real, "prior_rooms": m.prior,
                  "prior_weight": PRIOR_WEIGHT, "item_types": len(m.ci)},
    }

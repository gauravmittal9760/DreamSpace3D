"""Colour science: k-means palette extraction, hue-template harmony fitting (Matsuda-style), accent generation."""
import colorsys
import math
import random
import re

HEX = re.compile(r"^#?([0-9a-fA-F]{6})$")

TEMPLATES = {
    "monochromatic": [(0, 14)],
    "analogous": [(0, 45)],
    "complementary": [(0, 16), (180, 16)],
    "split-complementary": [(0, 16), (150, 16), (210, 16)],
    "triadic": [(0, 16), (120, 16), (240, 16)],
    "tetradic": [(0, 16), (90, 16), (180, 16), (270, 16)],
}


def parse_hex(h):
    m = HEX.match(str(h or "").strip())
    if not m:
        return None
    v = m.group(1)
    return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4))


def to_hex(rgb):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(c)))) for c in rgb)


def hsl(rgb):
    r, g, b = (c / 255 for c in rgb)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s, l


def from_hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, max(0, min(1, l)), max(0, min(1, s)))
    return (r * 255, g * 255, b * 255)


def kmeans(points, weights, k, rnd, iters=25):
    k = min(k, len(points))
    cent = [points[rnd.randrange(len(points))]]
    while len(cent) < k:  # k-means++ seeding
        d2 = [min(sum((a - b) ** 2 for a, b in zip(p, c)) for c in cent) * w for p, w in zip(points, weights)]
        tot = sum(d2)
        if tot == 0:
            break
        r, acc = rnd.random() * tot, 0
        for p, d in zip(points, d2):
            acc += d
            if acc >= r:
                cent.append(p)
                break
    for _ in range(iters):
        groups = [[] for _ in cent]
        for idx, p in enumerate(points):
            j = min(range(len(cent)), key=lambda c: sum((a - b) ** 2 for a, b in zip(p, cent[c])))
            groups[j].append(idx)
        moved = False
        for j, g in enumerate(groups):
            if not g:
                continue
            tw = sum(weights[i] for i in g)
            new = tuple(sum(points[i][c] * weights[i] for i in g) / tw for c in range(3))
            if any(abs(a - b) > 0.5 for a, b in zip(new, cent[j])):
                moved = True
            cent[j] = new
        if not moved:
            break
    shares = [0.0] * len(cent)
    for idx, p in enumerate(points):
        j = min(range(len(cent)), key=lambda c: sum((a - b) ** 2 for a, b in zip(p, cent[c])))
        shares[j] += weights[idx]
    tot = sum(shares) or 1
    return [(c, s / tot) for c, s in zip(cent, shares)]


def hue_dist(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


def fit_harmony(hues):
    """hues: [(hue, weight)] -> (template, rotation, score 0-100)"""
    if not hues:
        return None, 0, 100.0
    tw = sum(w for _, w in hues)
    best = (None, 0, 1e9)
    for name, sectors in TEMPLATES.items():
        for rot in range(0, 360, 5):
            err = 0.0
            for h, w in hues:
                err += w * min(max(0.0, hue_dist(h, (rot + c) % 360) - half) for c, half in sectors)
            if err < best[2]:
                best = (name, rot, err)
    mean_err = best[2] / tw
    return best[0], best[1], round(max(0.0, 100 - mean_err / 60 * 100), 1)


def analyze(colors, seed=3, k=5):
    """colors: [{hex, weight}] or [hex]."""
    pts, wts = [], []
    for c in colors[:400]:
        hx, w = (c.get("hex"), float(c.get("weight", 1))) if isinstance(c, dict) else (c, 1.0)
        rgb = parse_hex(hx)
        if rgb:
            pts.append(rgb)
            wts.append(max(0.01, w))
    if not pts:
        return {"empty": True}
    rnd = random.Random(seed)
    clusters = sorted(kmeans(pts, wts, k, rnd), key=lambda x: -x[1])
    dominant = []
    hues = []
    for rgb, share in clusters:
        h, s, l = hsl(rgb)
        dominant.append({"hex": to_hex(rgb), "share": round(share * 100, 1), "hue": round(h), "sat": round(s, 2), "light": round(l, 2)})
        if s > 0.14 and 0.1 < l < 0.92:  # neutrals/near-black/white fit every scheme
            hues.append((h, share * s))
    template, rot, score = fit_harmony(hues)
    avg_s = sum(d["sat"] * d["share"] for d in dominant) / 100
    avg_l = sum(d["light"] * d["share"] for d in dominant) / 100
    warm = sum(d["share"] for d in dominant if d["sat"] > 0.14 and (d["hue"] < 70 or d["hue"] > 320))
    cool = sum(d["share"] for d in dominant if d["sat"] > 0.14 and 70 <= d["hue"] <= 320)
    mood = "neutral" if warm + cool < 25 else "warm" if warm > cool * 1.3 else "cool" if cool > warm * 1.3 else "balanced"
    base = max(dominant, key=lambda d: d["share"] * (0.3 + d["sat"]))
    bh = base["hue"]
    suggestions = []
    for label, dh, sat, lit in (("Analogous soft", 30, 0.35, 0.7), ("Complement accent", 180, 0.55, 0.5),
                                ("Triadic pop", 120, 0.5, 0.55), ("Quiet neutral", 0, 0.08, 0.9), ("Deep anchor", -30, 0.4, 0.22)):
        suggestions.append({"label": label, "hex": to_hex(from_hsl(bh + dh, sat, lit))})
    return {
        "dominant": dominant,
        "harmony": {"template": template, "rotation": rot, "score": score},
        "mood": mood, "avg_saturation": round(avg_s, 2), "avg_lightness": round(avg_l, 2),
        "suggestions": suggestions, "method": "weighted k-means++ (RGB) + hue-template fitting",
    }

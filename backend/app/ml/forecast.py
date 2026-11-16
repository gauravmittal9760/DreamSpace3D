"""Ordinary-least-squares trend + residual band, written from scratch."""
import math


def ols(ys):
    n = len(ys)
    if n < 2:
        return 0.0, (ys[0] if ys else 0.0), 0.0, 0.0
    xs = list(range(n))
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    slope = sxy / sxx if sxx else 0.0
    icpt = my - slope * mx
    pred = [icpt + slope * x for x in xs]
    ss_res = sum((y - p) ** 2 for y, p in zip(ys, pred))
    ss_tot = sum((y - my) ** 2 for y in ys)
    r2 = 1 - ss_res / ss_tot if ss_tot else 0.0
    sigma = math.sqrt(ss_res / max(1, n - 2))
    return slope, icpt, r2, sigma


def ewma(ys, alpha=0.35):
    out, s = [], None
    for y in ys:
        s = y if s is None else alpha * y + (1 - alpha) * s
        out.append(s)
    return out


def forecast(daily_counts, horizon=7):
    """daily_counts: list of ints (oldest -> newest). Returns trend + next `horizon` days."""
    ys = [float(v) for v in daily_counts]
    smooth = ewma(ys)
    slope, icpt, r2, sigma = ols(smooth)
    n = len(ys)
    future = []
    for h in range(1, horizon + 1):
        mid = max(0.0, icpt + slope * (n - 1 + h))
        band = 1.96 * sigma * math.sqrt(1 + 1 / max(n, 1))
        future.append({"day": h, "value": round(mid, 2), "low": round(max(0.0, mid - band), 2), "high": round(mid + band, 2)})
    direction = "rising" if slope > 0.02 else "falling" if slope < -0.02 else "flat"
    return {
        "slope_per_day": round(slope, 4), "r2": round(max(0.0, r2), 3), "direction": direction,
        "smoothed": [round(v, 2) for v in smooth], "future": future,
        "next_total": round(sum(f["value"] for f in future), 1),
        "method": "EWMA smoothing + ordinary least squares, 95% residual band",
    }

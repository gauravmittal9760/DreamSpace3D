import time
from collections import defaultdict, deque

_hits = defaultdict(deque)


def allow(key, limit, per_seconds):
    """Tiny in-memory sliding-window limiter (per process; good enough for abuse protection on one gunicorn worker)."""
    now = time.time()
    q = _hits[key]
    while q and now - q[0] > per_seconds:
        q.popleft()
    if len(q) >= limit:
        return False
    q.append(now)
    if len(_hits) > 5000:
        for k in list(_hits)[:1000]:
            _hits.pop(k, None)
    return True

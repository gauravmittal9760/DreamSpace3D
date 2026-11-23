"""Admin-controlled feature switches (stored in Neon, read by both the API and the frontend)."""
from app.services import settings_store as store

DEFAULTS = {"signup": True, "ai": True, "sharing": True, "collab": True}
LABELS = {"signup": "New user sign-ups", "ai": "AI tools (suggest / arrange / architect / doctor)", "sharing": "Public share links", "collab": "Collaboration & comments"}


def all_flags():
    saved = store.get_json("features", {}) or {}
    return {k: bool(saved.get(k, v)) for k, v in DEFAULTS.items()}


def enabled(name):
    return all_flags().get(name, True)


def set_flags(new):
    cur = all_flags()
    for k, v in (new or {}).items():
        if k in DEFAULTS:
            cur[k] = bool(v)
    store.put_json("features", cur)
    return cur

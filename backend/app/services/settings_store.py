import json

from app import db
from app.models.misc import AppSetting


def get(key, default=None):
    row = db.session.get(AppSetting, key)
    return row.value if row and row.value is not None else default


def put(key, value, commit=True):
    row = db.session.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key, value=value)
        db.session.add(row)
    else:
        row.value = value
    if commit:
        db.session.commit()


def remove(key, commit=True):
    row = db.session.get(AppSetting, key)
    if row:
        db.session.delete(row)
        if commit:
            db.session.commit()


def get_json(key, default=None):
    raw = get(key)
    if not raw:
        return default
    try:
        return json.loads(raw)
    except ValueError:
        return default


def put_json(key, value, commit=True):
    put(key, json.dumps(value), commit=commit)

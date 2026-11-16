import json

from flask import Blueprint, jsonify

from app import db
from app.routes.common import body, current_user, fail, ok
from app.services import settings_store as store

catalog_bp = Blueprint("catalog", __name__, url_prefix="/api/catalog")


@catalog_bp.get("/prices")
def prices():
    """Price overrides set by the admin (INR). The frontend merges them over its default catalogue prices."""
    return jsonify(ok(prices=store.get_json("price_overrides", {}) or {}))

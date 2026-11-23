import re

from flask import Blueprint, jsonify, request

from app.models.extra import Product
from app.routes.common import body, ok
from app.services import features
from app.services import settings_store as store

catalog_bp = Blueprint("catalog", __name__, url_prefix="/api")


@catalog_bp.get("/catalog/prices")
def prices():
    """Price overrides set by the admin (INR). The frontend merges them over its default catalogue prices."""
    return jsonify(ok(prices=store.get_json("price_overrides", {}) or {}))


@catalog_bp.get("/catalog/features")
def feature_flags():
    return jsonify(ok(features=features.all_flags()))


@catalog_bp.get("/catalog/products")
def products():
    """Real purchasable products matching an item type (managed by the admin)."""
    t = (request.args.get("type") or "")[:30]
    q = Product.query.filter_by(in_stock=True)
    if t:
        q = q.filter_by(item_type=t)
    return jsonify(ok(products=[p.to_dict() for p in q.order_by(Product.price).limit(60).all()]))


@catalog_bp.post("/telemetry/error")
def client_error():
    """Frontend crash reports. Only a short message + route are stored - never request bodies, tokens or design data."""
    from app.services.activity import log_event
    from app.services.ratelimit import allow
    if not allow(f"tele:{request.remote_addr}", 10, 60):
        return jsonify(ok()), 429
    d = body()
    msg = re.sub(r"\s+", " ", str(d.get("message", "")))[:220]
    log_event("error", detail=f"[web] {str(d.get('where', ''))[:80]}: {msg}", actor="system")
    return jsonify(ok())

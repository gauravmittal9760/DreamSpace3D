
import logging
import os
import ssl
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.engine import make_url
from werkzeug.middleware.proxy_fix import ProxyFix


ROOT = Path(__file__).resolve().parents[2]

load_dotenv(ROOT / ".env")
load_dotenv()

db = SQLAlchemy()
log = logging.getLogger("dreamspace")


def database_uri():
    url = os.getenv("DATABASE_URL", "").strip()

    if not url:
        if os.getenv("ALLOW_SQLITE") == "1":
            return "sqlite://"

        raise RuntimeError(
            "DATABASE_URL is not set. DreamSpace stores everything in Neon - "
            "put your Neon connection string in .env (local) or Render env vars (online)."
        )

    # Normalize PostgreSQL URL formats.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    parsed = make_url(url)

    # Use pg8000 instead of psycopg.
    if parsed.drivername in (
        "postgres",
        "postgresql",
        "postgresql+psycopg",
        "postgresql+psycopg2",
    ):
        query = dict(parsed.query)

        # SSL is configured separately for pg8000.
        query.pop("sslmode", None)
        query.pop("channel_binding", None)

        parsed = parsed.set(
            drivername="postgresql+pg8000",
            query=query
        )

    return parsed.render_as_string(hide_password=False)


def create_app():
    app = Flask(
        __name__,
        static_folder=str(ROOT / "frontend" / "dist"),
        static_url_path=""
    )

    is_prod = (
        bool(os.getenv("RENDER"))
        or os.getenv("FLASK_ENV", "").lower() == "production"
    )

    secret = os.getenv("SECRET_KEY", "")

    if not secret:
        if is_prod:
            raise RuntimeError("SECRET_KEY must be set in production.")

        secret = "dev-only-secret-change-me"
        os.environ["SECRET_KEY"] = secret

    db_uri = database_uri()

    engine_options = {}

    if not db_uri.startswith("sqlite"):
        engine_options = {
            "pool_pre_ping": True,
            "pool_recycle": 240,
            "pool_size": 3,
            "max_overflow": 2,
            "connect_args": {
                "ssl_context": ssl.create_default_context()
            }
        }

    app.config.update(
        SECRET_KEY=secret,
        SQLALCHEMY_DATABASE_URI=db_uri,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ENGINE_OPTIONS=engine_options,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=is_prod,
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),
        MAX_CONTENT_LENGTH=4 * 1024 * 1024,
        JSON_SORT_KEYS=False,
    )

    if is_prod:
        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=1,
            x_proto=1,
            x_host=1
        )

    db.init_app(app)

    from app import models  # noqa: F401
    from app.schema import sync_schema
    from app.services import cloud

    cloud.configure()

    with app.app_context():
        sync_schema(db)

    # CSRF protection
    @app.before_request
    def csrf_guard():
        if (
            request.method in ("POST", "PUT", "PATCH", "DELETE")
            and request.path.startswith("/api/")
        ):
            if request.headers.get("X-DS-Client") != "web":
                return jsonify({
                    "success": False,
                    "message": "Invalid request origin."
                }), 403

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "same-origin")
        resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")

        if request.path.startswith("/api/"):
            resp.headers["Cache-Control"] = "no-store"

        return resp

    from app.routes.admin import admin_bp
    from app.routes.ai import ai_bp
    from app.routes.auth import auth_bp
    from app.routes.catalog import catalog_bp
    from app.routes.projects import projects_bp

    for bp in (
        auth_bp,
        projects_bp,
        admin_bp,
        ai_bp,
        catalog_bp
    ):
        app.register_blueprint(bp)

    @app.get("/api/health")
    def health():
        return jsonify({
            "status": "success",
            "message": "DreamSpace 3D backend is running"
        }), 200

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({
            "success": False,
            "message": "Request is too large."
        }), 413

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify({
            "success": False,
            "message": "Something went wrong on the server."
        }), 500

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify({
                "success": False,
                "message": "API endpoint not found."
            }), 404

        folder = app.static_folder

        if path and os.path.isfile(os.path.join(folder, path)):
            resp = send_from_directory(folder, path)

            if path.startswith("assets/"):
                resp.headers["Cache-Control"] = (
                    "public, max-age=31536000, immutable"
                )

            return resp

        if os.path.isfile(os.path.join(folder, "index.html")):
            resp = send_from_directory(folder, "index.html")
            resp.headers["Cache-Control"] = "no-cache"
            return resp

        return jsonify({
            "message": (
                "DreamSpace 3D API is running. Frontend build not found - "
                "run `npm run build` in /frontend."
            )
        }), 200

    return app

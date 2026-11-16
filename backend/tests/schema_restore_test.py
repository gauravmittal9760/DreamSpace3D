"""Checks: (1) old Neon-style tables get the new columns automatically  (2) backup -> wipe -> restore round trip."""
import os, sys, json
os.environ.update(ALLOW_SQLITE="1", SECRET_KEY="t")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from sqlalchemy import create_engine, text, inspect
import app as A
from app import create_app, db

# --- (1) legacy schema
app = A.Flask("x")
app = create_app()
with app.app_context():
    db.drop_all()
    with db.engine.begin() as c:
        c.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(40) NOT NULL, email VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL, is_email_verified BOOLEAN NOT NULL DEFAULT 0, is_2fa_enabled BOOLEAN NOT NULL DEFAULT 0, is_admin BOOLEAN NOT NULL DEFAULT 0, created_at DATETIME NOT NULL, last_login_at DATETIME)"))
        c.execute(text("INSERT INTO users (id, username, email, password_hash, created_at) VALUES (1,'old','o@x.com','h','2026-01-01 00:00:00')"))
        c.execute(text("CREATE TABLE projects (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, name VARCHAR(120) NOT NULL, description TEXT, project_data JSON NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"))
    from app.schema import sync_schema
    sync_schema(db)
    cols = {c["name"] for c in inspect(db.engine).get_columns("users")}
    assert {"login_count", "failed_login_count", "is_blocked", "locked_until"} <= cols, cols
    pcols = {c["name"] for c in inspect(db.engine).get_columns("projects")}
    assert {"thumbnail_url", "share_token"} <= pcols, pcols
    from app.models import User, Project, Backup
    u = User.query.first()
    assert u.username == "old" and u.is_blocked is False and u.login_count == 0
    print("ok   legacy tables upgraded in place, old row intact")

    # --- (2) backup / restore
    from app.services import backup_service
    db.session.add(Project(user_id=1, name="P1", project_data={"floors": [{"rooms": []}]}))
    db.session.commit()
    row, raw = backup_service.create_backup("full")
    assert json.loads(raw)["users"][0]["projects"][0]["name"] == "P1"
    Project.query.delete(); User.query.delete(); db.session.commit()
    res = backup_service.restore(raw)
    assert res == {"users_restored": 1, "projects_restored": 1}, res
    res2 = backup_service.restore(raw)  # idempotent
    assert res2 == {"users_restored": 0, "projects_restored": 0}, res2
    print("ok   backup -> wipe -> restore round trip (idempotent)")

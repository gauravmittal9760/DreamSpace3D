import os

from sqlalchemy import text

from app import db
from app.models.misc import ActivityLog, AppSetting, Backup
from app.models.otp import OTPVerification
from app.models.project import Project
from app.models.user import User
from app.services import cloud

MB = 1024 * 1024


def neon_stats():
    limit_mb = float(os.getenv("NEON_STORAGE_LIMIT_MB", "512") or 512)
    dialect = db.engine.dialect.name
    out = {"engine": dialect, "limit_bytes": int(limit_mb * MB), "tables": []}
    counts = {
        "users": User.query.count(), "projects": Project.query.count(),
        "otp_verifications": OTPVerification.query.count(), "activity_logs": ActivityLog.query.count(),
        "app_settings": AppSetting.query.count(), "backups": Backup.query.count(),
    }
    out["row_counts"] = counts
    if dialect != "postgresql":
        out.update(database_bytes=0, note="Not a Postgres database (test mode).")
        out["tables"] = [{"name": k, "rows": v, "bytes": 0} for k, v in counts.items()]
        return out
    c = db.session
    out["database_bytes"] = int(c.execute(text("select pg_database_size(current_database())")).scalar() or 0)
    out["database_name"] = c.execute(text("select current_database()")).scalar()
    out["version"] = (c.execute(text("select version()")).scalar() or "")[:60]
    out["connections"] = int(c.execute(text("select count(*) from pg_stat_activity where datname=current_database()")).scalar() or 0)
    rows = c.execute(text(
        "select c.relname, pg_total_relation_size(c.oid), pg_relation_size(c.oid), pg_indexes_size(c.oid) "
        "from pg_class c join pg_namespace n on n.oid=c.relnamespace "
        "where n.nspname='public' and c.relkind='r' order by 2 desc")).all()
    out["tables"] = [{"name": r[0], "bytes": int(r[1]), "data_bytes": int(r[2]), "index_bytes": int(r[3]),
                      "rows": counts.get(r[0])} for r in rows]
    out["scenes_bytes"] = int(c.execute(text("select coalesce(sum(pg_column_size(project_data)),0) from projects")).scalar() or 0)
    return out


def storage_overview():
    neon = neon_stats()
    cl = cloud.usage()
    cl_bytes = int(((cl.get("storage") or {}).get("usage")) or 0) if cl.get("configured") else 0
    if cl.get("configured") and not cl_bytes:  # fall back to folder sums if usage() is unavailable
        cl_bytes = sum(int(f.get("bytes") or 0) for f in (cl.get("folders") or {}).values())
    return {"neon": neon, "cloudinary": cl, "total_bytes": neon.get("database_bytes", 0) + cl_bytes,
            "neon_bytes": neon.get("database_bytes", 0), "cloudinary_bytes": cl_bytes}

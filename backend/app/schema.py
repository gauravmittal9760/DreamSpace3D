"""Keeps Neon (and local test DBs) in sync with the models without Alembic.

`db.create_all()` creates missing tables; for tables that already exist (your
current Neon DB) we add any missing columns with ALTER TABLE ... ADD COLUMN.
Safe to run on every start-up.
"""
import logging

from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateColumn

log = logging.getLogger("dreamspace")


def sync_schema(db):
    engine = db.engine
    try:
        db.create_all()
        insp = inspect(engine)
        with engine.begin() as conn:
            for table in db.metadata.sorted_tables:
                if not insp.has_table(table.name):
                    continue
                existing = {c["name"] for c in insp.get_columns(table.name)}
                for col in table.columns:
                    if col.name in existing:
                        continue
                    ddl = CreateColumn(col).compile(dialect=engine.dialect)
                    conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN {ddl}'))
                    log.warning("schema sync: added %s.%s", table.name, col.name)
                for idx in table.indexes:  # e.g. the share_token lookup index on an upgraded table
                    idx.create(conn, checkfirst=True)
        # one-time cleanup of the old unique-email index if it still exists on Postgres
        if engine.dialect.name == "postgresql":
            with engine.begin() as conn:
                for c in inspect(engine).get_unique_constraints("users"):
                    if c.get("column_names") == ["email"]:
                        conn.execute(text(f'ALTER TABLE users DROP CONSTRAINT "{c["name"]}"'))
    except Exception:  # never take the whole site down because of a sync problem
        log.exception("schema sync failed")

"""Clear all application tables while keeping schema intact.

Usage:
    DATABASE_URL=postgresql://user:pass@localhost:5433/crm_db python scripts/clear_database.py
"""

from __future__ import annotations

import os
import sys

from sqlalchemy import create_engine, inspect, text


def main() -> int:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set.")
        return 1

    engine = create_engine(database_url)
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if not tables:
        print("No tables found; nothing to clear.")
        return 0

    with engine.begin() as connection:
        if engine.dialect.name == "postgresql":
            quoted_tables = ", ".join(f'"{table}"' for table in tables)
            connection.execute(text(f"TRUNCATE TABLE {quoted_tables} RESTART IDENTITY CASCADE"))
        else:
            for table in reversed(inspector.get_table_names()):
                connection.execute(text(f'DELETE FROM "{table}"'))

    print(f"Cleared data from {len(tables)} table(s): {', '.join(tables)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

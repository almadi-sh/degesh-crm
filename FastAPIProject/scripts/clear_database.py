"""
Clear all application tables while keeping schema intact.

Usage:
    python scripts/clear_database.py
"""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text


def main() -> int:
    # Загружаем .env
    load_dotenv()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set in .env file.")
        return 1

    engine = create_engine(database_url)
    inspector = inspect(engine)

    # Получаем список таблиц только в public schema
    tables = inspector.get_table_names(schema="public")

    if not tables:
        print("No tables found; nothing to clear.")
        return 0

    print("⚠️  The following tables will be truncated:")
    for table in tables:
        print(f"   - {table}")

    confirm = input("Are you sure? Type 'yes' to continue: ")
    if confirm.lower() != "yes":
        print("Aborted.")
        return 0

    with engine.begin() as connection:
        if engine.dialect.name == "postgresql":
            quoted_tables = ", ".join(f'"public"."{table}"' for table in tables)
            connection.execute(
                text(f"TRUNCATE TABLE {quoted_tables} RESTART IDENTITY CASCADE")
            )
        else:
            for table in reversed(tables):
                connection.execute(text(f'DELETE FROM "{table}"'))

    print(f"\n✅ Cleared data from {len(tables)} table(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

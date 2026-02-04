from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _column_exists(engine: Engine, table_name: str, column_name: str) -> bool:
    inspector = inspect(engine)
    return column_name in {col["name"] for col in inspector.get_columns(table_name)}


def _table_exists(engine: Engine, table_name: str) -> bool:
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def run_legacy_migrations(engine: Engine) -> None:
    """Apply lightweight schema fixes for environments without Alembic.

    Architecture decision: use guarded DDL to keep production running even when
    the database was created before the new contract schema existed.
    """
    with engine.begin() as connection:
        if _table_exists(engine, "contracts"):
            if not _column_exists(engine, "contracts", "contract_number"):
                connection.execute(text("ALTER TABLE contracts ADD COLUMN contract_number VARCHAR"))
            if not _column_exists(engine, "contracts", "contract_date"):
                connection.execute(text("ALTER TABLE contracts ADD COLUMN contract_date DATE"))
            if not _column_exists(engine, "contracts", "status"):
                connection.execute(text("ALTER TABLE contracts ADD COLUMN status VARCHAR"))
            if not _column_exists(engine, "contracts", "last_modified_at"):
                connection.execute(text("ALTER TABLE contracts ADD COLUMN last_modified_at TIMESTAMP"))

            if _column_exists(engine, "contracts", "number"):
                connection.execute(text("UPDATE contracts SET contract_number = number WHERE contract_number IS NULL"))
            if _column_exists(engine, "contracts", "date"):
                connection.execute(text("UPDATE contracts SET contract_date = date WHERE contract_date IS NULL"))

            connection.execute(
                text("UPDATE contracts SET contract_date = CURRENT_DATE WHERE contract_date IS NULL")
            )
            connection.execute(
                text("UPDATE contracts SET status = 'Draft' WHERE status IS NULL")
            )
            connection.execute(
                text("UPDATE contracts SET last_modified_at = CURRENT_TIMESTAMP WHERE last_modified_at IS NULL")
            )

        if _table_exists(engine, "contract_items"):
            if not _column_exists(engine, "contract_items", "total_amount"):
                connection.execute(text("ALTER TABLE contract_items ADD COLUMN total_amount FLOAT"))
            if not _column_exists(engine, "contract_items", "delivery_enabled"):
                connection.execute(text("ALTER TABLE contract_items ADD COLUMN delivery_enabled BOOLEAN"))

            if _column_exists(engine, "contract_items", "total"):
                connection.execute(
                    text(
                        "UPDATE contract_items SET total_amount = total WHERE total_amount IS NULL"
                    )
                )
            connection.execute(
                text(
                    "UPDATE contract_items SET total_amount = quantity * price WHERE total_amount IS NULL"
                )
            )
            connection.execute(
                text(
                    "UPDATE contract_items SET delivery_enabled = 0 WHERE delivery_enabled IS NULL"
                )
            )

        if not _table_exists(engine, "payment_terms"):
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS payment_terms (
                        id INTEGER PRIMARY KEY,
                        contract_item_id INTEGER NOT NULL,
                        percent FLOAT NOT NULL,
                        amount FLOAT NOT NULL,
                        due_date DATE NOT NULL
                    )
                    """
                )
            )

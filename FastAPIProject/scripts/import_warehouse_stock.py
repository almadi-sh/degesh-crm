"""Import per-warehouse stock balances from the warehouse-stock xlsx.

Each sheet = one warehouse (sheet title = warehouse name). Header layout differs
per sheet, so columns are detected by name (Наименование/Номенклатура, Остаток/
Конечный остаток, Ед. изм.).

Usage (from FastAPIProject):
    python -m scripts.import_warehouse_stock
    python -m scripts.import_warehouse_stock --reset
    python -m scripts.import_warehouse_stock --file "../Остатки по складам 01-07-2026.xlsx"
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from openpyxl import load_workbook  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models.warehouse_stock import WarehouseStock  # noqa: E402

REPO_ROOT = BACKEND_DIR.parent
DEFAULT_XLSX = REPO_ROOT / "Остатки по складам 01-07-2026.xlsx"


def _to_qty(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(" ", " ")
    # handle "12.5+10" style
    parts = re.split(r"[+]", text)
    total = 0.0
    found = False
    for part in parts:
        cleaned = re.sub(r"[^\d,.\-]", "", part).replace(",", ".")
        try:
            total += float(cleaned)
            found = True
        except ValueError:
            continue
    return total if found else None


def _clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _find_columns(rows):
    """Locate header row and column indices for name/qty/unit."""
    for i, row in enumerate(rows[:8]):
        low = [str(c).strip().lower() if c is not None else "" for c in row]
        name_col = qty_col = unit_col = None
        for j, c in enumerate(low):
            if name_col is None and ("наименование" in c or "номенклатура" in c):
                name_col = j
            if qty_col is None and ("остаток" in c):
                qty_col = j
            if unit_col is None and ("ед." in c or "ед.изм" in c or c == "ед" or "изм" in c):
                unit_col = j
        if name_col is not None and qty_col is not None:
            return i, name_col, qty_col, unit_col
    return None, None, None, None


def import_stock(xlsx_path: Path, reset: bool) -> int:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(WarehouseStock).count()
        if existing and not reset:
            print(f"Table 'warehouse_stock' already has {existing} rows. Use --reset. Aborting.")
            return 0
        if existing and reset:
            print(f"--reset: deleting {existing} rows...")
            db.query(WarehouseStock).delete()
            db.commit()

        wb = load_workbook(xlsx_path, data_only=True)
        buffer: list[WarehouseStock] = []
        for ws in wb.worksheets:
            warehouse = ws.title.strip()
            rows = [list(r) for r in ws.iter_rows(values_only=True)]
            header_idx, name_col, qty_col, unit_col = _find_columns(rows)
            if header_idx is None:
                print(f"  [{warehouse}] header not found, skipped")
                continue
            count = 0
            for row in rows[header_idx + 1:]:
                if not row or name_col >= len(row):
                    continue
                name = _clean(row[name_col])
                if not name or name.lower().startswith("итого"):
                    continue
                qty = _to_qty(row[qty_col]) if qty_col < len(row) else None
                unit = _clean(row[unit_col]) if (unit_col is not None and unit_col < len(row)) else None
                # normalize common unit spellings
                if unit:
                    unit = unit.replace("л (дм3)", "л").replace("(дм3)", "").strip() or None
                buffer.append(
                    WarehouseStock(warehouse=warehouse, product_name=name, quantity=qty, unit=unit)
                )
                count += 1
            print(f"  [{warehouse}] {count} items")

        db.bulk_save_objects(buffer)
        db.commit()
        print(f"Imported {len(buffer)} stock rows across warehouses.")
        return len(buffer)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=str, default=str(DEFAULT_XLSX))
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    xlsx_path = Path(args.file)
    if not xlsx_path.is_absolute():
        xlsx_path = (REPO_ROOT / args.file).resolve()
    if not xlsx_path.exists():
        raise SystemExit(f"File not found: {xlsx_path}")
    import_stock(xlsx_path, reset=args.reset)


if __name__ == "__main__":
    main()

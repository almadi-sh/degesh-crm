"""Import realizations from parsed_realizations.xlsx into the database.

Usage (from repo root or anywhere):
    python -m scripts.import_realizations                 # import if table is empty
    python -m scripts.import_realizations --reset         # wipe table and reimport
    python -m scripts.import_realizations --file path.xlsx

Requires DATABASE_URL in FastAPIProject/.env (same as the app).
Depends on openpyxl (pip install openpyxl).
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

# Make "app" importable when run as a script.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from openpyxl import load_workbook  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models.realization import Realization  # noqa: E402

REPO_ROOT = BACKEND_DIR.parent
DEFAULT_XLSX = REPO_ROOT / "parsed_realizations.xlsx"
SHEET_NAME = "realizations"
BATCH_SIZE = 1000

DATE_FORMATS = ("%d.%m.%Y %H:%M:%S", "%d.%m.%Y %H:%M", "%d.%m.%Y")


def _to_float(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        try:
            return float(str(value).replace(" ", "").replace(",", "."))
        except (TypeError, ValueError):
            return None


def _parse_date(value):
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def import_realizations(xlsx_path: Path, reset: bool) -> int:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(Realization).count()
        if existing and not reset:
            print(
                f"Table 'realizations' already has {existing} rows. "
                f"Use --reset to wipe and reimport. Aborting."
            )
            return 0
        if existing and reset:
            print(f"--reset: deleting {existing} existing rows...")
            db.query(Realization).delete()
            db.commit()

        wb = load_workbook(xlsx_path, read_only=True, data_only=True)
        ws = wb[SHEET_NAME]

        rows = ws.iter_rows(min_row=2, values_only=True)
        buffer: list[Realization] = []
        inserted = 0

        for r in rows:
            # Skip fully empty rows.
            if r is None or all(c is None for c in r):
                continue

            (
                document, date, counterparty, contract_ref, bin_iin, nomenclature,
                unit, quantity, price, amount_with_vat, vat_amount, vat_rate,
                raw_product_name, normalized_product_name, canonical_product_name,
                product_category, active_substance, confidence, fuzzy_product_name,
                final_product_name,
            ) = (list(r) + [None] * 20)[:20]

            parsed_date = _parse_date(date)
            year = parsed_date.year if parsed_date else None
            year_month = parsed_date.strftime("%Y-%m") if parsed_date else None

            bin_value = bin_iin
            if bin_value is not None:
                bin_value = str(bin_value).split(".")[0].strip() or None

            buffer.append(
                Realization(
                    document=_clean(document),
                    realization_date=parsed_date,
                    date_raw=_clean(date),
                    year=year,
                    year_month=year_month,
                    counterparty=_clean(counterparty),
                    contract_ref=_clean(contract_ref),
                    bin_iin=bin_value,
                    nomenclature=_clean(nomenclature),
                    product_name=_clean(final_product_name) or _clean(canonical_product_name)
                    or _clean(nomenclature),
                    category=_clean(product_category),
                    active_substance=_clean(active_substance),
                    unit=_clean(unit),
                    quantity=_to_float(quantity),
                    price=_to_float(price),
                    amount_with_vat=_to_float(amount_with_vat),
                    vat_amount=_to_float(vat_amount),
                    vat_rate=_to_float(vat_rate),
                    confidence=_to_float(confidence),
                )
            )

            if len(buffer) >= BATCH_SIZE:
                db.bulk_save_objects(buffer)
                db.commit()
                inserted += len(buffer)
                buffer.clear()

        if buffer:
            db.bulk_save_objects(buffer)
            db.commit()
            inserted += len(buffer)

        print(f"Imported {inserted} realization rows.")
        return inserted
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Import realizations from xlsx.")
    parser.add_argument("--file", type=str, default=str(DEFAULT_XLSX), help="Path to xlsx")
    parser.add_argument("--reset", action="store_true", help="Wipe table before import")
    args = parser.parse_args()

    xlsx_path = Path(args.file)
    if not xlsx_path.exists():
        raise SystemExit(f"File not found: {xlsx_path}")

    import_realizations(xlsx_path, reset=args.reset)


if __name__ == "__main__":
    main()

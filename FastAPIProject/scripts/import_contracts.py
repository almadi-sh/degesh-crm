"""Import parsed contracts (all_results.json from the OCR/pipeline) into the DB.

Links each contract to a counterparty BIN by matching the contract number against
realization contract references (strict). Requires realizations imported first for
linking (otherwise contracts are stored unlinked).

Usage (from FastAPIProject):
    python -m scripts.import_contracts
    python -m scripts.import_contracts --reset
    python -m scripts.import_contracts --file ../contract_extracts/all_results.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models.contract_ext import (  # noqa: E402
    ExtAppendix,
    ExtAppendixItem,
    ExtContract,
    Shipment,
)
from app.models.realization import Realization  # noqa: E402
from app.models.debt import Debt  # noqa: E402
from app.models.counterparty import Counterparty  # noqa: E402

REPO_ROOT = BACKEND_DIR.parent
DEFAULT_JSON = REPO_ROOT / "contract_extracts" / "all_results.json"
MANAGERS = ("азамат", "махаббат", "ерканат", "адиль", "эрвин", "даниил", "ervin")


def _normalize_bin(value):
    if value is None:
        return None
    s = str(value).split(".")[0].strip()
    if not s:
        return None
    if s.isdigit() and len(s) < 12:
        return s.zfill(12)
    return s


def _num(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _norm_number(number):
    return re.sub(r"\s+", " ", str(number or "").lower().strip())


def _build_ref_index(db):
    idx = []
    seen = set()
    for ref, bin_ in db.query(Realization.contract_ref, Realization.bin_iin).all():
        if not ref:
            continue
        key = (str(ref), str(bin_))
        if key in seen:
            continue
        seen.add(key)
        head = re.split(r"\bот\b", str(ref).lower().strip())[0].strip()
        head = re.sub(r"\s+", " ", head)
        idx.append((head, _normalize_bin(bin_)))
    return idx


def _match_bin(number, idx):
    n = _norm_number(number)
    if not n:
        return None
    exact = {b for h, b in idx if h == n and b}
    if len(exact) == 1:
        return next(iter(exact))
    pref = {b for h, b in idx if b and (h == n or h.startswith(n + " "))}
    if len(pref) == 1:
        return next(iter(pref))
    return None


def _build_debt_index(db):
    idx = []
    for name, bin_ in db.query(Debt.contract_name, Debt.bin_iin).all():
        if name and bin_:
            idx.append((str(name).lower(), _normalize_bin(bin_)))
    return idx


def _match_bin_debts(number, idx):
    n = _norm_number(number)
    # only use specific numbers (with a letter or length >= 5) to avoid noise
    if not n or (n.isdigit() and len(n) < 5):
        return None
    cands = {b for name, b in idx if b and n in name}
    return next(iter(cands)) if len(cands) == 1 else None


_GENERIC = {
    "товарищество", "ограниченной", "ответственностью", "крестьянское", "хозяйство",
    "тоо", "ооо", "кх", "ип", "ао", "фх", "лтд", "ltd", "агро", "agro", "trade",
    "seeds", "group", "компания", "фермерское", "the", "оао", "зао",
}


def _tokens(name):
    s = re.sub(r"[«»\"'()]", " ", (name or "").lower())
    return {t for t in re.split(r"[^0-9a-zа-яё]+", s) if len(t) >= 4 and t not in _GENERIC}


def _build_name_index(db):
    idx = []
    for c in db.query(Counterparty).all():
        nb = _normalize_bin(c.bin_iin)
        if nb and c.name:
            idx.append((_tokens(c.name), nb))
    return idx


def _match_name(buyer, idx):
    bt = _tokens(buyer)
    if not bt:
        return None
    cands = set()
    for ct, nb in idx:
        if not ct:
            continue
        overlap = bt & ct
        if overlap and (bt <= ct or ct <= bt or len(overlap) >= 2):
            cands.add(nb)
    return next(iter(cands)) if len(cands) == 1 else None


def _manager(folder_name):
    for token in re.findall(r"\(([^)]*)\)", folder_name or ""):
        if any(m in token.lower() for m in MANAGERS):
            return token.strip()
    return None


def import_contracts(json_path: Path, reset: bool) -> int:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(ExtContract).count()
        if existing and not reset:
            print(f"Table 'ext_contracts' already has {existing} rows. Use --reset. Aborting.")
            return 0
        if existing and reset:
            print(f"--reset: deleting {existing} contracts (and appendices/items/shipments)...")
            db.query(Shipment).delete()
            db.query(ExtAppendixItem).delete()
            db.query(ExtAppendix).delete()
            db.query(ExtContract).delete()
            db.commit()

        data = json.loads(json_path.read_text(encoding="utf-8"))
        entries = list(data.values()) if isinstance(data, dict) else list(data)

        ref_index = _build_ref_index(db)
        debt_index = _build_debt_index(db)
        name_index = _build_name_index(db)
        print(f"Realization refs indexed: {len(ref_index)}")

        linked = 0
        contract_count = 0
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            c = entry.get("contract") or {}
            folder = entry.get("folder_name")
            number = c.get("number")
            client_bin = (
                _match_bin(number, ref_index)
                or _match_bin_debts(number, debt_index)
                or _match_name(c.get("buyer"), name_index)
            )
            if client_bin:
                linked += 1

            appendices = entry.get("appendices") or []
            totals = entry.get("xlsx_totals_summary") or {}
            contract_total = _num(c.get("contract_total")) or _num(
                totals.get("all_appendices_total_stated")
            )

            contract = ExtContract(
                folder_name=folder,
                number=number,
                date=c.get("date"),
                buyer_name=c.get("buyer"),
                supplier_name=c.get("supplier"),
                contract_total=contract_total,
                currency=c.get("currency"),
                client_bin=client_bin,
                manager=_manager(folder),
                cancelled=1 if "аннулир" in (folder or "").lower() else 0,
                summary_for_manager=entry.get("summary_for_manager"),
            )

            for pos, app in enumerate(appendices):
                checks = app.get("python_totals_check") or {}
                dt = app.get("delivery_terms") or {}
                delivery = dt.get("value") if isinstance(dt, dict) else (dt or None)
                items = app.get("products") or []
                stated = _num(checks.get("stated_total")) or _num(checks.get("calculated_products_total"))
                if stated is None:
                    stated = sum(_num(p.get("total")) or 0 for p in items) or None

                appendix = ExtAppendix(
                    appendix_number=str(app.get("appendix_number")) if app.get("appendix_number") is not None else None,
                    appendix_date=app.get("appendix_date"),
                    source_file=app.get("source_file"),
                    stated_total=stated,
                    payment_schedule=app.get("payment_schedule") or [],
                    delivery_terms=delivery,
                    position=pos,
                )
                for p in items:
                    appendix.items.append(
                        ExtAppendixItem(
                            name=p.get("name"),
                            category=p.get("category"),
                            quantity=_num(p.get("quantity")),
                            unit=p.get("unit"),
                            unit_price=_num(p.get("unit_price")),
                            total=_num(p.get("total")),
                            delivery_date=p.get("delivery_date"),
                        )
                    )
                contract.appendices.append(appendix)

            db.add(contract)
            contract_count += 1

        db.commit()
        print(f"Imported {contract_count} contracts | linked to BIN: {linked}")
        return contract_count
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=str, default=str(DEFAULT_JSON))
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    json_path = Path(args.file)
    if not json_path.is_absolute():
        json_path = (REPO_ROOT / args.file).resolve()
    if not json_path.exists():
        raise SystemExit(f"File not found: {json_path}")
    import_contracts(json_path, reset=args.reset)


if __name__ == "__main__":
    main()

"""Extract contract + appendix data from the local contract folders using only
python-docx / openpyxl (no OCR, no LLM). PDF-only folders are recorded but not parsed.

Reuses the XLSX normalization/total logic from the user's pipeline.

Usage (from FastAPIProject):
    python -m scripts.extract_contracts --input "../Договора Дегеш 03 07 2026" --limit 3
    python -m scripts.extract_contracts --input "../Договора Дегеш 03 07 2026"

Output: <repo>/contract_extracts/<folder>.json + all_contracts.json + summary.
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any

from docx import Document
from openpyxl import load_workbook
from openpyxl.styles.numbers import is_date_format
from openpyxl.utils.datetime import from_excel

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
OUTPUT_DIR = REPO_ROOT / "contract_extracts"


# ---------- number / date helpers (adapted from the user's pipeline) ----------

def parse_money(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(" ", " ")
    for token in ("KZT", "₸", "тенге", "тг"):
        text = text.replace(token, "")
    text = re.sub(r"[^\d,.\-]", "", text.strip())
    if not text:
        return None
    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def fmt_number(value: float | None) -> float | None:
    if value is None:
        return None
    if abs(value - round(value)) < 1e-6:
        return int(round(value))
    return round(value, 2)


def normalize_cell(cell) -> Any:
    value = cell.value
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.strftime("%d.%m.%Y")
    fmt = str(cell.number_format or "")
    if isinstance(value, (int, float)) and is_date_format(fmt):
        try:
            return from_excel(value).strftime("%d.%m.%Y")
        except Exception:
            pass
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return str(value).strip()


# ---------- folder-name + header parsing ----------

MANAGERS = ("азамат", "махаббат", "ерканат", "адиль", "эрвин", "даниил", "ervin", "адиль-эрвин")


def parse_folder_name(name: str) -> dict:
    manager = None
    m = re.findall(r"\(([^)]*)\)", name)
    for token in m:
        if any(mgr in token.lower() for mgr in MANAGERS):
            manager = token.strip()
    order_no = None
    mo = re.match(r"\s*(\d+)", name)
    if mo:
        order_no = mo.group(1)
    # contract code like "1-D-А", "2 D-E", "3 M-D", "106-М-А"
    code = None
    mc = re.match(r"\s*\d+\s*[-\s]?\s*([MDMЕА-Яа-яA-Za-z]{1,3}[-\s][A-Za-zА-Яа-я0-9]{1,3})", name)
    if mc:
        code = mc.group(1).strip()
    # client = strip leading number/code and trailing (manager)
    client = re.sub(r"\([^)]*\)", "", name)
    client = re.sub(r"^\s*\d+\s*", "", client)
    client = re.sub(r"^[MDMЕА-Яа-яA-Za-z]{1,3}[-\s][A-Za-zА-Яа-я0-9]{1,3}\s*", "", client)
    client = re.sub(r"\s+", " ", client).strip(" - ")
    cancelled = "аннулир" in name.lower()
    return {
        "order_no": order_no,
        "contract_code": code,
        "client_guess": client or None,
        "manager": manager,
        "cancelled": cancelled,
    }


APPENDIX_RE = re.compile(
    r"Приложение\s*№?\s*([0-9A-Za-zА-Яа-я\-\/]+).*?договор[уа]?\s*№?\s*([0-9A-Za-zА-Яа-я\-\/\s]+?)\s*от\s*([0-9]{1,2}[.\-/][0-9]{1,2}[.\-/][0-9]{2,4})",
    re.IGNORECASE | re.DOTALL,
)
BUYER_RE = re.compile(r"между .*?и\s+(.+)$", re.IGNORECASE)
PAY_RE = re.compile(r"(\d{1,3})\s*%.*?до\s*([0-9]{1,2}[.\-/][0-9]{1,2}[.\-/][0-9]{2,4})", re.IGNORECASE | re.DOTALL)


def parse_appendix_header(rows: list[list[Any]]) -> dict:
    header = {"appendix_number": None, "contract_number": None, "contract_date": None, "buyer": None}
    joined = "\n".join(" ".join(str(v) for v in r if str(v).strip()) for r in rows[:12])
    m = APPENDIX_RE.search(joined)
    if m:
        header["appendix_number"] = m.group(1).strip()
        header["contract_number"] = re.sub(r"\s+", " ", m.group(2)).strip()
        header["contract_date"] = m.group(3).strip()
    b = BUYER_RE.search(joined)
    if b:
        buyer = b.group(1).strip().strip('"').strip()
        header["buyer"] = re.sub(r"\s+", " ", buyer)[:120]
    return header


def extract_products(rows: list[list[Any]]) -> dict:
    products = []
    stated_total = None
    for row in rows:
        row_text = " ".join(str(x).lower() for x in row if str(x).strip())
        if not row_text:
            continue
        if any(k in row_text for k in ["общая сумма", "итого", "сумма контракта", "общая стоимость"]):
            amounts = [a for a in (parse_money(v) for v in row) if a is not None and a >= 1000]
            if amounts:
                stated_total = fmt_number(max(amounts))
            continue
        if any(k in row_text for k in ["продукт", "спецификаци", "количество", "срок оплат", "цена"]):
            continue
        numeric = [parse_money(v) for v in row]
        numeric = [n for n in numeric if n is not None]
        money = [n for n in numeric if n >= 1000]
        texts = [
            str(v).strip()
            for v in row
            if str(v).strip()
            and re.search(r"[A-Za-zА-Яа-яЁё]", str(v))
            and not re.search(r"kzt|тенге|ндс|срок|оплат|постав|цена|количество|общая|директор|продавец|покупатель|глава", str(v).lower())
        ]
        pay = None
        for v in row:
            if re.search(r"%|до\s*\d", str(v)):
                pay = str(v).strip()
        if len(numeric) >= 2 and texts:
            qty = numeric[0]
            price = numeric[1] if len(numeric) > 1 else None
            line_total = None
            if qty is not None and price is not None:
                calc = qty * price
                for mm in money:
                    if abs(mm - calc) <= max(1, calc * 0.02):
                        line_total = mm
                        break
                if line_total is None and money:
                    line_total = max(money)
            products.append({
                "name": texts[0],
                "quantity": fmt_number(qty),
                "unit_price": fmt_number(price),
                "amount": fmt_number(line_total),
                "payment_term": pay,
            })
    calc_total = sum(float(p["amount"]) for p in products if p.get("amount") is not None)
    return {"products": products, "stated_total": stated_total, "calculated_total": fmt_number(calc_total)}


def parse_payment_schedule(rows: list[list[Any]]) -> list[dict]:
    schedule = []
    seen = set()
    for row in rows:
        for v in row:
            m = PAY_RE.search(str(v))
            if m:
                key = (m.group(1), m.group(2))
                if key not in seen:
                    seen.add(key)
                    schedule.append({"percent": int(m.group(1)), "date": m.group(2)})
    return schedule


def read_xlsx_appendix(path: Path) -> dict:
    result = {"file_name": path.name, "sheets": []}
    try:
        wb = load_workbook(path, read_only=True, data_only=True)
        for ws in wb.worksheets:
            rows = []
            for row in ws.iter_rows():
                vals = [normalize_cell(c) for c in row]
                while vals and str(vals[-1]).strip() == "":
                    vals.pop()
                if any(str(v).strip() for v in vals):
                    rows.append(vals)
            if not rows:
                continue
            header = parse_appendix_header(rows)
            prod = extract_products(rows)
            if not prod["products"] and not header["appendix_number"]:
                continue
            result["sheets"].append({
                "sheet_name": ws.title,
                **header,
                **prod,
                "payment_schedule": parse_payment_schedule(rows),
            })
        wb.close()
    except Exception as e:
        result["error"] = str(e)
    return result


def read_docx_text(path: Path) -> str:
    try:
        doc = Document(path)
        parts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        for ti, table in enumerate(doc.tables, 1):
            parts.append(f"[TABLE {ti}]")
            for row in table.rows:
                parts.append(" | ".join(c.text.strip().replace("\n", " ") for c in row.cells))
        return "\n".join(parts)
    except Exception as e:
        return f"[ERROR {path.name}] {e}"


def process_folder(folder: Path) -> dict:
    files = [f for f in folder.iterdir() if f.is_file() and not f.name.startswith("~$")]
    docx = [f for f in files if f.suffix.lower() == ".docx"]
    xlsx = [f for f in files if f.suffix.lower() in (".xlsx", ".xlsm")]
    pdf = [f for f in files if f.suffix.lower() == ".pdf"]

    meta = parse_folder_name(folder.name)
    appendices = []
    for x in xlsx:
        parsed = read_xlsx_appendix(x)
        for sheet in parsed.get("sheets", []):
            sheet["source_file"] = x.name
            appendices.append(sheet)

    # contract number/date from first appendix if available
    contract_number = next((a["contract_number"] for a in appendices if a.get("contract_number")), None)
    contract_date = next((a["contract_date"] for a in appendices if a.get("contract_date")), None)
    buyer = next((a["buyer"] for a in appendices if a.get("buyer")), None)

    total_stated = sum(float(a["stated_total"]) for a in appendices if a.get("stated_total"))
    total_calc = sum(float(a["calculated_total"]) for a in appendices if a.get("calculated_total"))

    return {
        "folder_name": folder.name,
        **meta,
        "contract_number": contract_number or meta.get("contract_code"),
        "contract_date": contract_date,
        "buyer": buyer or meta.get("client_guess"),
        "files": {"docx": [f.name for f in docx], "xlsx": [f.name for f in xlsx], "pdf": [f.name for f in pdf]},
        "has_pdf_only": bool(pdf and not xlsx and not docx),
        "appendix_count": len(appendices),
        "appendices": appendices,
        "total_stated": fmt_number(total_stated) if total_stated else None,
        "total_calculated": fmt_number(total_calc) if total_calc else None,
        "docx_text": "\n\n".join(read_docx_text(d) for d in docx)[:3000],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to contracts root folder")
    parser.add_argument("--limit", type=int, default=0, help="Process only first N folders (0 = all)")
    parser.add_argument("--offset", type=int, default=0, help="Skip first N folders")
    parser.add_argument("--part", type=str, default=None, help="Write to part file instead of all_contracts.json")
    args = parser.parse_args()

    root = Path(args.input)
    if not root.is_absolute():
        root = (REPO_ROOT / args.input).resolve()
    if not root.exists():
        raise SystemExit(f"Input not found: {root}")

    OUTPUT_DIR.mkdir(exist_ok=True)
    folders = sorted([f for f in root.iterdir() if f.is_dir()])
    if args.offset:
        folders = folders[args.offset:]
    if args.limit:
        folders = folders[: args.limit]

    results = []
    stats = {"folders": 0, "with_appendices": 0, "with_products": 0, "pdf_only": 0, "with_contract_no": 0}
    for folder in folders:
        try:
            rec = process_folder(folder)
        except Exception as e:
            rec = {"folder_name": folder.name, "error": str(e)}
        results.append(rec)
        stats["folders"] += 1
        if rec.get("appendix_count"):
            stats["with_appendices"] += 1
        if any(a.get("products") for a in rec.get("appendices", [])):
            stats["with_products"] += 1
        if rec.get("has_pdf_only"):
            stats["pdf_only"] += 1
        if rec.get("contract_number"):
            stats["with_contract_no"] += 1

    out_name = args.part if args.part else "all_contracts.json"
    (OUTPUT_DIR / out_name).write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if not args.part:
        (OUTPUT_DIR / "summary.json").write_text(
            json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    print("STATS:", json.dumps(stats, ensure_ascii=False))
    print("Output:", OUTPUT_DIR)


if __name__ == "__main__":
    main()

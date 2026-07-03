import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.counterparty import Counterparty
from app.models.debt import Debt
from app.models.realization import Realization
from app.models.contract_ext import ExtContract
from app.schemas.debt import (
    DebtBucket,
    DebtContractLine,
    DebtObligation,
    DebtorDetailOut,
    DueInstallment,
    DebtListOut,
    DebtorListOut,
    DebtorOut,
    DebtOut,
    DebtSummaryOut,
    TopDebtor,
)

router = APIRouter(prefix="/debts", tags=["Debts"])

HIGH_THRESHOLD = 50_000_000
MEDIUM_THRESHOLD = 5_000_000
ACTIVE_WINDOW_DAYS = 180


def _normalize_bin(value) -> str | None:
    if value is None:
        return None
    s = str(value).split(".")[0].strip()
    if not s:
        return None
    if s.isdigit() and len(s) < 12:
        return s.zfill(12)
    return s


def _parse_report_date(value: str | None):
    if not value:
        return None
    for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(value).strip(), fmt)
        except ValueError:
            continue
    return None


def _priority(total: float) -> str:
    if total >= HIGH_THRESHOLD:
        return "Высокий"
    if total >= MEDIUM_THRESHOLD:
        return "Средний"
    return "Низкий"


def _realization_index(db: Session) -> dict[str, dict]:
    """Aggregate realizations per normalized BIN: total, last date, count, top product."""
    amount = func.coalesce(Realization.amount_with_vat, 0.0)
    index: dict[str, dict] = {}

    for bin_, total, last, cnt in (
        db.query(
            Realization.bin_iin,
            func.sum(amount),
            func.max(Realization.realization_date),
            func.count(Realization.id),
        )
        .group_by(Realization.bin_iin)
        .all()
    ):
        nb = _normalize_bin(bin_)
        if not nb:
            continue
        cur = index.setdefault(
            nb, {"total": 0.0, "last": None, "count": 0, "top_product": None, "_top_amount": 0.0}
        )
        cur["total"] += float(total or 0)
        cur["count"] += int(cnt or 0)
        if last is not None and (cur["last"] is None or last > cur["last"]):
            cur["last"] = last

    for bin_, product, amt in (
        db.query(Realization.bin_iin, Realization.product_name, func.sum(amount))
        .filter(Realization.product_name.isnot(None))
        .group_by(Realization.bin_iin, Realization.product_name)
        .all()
    ):
        nb = _normalize_bin(bin_)
        if not nb or nb not in index:
            continue
        value = float(amt or 0)
        if value > index[nb]["_top_amount"]:
            index[nb]["_top_amount"] = value
            index[nb]["top_product"] = product

    return index


def _build_debtors(db: Session):
    """Aggregate debts per counterparty, enriched with contacts and sales."""
    groups: dict[str, dict] = {}
    for d in db.query(Debt).all():
        nb = _normalize_bin(d.bin_iin)
        key = nb or (d.company_name or "—")
        g = groups.setdefault(
            key, {"bin": nb, "company": d.company_name, "total": 0.0, "contracts": []}
        )
        amt = float(d.debt_amount or 0)
        g["total"] += amt
        g["contracts"].append({"contract_name": d.contract_name, "debt_amount": amt})
        if not g["company"] and d.company_name:
            g["company"] = d.company_name

    contacts = {}
    for c in db.query(Counterparty).all():
        nb = _normalize_bin(c.bin_iin)
        if nb:
            contacts[nb] = c

    realizations = _realization_index(db)

    row = db.query(Debt.report_date).filter(Debt.report_date.isnot(None)).first()
    report_date = row[0] if row else None
    parsed_report = _parse_report_date(report_date)
    cutoff = parsed_report - timedelta(days=ACTIVE_WINDOW_DAYS) if parsed_report else None

    debtors: list[dict] = []
    for g in groups.values():
        nb = g["bin"]
        contact = contacts.get(nb) if nb else None
        rz = realizations.get(nb) if nb else None
        last = rz["last"] if rz else None
        active = bool(last and cutoff and last >= cutoff)
        debtors.append(
            {
                "bin_iin": nb,
                "company_name": g["company"],
                "phone": contact.phone if contact else None,
                "address": contact.address if contact else None,
                "total_debt": g["total"],
                "contract_count": len(g["contracts"]),
                "contracts": sorted(g["contracts"], key=lambda x: -x["debt_amount"]),
                "realization_total": rz["total"] if rz else 0.0,
                "realization_last_date": last.isoformat() if last else None,
                "top_product": rz["top_product"] if rz else None,
                "is_active_buyer": active,
                "priority": _priority(g["total"]),
            }
        )

    debtors.sort(key=lambda x: -x["total_debt"])
    for i, d in enumerate(debtors):
        d["priority_rank"] = i + 1
    return report_date, debtors


@router.get("/", response_model=DebtListOut)
def list_debts(
    db: Session = Depends(get_db),
    company: str | None = Query(default=None),
    bin_iin: str | None = Query(default=None),
    min_amount: float | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    query = db.query(Debt)
    if company:
        query = query.filter(Debt.company_name.ilike(f"%{company}%"))
    if bin_iin:
        query = query.filter(Debt.bin_iin.ilike(f"%{bin_iin}%"))
    if min_amount is not None:
        query = query.filter(Debt.debt_amount >= min_amount)
    total = query.count()
    items = query.order_by(Debt.debt_amount.desc()).offset(offset).limit(limit).all()
    return {"total": total, "items": items}


@router.get("/debtors", response_model=DebtorListOut)
def list_debtors(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    active_only: bool = Query(default=False),
    min_debt: float | None = Query(default=None),
):
    report_date, debtors = _build_debtors(db)

    if search:
        needle = search.lower()
        debtors = [
            d
            for d in debtors
            if (d["company_name"] and needle in d["company_name"].lower())
            or (d["bin_iin"] and needle in d["bin_iin"])
        ]
    if priority:
        debtors = [d for d in debtors if d["priority"] == priority]
    if active_only:
        debtors = [d for d in debtors if d["is_active_buyer"]]
    if min_debt is not None:
        debtors = [d for d in debtors if d["total_debt"] >= min_debt]

    return {
        "report_date": report_date,
        "total": len(debtors),
        "items": [DebtorOut(**d) for d in debtors],
    }


@router.get("/summary", response_model=DebtSummaryOut)
def debts_summary(db: Session = Depends(get_db)):
    report_date, debtors = _build_debtors(db)
    total_debt = sum(d["total_debt"] for d in debtors)
    count = len(debtors)
    contract_lines = db.query(Debt).count()

    top10 = sum(d["total_debt"] for d in debtors[:10])

    bucket_defs = [
        ("≥ 100 млн", lambda x: x >= 100_000_000),
        ("10–100 млн", lambda x: 10_000_000 <= x < 100_000_000),
        ("1–10 млн", lambda x: 1_000_000 <= x < 10_000_000),
        ("< 1 млн", lambda x: x < 1_000_000),
    ]
    buckets = []
    for label, predicate in bucket_defs:
        matched = [d for d in debtors if predicate(d["total_debt"])]
        buckets.append(
            DebtBucket(
                label=label,
                count=len(matched),
                amount=sum(d["total_debt"] for d in matched),
            )
        )

    top_debtors = [
        TopDebtor(
            company_name=d["company_name"] or "—",
            bin_iin=d["bin_iin"],
            total_debt=d["total_debt"],
            phone=d["phone"],
        )
        for d in debtors[:10]
    ]

    return DebtSummaryOut(
        report_date=report_date,
        total_debt=total_debt,
        debtor_count=count,
        contract_lines=contract_lines,
        average_debt=total_debt / count if count else 0.0,
        max_debt=debtors[0]["total_debt"] if debtors else 0.0,
        top10_share=(top10 / total_debt) if total_debt else 0.0,
        with_phone=sum(1 for d in debtors if d["phone"]),
        active_buyers=sum(1 for d in debtors if d["is_active_buyer"]),
        high_priority=sum(1 for d in debtors if d["priority"] == "Высокий"),
        buckets=buckets,
        top_debtors=top_debtors,
    )


@router.get("/debtor/{bin_iin}", response_model=DebtorDetailOut)
def debtor_detail(bin_iin: str, db: Session = Depends(get_db)):
    nb = _normalize_bin(bin_iin) or str(bin_iin).strip()
    cand = {nb, nb.lstrip("0"), nb.zfill(12)}

    debts = db.query(Debt).filter(Debt.bin_iin.in_(cand)).all()
    contracts = db.query(ExtContract).filter(ExtContract.client_bin.in_(cand)).all()

    company = next((d.company_name for d in debts if d.company_name), None)
    report_date = next((d.report_date for d in debts if d.report_date), None)

    def _match_contract(contract_name):
        dn = (contract_name or "").lower()
        for ct in contracts:
            num = re.sub(r"\s+", " ", str(ct.number or "").lower().strip())
            if num and not (num.isdigit() and len(num) < 5) and num in dn:
                return ct
        return None

    obligations = []
    for d in sorted(debts, key=lambda x: -(x.debt_amount or 0)):
        matched = _match_contract(d.contract_name)
        due = []
        if matched:
            seen = set()
            for app in matched.appendices:
                for inst in (app.payment_schedule or []):
                    date = inst.get("date") if isinstance(inst, dict) else None
                    if date and date not in seen:
                        seen.add(date)
                        due.append(
                            DueInstallment(
                                date=date,
                                percent=inst.get("percent"),
                                amount=inst.get("amount"),
                            )
                        )
            due.sort(key=lambda x: (x.date or ""))
        obligations.append(
            DebtObligation(
                contract_name=d.contract_name,
                debt_amount=float(d.debt_amount or 0),
                report_date=d.report_date,
                contract_id=matched.id if matched else None,
                contract_number=matched.number if matched else None,
                contract_date=matched.date if matched else None,
                due_schedule=due,
            )
        )

    return DebtorDetailOut(
        bin_iin=nb,
        company_name=company,
        total_debt=sum((d.debt_amount or 0) for d in debts),
        report_date=report_date,
        obligations=obligations,
    )

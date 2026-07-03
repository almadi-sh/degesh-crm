import json
import os
from datetime import datetime
import re
import urllib.request

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.counterparty import Counterparty
from app.models.debt import Debt
from app.models.realization import Realization
from app.schemas.counterparty import (
    AiSummaryOut,
    CardCategory,
    CardDebtLine,
    CardProduct,
    CardPurchaseLine,
    ClientCard,
    ClientListItem,
    ClientProfile,
)

router = APIRouter(prefix="/counterparties", tags=["Counterparties"])


def _normalize_bin(value) -> str | None:
    if value is None:
        return None
    s = str(value).split(".")[0].strip()
    if not s:
        return None
    if s.isdigit() and len(s) < 12:
        return s.zfill(12)
    return s


_SZR_CARD = {"Гербицид", "Фунгицид", "Инсектицид", "Пестицид / СЗР", "Пестицид", "Протравитель"}


def _map_cat(category):
    if category in _SZR_CARD:
        return "СЗР"
    return category or "Без категории"


def _region(address: str | None) -> str | None:
    if not address:
        return None
    m = re.search(r"г\.?\s*([А-Яа-яЁёA-Za-z\-]+)", address)
    if m:
        return m.group(1).strip(" .,")
    m = re.search(r"([А-Яа-яЁё\-]+)\s+област", address, re.IGNORECASE)
    if m:
        return m.group(1).title() + " обл."
    return None


def _client_index(db: Session) -> dict[str, dict]:
    """Union of everyone we sold to / who owes, keyed by normalized BIN."""
    index: dict[str, dict] = {}

    def ensure(nb):
        return index.setdefault(nb, {"bin": nb, "name": None, "total_debt": 0.0, "realization_total": 0.0})

    amount = func.coalesce(Realization.amount_with_vat, 0.0)
    for bin_, name, total in (
        db.query(Realization.bin_iin, func.max(Realization.counterparty), func.sum(amount))
        .group_by(Realization.bin_iin)
        .all()
    ):
        nb = _normalize_bin(bin_)
        if not nb:
            continue
        rec = ensure(nb)
        rec["realization_total"] += float(total or 0)
        if not rec["name"] and name:
            rec["name"] = str(name).strip()

    for bin_, name, total in (
        db.query(Debt.bin_iin, func.max(Debt.company_name), func.sum(func.coalesce(Debt.debt_amount, 0.0)))
        .group_by(Debt.bin_iin)
        .all()
    ):
        nb = _normalize_bin(bin_)
        if not nb:
            continue
        rec = ensure(nb)
        rec["total_debt"] += float(total or 0)
        if not rec["name"] and name:
            rec["name"] = str(name).strip()

    for c in db.query(Counterparty).all():
        nb = _normalize_bin(c.bin_iin)
        if not nb:
            continue
        rec = ensure(nb)
        if c.name:
            rec["name"] = c.name
    return index


@router.get("/", response_model=list[ClientListItem])
def list_clients(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None),
):
    index = _client_index(db)
    items = [
        ClientListItem(
            bin_iin=r["bin"],
            name=r["name"],
            total_debt=r["total_debt"],
            realization_total=r["realization_total"],
        )
        for r in index.values()
    ]
    if search:
        needle = search.lower()
        items = [i for i in items if (i.name and needle in i.name.lower()) or needle in i.bin_iin]
    items.sort(key=lambda x: -(x.realization_total + x.total_debt))
    return items


def _contact(db: Session, nb: str) -> Counterparty | None:
    for c in db.query(Counterparty).all():
        if _normalize_bin(c.bin_iin) == nb:
            return c
    return None


def _build_card(db: Session, nb: str) -> ClientCard | None:
    index = _client_index(db)
    base = index.get(nb)
    if not base:
        return None

    contact = _contact(db, nb)
    name = (contact.name if contact else None) or base.get("name")

    # Debts for this bin
    debt_rows = db.query(Debt).filter(Debt.bin_iin == nb).all()
    debts = [
        CardDebtLine(
            contract_name=d.contract_name,
            turnover_debit=d.turnover_debit,
            turnover_credit=d.turnover_credit,
            debt_amount=d.debt_amount,
            report_date=d.report_date,
        )
        for d in sorted(debt_rows, key=lambda x: -(x.debt_amount or 0))
    ]
    total_debt = sum((d.debt_amount or 0) for d in debt_rows)

    # Realizations for this bin. Stored BINs may be unpadded (leading zeros lost
    # when the source was numeric), so match on a small candidate set.
    candidates = {nb, nb.lstrip("0")}
    mine = [
        r
        for r in db.query(Realization).filter(Realization.bin_iin.in_(candidates)).all()
        if _normalize_bin(r.bin_iin) == nb
    ]

    mine.sort(key=lambda r: (r.realization_date or datetime.min), reverse=True)
    purchases = [
        CardPurchaseLine(
            date=(r.realization_date.isoformat() if r.realization_date else r.date_raw),
            contract_ref=r.contract_ref,
            product_name=r.product_name or r.nomenclature,
            category=r.category,
            quantity=r.quantity,
            unit=r.unit,
            price=r.price,
            amount=r.amount_with_vat,
        )
        for r in mine[:1000]
    ]

    realization_total = sum((r.amount_with_vat or 0) for r in mine)
    dates = [r.realization_date for r in mine if r.realization_date]
    last_purchase = max(dates).isoformat() if dates else None
    first_purchase = min(dates).isoformat() if dates else None

    cat_amount: dict[str, list[float]] = {}
    prod_amount: dict[str, list[float]] = {}
    for r in mine:
        c = _map_cat(r.category)
        ca = cat_amount.setdefault(c, [0.0, 0.0])
        ca[0] += float(r.amount_with_vat or 0)
        ca[1] += float(r.quantity or 0)
        p = r.product_name or r.nomenclature
        if p:
            pa = prod_amount.setdefault(p, [0.0, 0.0, 0])
            pa[0] += float(r.amount_with_vat or 0)
            pa[1] += float(r.quantity or 0)
            pa[2] += 1

    categories = [
        CardCategory(category=k, amount=v[0], quantity=v[1])
        for k, v in sorted(cat_amount.items(), key=lambda x: -x[1][0])
    ]
    top_products = [
        CardProduct(product_name=k, amount=v[0], quantity=v[1], count=v[2])
        for k, v in sorted(prod_amount.items(), key=lambda x: -x[1][0])[:10]
    ]

    profile = ClientProfile(
        bin_iin=nb,
        name=name,
        phone=contact.phone if contact else None,
        address=contact.address if contact else None,
        region=_region(contact.address if contact else None),
    )

    return ClientCard(
        profile=profile,
        total_debt=total_debt,
        realization_total=realization_total,
        purchase_lines=len(mine),
        product_count=len(prod_amount),
        first_purchase=first_purchase,
        last_purchase=last_purchase,
        debts=debts,
        purchases=purchases,
        categories=categories,
        top_products=top_products,
    )


@router.get("/{bin_iin}/card", response_model=ClientCard)
def get_card(bin_iin: str, db: Session = Depends(get_db)):
    nb = _normalize_bin(bin_iin)
    card = _build_card(db, nb) if nb else None
    if not card:
        raise HTTPException(status_code=404, detail="Client not found")
    return card


def _fallback_summary(card: ClientCard) -> str:
    name = card.profile.name or "Клиент"
    top = card.top_products[0].product_name if card.top_products else "нет данных"
    last = (card.last_purchase or "")[:10] or "нет данных"
    money = f"{card.total_debt:,.0f}".replace(",", " ")
    sales = f"{card.realization_total:,.0f}".replace(",", " ")
    lines = [
        f"Клиент {name} имеет задолженность {money} ₸. "
        f"Общая сумма реализаций: {sales} ₸. Чаще всего покупал: {top}. Последняя покупка: {last}.",
    ]
    if card.total_debt > 0:
        lines.append(
            "Рекомендация: при звонке сначала напомнить о задолженности, затем предложить товары, "
            "которые клиент уже покупал ранее, или похожие из той же категории."
        )
    else:
        lines.append(
            "Рекомендация: задолженности нет — можно сфокусироваться на допродаже товаров из категорий, "
            "которые клиент покупает чаще всего."
        )
    return "\n\n".join(lines)


def _openai_summary(prompt: str) -> str | None:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    payload = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [
            {
                "role": "system",
                "content": (
                    "Ты ассистент менеджера по продажам агрохимии (пестициды, удобрения, семена). "
                    "Дай краткое деловое резюме по клиенту на русском: статус долга, что покупает, "
                    "и 2-3 конкретные рекомендации для звонка. Без воды, до 6 предложений."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 400,
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


@router.post("/{bin_iin}/ai-summary", response_model=AiSummaryOut)
def ai_summary(bin_iin: str, db: Session = Depends(get_db)):
    nb = _normalize_bin(bin_iin)
    card = _build_card(db, nb) if nb else None
    if not card:
        raise HTTPException(status_code=404, detail="Client not found")

    cats = ", ".join(f"{c.category} ({c.amount:,.0f} ₸)".replace(",", " ") for c in card.categories[:5])
    prods = ", ".join(f"{p.product_name}" for p in card.top_products[:5])
    prompt = (
        f"Клиент: {card.profile.name or '—'} (БИН {card.profile.bin_iin}). "
        f"Регион: {card.profile.region or '—'}. "
        f"Задолженность: {card.total_debt:,.0f} ₸. "
        f"Всего закуплено: {card.realization_total:,.0f} ₸ за {card.purchase_lines} позиций. "
        f"Последняя покупка: {(card.last_purchase or '—')[:10]}. "
        f"Категории: {cats or '—'}. "
        f"Топ товары: {prods or '—'}."
    ).replace(",", " ")

    text = _openai_summary(prompt)
    if text:
        return AiSummaryOut(summary=text, source="openai")
    return AiSummaryOut(summary=_fallback_summary(card), source="fallback")

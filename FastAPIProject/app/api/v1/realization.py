import re

from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.realization import Realization
from app.models.debt import Debt
from app.models.counterparty import Counterparty
from app.schemas.realization import (
    CategoryPoint,
    CounterpartyPoint,
    MonthPoint,
    ProductPoint,
    RegionPoint,
    RealizationAnalyticsOut,
    PaymentSummaryOut,
    RealizationListOut,
    RealizationOut,
)

router = APIRouter(prefix="/realizations", tags=["Realizations"])

SZR_SUBCATEGORIES = {"Гербицид", "Фунгицид", "Инсектицид", "Пестицид / СЗР", "Пестицид", "Протравитель"}
SZR_LABEL = "СЗР"


def _map_category(category):
    if category in SZR_SUBCATEGORIES:
        return SZR_LABEL
    return category or "Без категории"


def _normalize_bin(value):
    if value is None:
        return None
    v = str(value).split(".")[0].strip()
    if not v:
        return None
    return v.zfill(12) if v.isdigit() and len(v) < 12 else v


# Canonical region resolution: map cities/oblast spellings to a single oblast level.
_OBLAST_KEYWORDS = [
    ("костанайск", "Костанайская обл."),
    ("акмолинск", "Акмолинская обл."),
    ("северо-казахстан", "СКО"),
    ("сев.каз", "СКО"),
    ("павлодарск", "Павлодарская обл."),
    ("карагандинск", "Карагандинская обл."),
    ("актюбинск", "Актюбинская обл."),
    ("алматинск", "Алматинская обл."),
    ("жамбылск", "Жамбылская обл."),
    ("джамбулск", "Жамбылская обл."),
    ("западно-казахстан", "ЗКО"),
    ("восточно-казахстан", "ВКО"),
    ("туркестанск", "Туркестанская обл."),
    ("кызылординск", "Кызылординская обл."),
    ("атырауск", "Атырауская обл."),
    ("мангистауск", "Мангистауская обл."),
    ("абайск", "Абайская обл."),
    ("жетісу", "Жетысуская обл."),
    ("жетысу", "Жетысуская обл."),
    ("улытау", "Улытауская обл."),
]
_CITY_TO_REGION = [
    (("костанай", "рудный", "лисаковск", "аркалык"), "Костанайская обл."),
    (("кокшетау", "акколь", "степногорск", "атбасар", "державинск", "есиль", "макинск", "щучинск", "бурабай"), "Акмолинская обл."),
    (("петропавловск", "петропавлоск", "булаево", "мамлютка"), "СКО"),
    (("павлодар", "экибастуз", "аксу"), "Павлодарская обл."),
    (("астана", "нур-султан", "нурсултан", "целиноград"), "Астана"),
    (("алматы", "алма-ата"), "г. Алматы"),
    (("шымкент", "чимкент"), "г. Шымкент"),
    (("тараз", "джамбул", "жамбыл"), "Жамбылская обл."),
    (("караганда", "темиртау", "балхаш", "жезказган", "сарань", "абай"), "Карагандинская обл."),
    (("уральск",), "ЗКО"),
    (("актобе",), "Актюбинская обл."),
    (("атырау",), "Атырауская обл."),
    (("усть-каменогорск", "семей", "риддер"), "ВКО"),
    (("кызылорда",), "Кызылординская обл."),
    (("актау",), "Мангистауская обл."),
    (("талдыкорган", "текели"), "Жетысуская обл."),
    (("тургай",), "Костанайская обл."),
]


def _region(address):
    if not address:
        return None
    a = address.lower()
    for key, val in _OBLAST_KEYWORDS:
        if key in a:
            return val
    for cities, val in _CITY_TO_REGION:
        if any(city in a for city in cities):
            return val
    return None


def _region_by_bin(db):
    out = {}
    for c in db.query(Counterparty).all():
        nb = _normalize_bin(c.bin_iin)
        if nb:
            out[nb] = _region(c.address)
    return out


def _apply_filters(query, *, counterparty, product, category, year, year_month):
    if counterparty:
        query = query.filter(Realization.counterparty.ilike(f"%{counterparty}%"))
    if product:
        query = query.filter(Realization.product_name.ilike(f"%{product}%"))
    if category:
        if category == SZR_LABEL:
            query = query.filter(Realization.category.in_(SZR_SUBCATEGORIES))
        else:
            query = query.filter(Realization.category == category)
    if year:
        query = query.filter(Realization.year == year)
    if year_month:
        query = query.filter(Realization.year_month == year_month)
    return query


@router.get("/", response_model=RealizationListOut)
def list_realizations(
    db: Session = Depends(get_db),
    counterparty: str | None = Query(default=None),
    product: str | None = Query(default=None),
    category: str | None = Query(default=None),
    year: int | None = Query(default=None),
    year_month: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    query = _apply_filters(
        db.query(Realization),
        counterparty=counterparty,
        product=product,
        category=category,
        year=year,
        year_month=year_month,
    )
    total = query.count()
    items = (
        query.order_by(Realization.realization_date.desc(), Realization.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {"total": total, "items": items}


@router.get("/analytics", response_model=RealizationAnalyticsOut)
def realizations_analytics(
    db: Session = Depends(get_db),
    year: int | None = Query(default=None),
    top: int = Query(default=10, ge=1, le=50),
):
    base = db.query(Realization)
    if year:
        base = base.filter(Realization.year == year)

    amount = func.coalesce(Realization.amount_with_vat, 0.0)
    vat = func.coalesce(Realization.vat_amount, 0.0)
    qty = func.coalesce(Realization.quantity, 0.0)

    totals = base.with_entities(
        func.coalesce(func.sum(amount), 0.0),
        func.coalesce(func.sum(vat), 0.0),
        func.coalesce(func.sum(qty), 0.0),
        func.count(Realization.id),
        func.count(distinct(Realization.document)),
        func.count(distinct(Realization.counterparty)),
        func.count(distinct(Realization.product_name)),
        func.min(Realization.realization_date),
        func.max(Realization.realization_date),
    ).one()

    # Available years across the whole dataset (ignores the year filter).
    years = [
        row[0]
        for row in db.query(distinct(Realization.year))
        .filter(Realization.year.isnot(None))
        .order_by(Realization.year)
        .all()
    ]

    by_month = [
        MonthPoint(year_month=row[0], amount=float(row[1] or 0), count=int(row[2]))
        for row in base.with_entities(
            Realization.year_month, func.sum(amount), func.count(Realization.id)
        )
        .filter(Realization.year_month.isnot(None))
        .group_by(Realization.year_month)
        .order_by(Realization.year_month)
        .all()
    ]

    _cat_merge: dict[str, list] = {}
    for cat, amt, q, cnt in (
        base.with_entities(
            Realization.category, func.sum(amount), func.sum(qty), func.count(Realization.id)
        )
        .group_by(Realization.category)
        .all()
    ):
        key = _map_category(cat)
        acc = _cat_merge.setdefault(key, [0.0, 0.0, 0])
        acc[0] += float(amt or 0)
        acc[1] += float(q or 0)
        acc[2] += int(cnt or 0)
    by_category = [
        CategoryPoint(category=k, amount=v[0], quantity=v[1], count=v[2])
        for k, v in sorted(_cat_merge.items(), key=lambda x: -x[1][0])
    ]

    region_map = _region_by_bin(db)
    _reg_merge: dict[str, list] = {}
    for bin_, amt, cnt in (
        base.with_entities(Realization.bin_iin, func.sum(amount), func.count(Realization.id))
        .group_by(Realization.bin_iin)
        .all()
    ):
        reg = region_map.get(_normalize_bin(bin_)) or "Не указан"
        acc = _reg_merge.setdefault(reg, [0.0, 0])
        acc[0] += float(amt or 0)
        acc[1] += int(cnt or 0)
    by_region = [
        RegionPoint(region=k, amount=v[0], count=v[1])
        for k, v in sorted(_reg_merge.items(), key=lambda x: -x[1][0])
    ]

    top_products = [
        ProductPoint(
            product_name=row[0] or "—",
            category=row[1],
            amount=float(row[2] or 0),
            quantity=float(row[3] or 0),
            count=int(row[4]),
        )
        for row in base.with_entities(
            Realization.product_name,
            func.max(Realization.category),
            func.sum(amount),
            func.sum(qty),
            func.count(Realization.id),
        )
        .filter(Realization.product_name.isnot(None))
        .group_by(Realization.product_name)
        .order_by(func.sum(amount).desc())
        .limit(top)
        .all()
    ]

    top_counterparties = [
        CounterpartyPoint(
            counterparty=row[0] or "—",
            amount=float(row[1] or 0),
            count=int(row[2]),
        )
        for row in base.with_entities(
            Realization.counterparty, func.sum(amount), func.count(Realization.id)
        )
        .filter(Realization.counterparty.isnot(None))
        .group_by(Realization.counterparty)
        .order_by(func.sum(amount).desc())
        .limit(top)
        .all()
    ]

    date_from, date_to = totals[7], totals[8]
    return RealizationAnalyticsOut(
        total_amount=float(totals[0] or 0),
        total_vat=float(totals[1] or 0),
        total_quantity=float(totals[2] or 0),
        line_items=int(totals[3] or 0),
        documents=int(totals[4] or 0),
        counterparties=int(totals[5] or 0),
        products=int(totals[6] or 0),
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
        years=years,
        by_month=by_month,
        by_category=by_category,
        by_region=by_region,
        top_products=top_products,
        top_counterparties=top_counterparties,
    )


@router.get("/payment-summary", response_model=PaymentSummaryOut)
def payment_summary(db: Session = Depends(get_db), year: int | None = Query(default=None)):
    from collections import defaultdict

    years = [
        r[0]
        for r in db.query(distinct(Realization.year)).filter(Realization.year.isnot(None)).order_by(Realization.year).all()
    ]

    # Realizations total (respecting the year slice)
    rq = db.query(func.coalesce(func.sum(Realization.amount_with_vat), 0.0))
    if year:
        rq = rq.filter(Realization.year == year)
    total = float(rq.scalar() or 0.0)

    # Attribute each debt row to a year: by matching contract ref head, else client's latest active year
    heads: dict = defaultdict(list)
    latest: dict = {}
    for bin_, ref, yr in db.query(
        Realization.bin_iin, Realization.contract_ref, Realization.year
    ).distinct():
        nb = _normalize_bin(bin_)
        if not nb or yr is None:
            continue
        if ref:
            head = re.split(r"\bот\b", str(ref).lower())[0].strip()
            head = re.sub(r"\s+", " ", head)
            if head:
                heads[nb].append((head, yr))
        latest[nb] = max(latest.get(nb, yr), yr)

    debt_by_year: dict = defaultdict(float)
    debt_total = 0.0
    for bin_, cname, amt in db.query(Debt.bin_iin, Debt.contract_name, Debt.debt_amount):
        a = float(amt or 0)
        debt_total += a
        nb = _normalize_bin(bin_)
        yr = None
        if nb:
            dn = (cname or "").lower()
            for head, hy in heads.get(nb, []):
                if head and (head in dn or dn in head):
                    yr = hy
                    break
            if yr is None:
                yr = latest.get(nb)
        if yr is not None:
            debt_by_year[yr] += a

    unpaid = float(debt_by_year.get(year, 0.0)) if year else float(debt_total)
    paid = max(0.0, total - unpaid)
    return PaymentSummaryOut(year=year, total_realizations=total, paid=paid, unpaid=unpaid, years=years)

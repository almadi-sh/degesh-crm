import json
import os
import re
import urllib.request
from collections import defaultdict
from statistics import median

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.counterparty import Counterparty
from app.models.realization import Realization
from app.models.warehouse_stock import WarehouseStock
from app.models.contract_ext import ExtContract
from app.schemas.lead import (
    LeadDetailOut,
    LeadEvidenceItem,
    LeadOut,
    LeadRelatedAppendix,
    LeadSeason,
    LeadsResponse,
    LeadTypeStat,
)

router = APIRouter(prefix="/leads", tags=["Leads"])

MIN_BUYER_TOTAL = 500_000       # ignore tiny buyers
CROSS_SELL_TOP_N = 4            # only recommend popular categories
GROWTH_BELOW_RATIO = 0.5       # buyer spends < 50% of peer median
MONTH_NAMES = ["", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]


def _fmt(n: float) -> str:
    return f"{n:,.0f}".replace(",", " ")


SZR_SUBCATEGORIES = {"Гербицид", "Фунгицид", "Инсектицид", "Пестицид / СЗР", "Пестицид", "Протравитель"}


def _map_cat(category):
    if category in SZR_SUBCATEGORIES:
        return "СЗР"
    return category or "Без категории"


def _normalize_bin(value):
    if value is None:
        return None
    s = str(value).split(".")[0].strip()
    if not s:
        return None
    if s.isdigit() and len(s) < 12:
        return s.zfill(12)
    return s


def _norm_prod(name):
    if not name:
        return None
    toks = [t for t in re.split(r"[^0-9A-Za-zА-Яа-яЁё]+", str(name).lower()) if len(t) >= 3]
    return toks[0] if toks else None


def _region(address):
    if not address:
        return None
    m = re.search(r"г\.?\s*([А-Яа-яЁёA-Za-z\-]+)", address)
    if m:
        return m.group(1).strip(" .,")
    m = re.search(r"([А-Яа-яЁё\-]+)\s+област", address, re.IGNORECASE)
    if m:
        return m.group(1)
    return None


def _compute_leads(db: Session):
    rows = db.query(
        Realization.bin_iin,
        Realization.counterparty,
        Realization.category,
        Realization.product_name,
        Realization.amount_with_vat,
        Realization.realization_date,
        Realization.year,
    ).all()

    # Determine current season window from the latest date.
    dates = [r.realization_date for r in rows if r.realization_date]
    latest = max(dates) if dates else None
    current_year = latest.year if latest else None
    center = latest.month if latest else 6
    season = {((center - 2 + k) % 12) + 1 for k in range(3)}  # 3-month window centred on latest
    season_label = "–".join(MONTH_NAMES[m] for m in sorted(season))

    # Per-buyer aggregates
    buyer_name: dict[str, str] = {}
    buyer_total: dict[str, float] = defaultdict(float)
    buyer_last: dict[str, object] = {}
    bc_amount: dict[tuple[str, str], float] = defaultdict(float)          # (bin,cat) -> amount
    bc_season_hist: dict[tuple[str, str], float] = defaultdict(float)     # prior-year season spend
    bc_season_hist_years: dict[tuple[str, str], set] = defaultdict(set)
    bc_season_cur: dict[tuple[str, str], float] = defaultdict(float)      # current-year season spend

    cat_buyers: dict[str, set] = defaultdict(set)
    cat_product_amount: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    bp_amount: dict[tuple[str, str], float] = defaultdict(float)  # (bin, norm_product) -> amount

    for bin_, name, category, product, amount, rdate, year in rows:
        nb = _normalize_bin(bin_)
        if not nb:
            continue
        cat = _map_cat(category)
        amt = float(amount or 0)

        buyer_total[nb] += amt
        if name and nb not in buyer_name:
            buyer_name[nb] = str(name).strip()
        if rdate and (nb not in buyer_last or rdate > buyer_last[nb]):
            buyer_last[nb] = rdate

        bc_amount[(nb, cat)] += amt
        cat_buyers[cat].add(nb)
        if product:
            cat_product_amount[cat][product] += amt
            npkey = _norm_prod(product)
            if npkey:
                bp_amount[(nb, npkey)] += amt

        month = rdate.month if rdate else None
        if month in season:
            if current_year and year == current_year:
                bc_season_cur[(nb, cat)] += amt
            elif year is not None:
                bc_season_hist[(nb, cat)] += amt
                bc_season_hist_years[(nb, cat)].add(year)

    # Peer median spend per category (across buyers who buy it)
    cat_amounts: dict[str, list[float]] = defaultdict(list)
    for (nb, cat), amt in bc_amount.items():
        cat_amounts[cat].append(amt)
    cat_median = {cat: median(vals) for cat, vals in cat_amounts.items() if vals}

    cat_top_product = {
        cat: max(products.items(), key=lambda x: x[1])[0]
        for cat, products in cat_product_amount.items()
        if products
    }

    # Most popular categories (by number of distinct buyers)
    top_cross_categories = [
        cat for cat, _ in sorted(cat_buyers.items(), key=lambda x: -len(x[1]))[:CROSS_SELL_TOP_N]
    ]

    # Phones
    phones: dict[str, str] = {}
    for c in db.query(Counterparty).all():
        nb = _normalize_bin(c.bin_iin)
        if nb and c.phone:
            phones[nb] = c.phone

    # Buyer regions (from counterparty address) and warehouse stock
    regions: dict[str, str] = {}
    for c in db.query(Counterparty).all():
        nb = _normalize_bin(c.bin_iin)
        if nb and c.address:
            regions[nb] = _region(c.address)
    stock: dict[str, list[dict]] = defaultdict(list)
    for st in db.query(WarehouseStock).all():
        stock[st.warehouse].append(
            {"name": st.product_name, "qty": st.quantity, "unit": st.unit, "norm": _norm_prod(st.product_name)}
        )
    wh_cities = list(stock.keys())

    buyers = [b for b, total in buyer_total.items() if total >= MIN_BUYER_TOTAL]
    leads: list[dict] = []

    for nb in buyers:
        name = buyer_name.get(nb)
        total = buyer_total[nb]
        last = buyer_last.get(nb)
        last_iso = last.isoformat() if last else None
        phone = phones.get(nb)
        bought_cats = {cat for (b, cat) in bc_amount if b == nb}

        def base(lead_type, category, potential, reason, product):
            return {
                "bin_iin": nb,
                "company_name": name,
                "phone": phone,
                "lead_type": lead_type,
                "category": category,
                "suggested_product": product,
                "reason": reason,
                "potential": max(0.0, float(potential)),
                "total_bought": total,
                "last_purchase": last_iso,
            }

        # 1) Cross-sell: popular categories the buyer does not purchase yet
        for cat in top_cross_categories:
            if cat in bought_cats:
                continue
            potential = cat_median.get(cat, 0.0)
            if potential <= 0:
                continue
            leads.append(
                base(
                    "Кросс-продажа",
                    cat,
                    potential,
                    f"Не покупает категорию «{cat}», которую берут похожие клиенты. "
                    f"Средний чек по категории ≈ {_fmt(potential)} ₸.",
                    cat_top_product.get(cat),
                )
            )

        # 2) Growth: categories bought well below peer median
        for cat in bought_cats:
            spent = bc_amount[(nb, cat)]
            med = cat_median.get(cat, 0.0)
            if med > 0 and spent < med * GROWTH_BELOW_RATIO:
                leads.append(
                    base(
                        "Потенциал роста",
                        cat,
                        med - spent,
                        f"По «{cat}» закупает {_fmt(spent)} ₸ против медианы ≈ {_fmt(med)} ₸ "
                        f"у похожих клиентов — есть куда расти.",
                        cat_top_product.get(cat),
                    )
                )

        # 3) Seasonal: bought category this season in prior years, but not this season yet
        for cat in bought_cats:
            hist = bc_season_hist[(nb, cat)]
            cur = bc_season_cur[(nb, cat)]
            years = len(bc_season_hist_years[(nb, cat)])
            if hist > 0 and cur == 0 and years > 0:
                per_year = hist / years
                leads.append(
                    base(
                        "Сезонная допродажа",
                        cat,
                        per_year,
                        f"В сезон ({season_label}) прошлых лет брал «{cat}» на ≈ {_fmt(per_year)} ₸/год, "
                        f"в этом сезоне ещё не покупал.",
                        cat_top_product.get(cat),
                    )
                )

        # 4) Local stock offer: warehouse in buyer's region has products in stock
        region = regions.get(nb)
        if region and wh_cities:
            for wh in wh_cities:
                if wh.lower() in region.lower() or region.lower() in wh.lower():
                    items = stock[wh]
                    repeats = sorted(
                        [it for it in items if it["norm"] and bp_amount.get((nb, it["norm"]), 0) > 0],
                        key=lambda it: -bp_amount[(nb, it["norm"])],
                    )
                    if repeats:
                        for it in repeats[:5]:
                            spent = bp_amount[(nb, it["norm"])]
                            qty = f"{it['qty']:g} {it['unit'] or ''}".strip() if it["qty"] is not None else ""
                            leads.append(
                                base(
                                    "Предложение остатков",
                                    f"Склад {wh}",
                                    spent,
                                    f"На складе {wh} есть «{it['name']}» ({qty}) — клиент из региона {region}, "
                                    f"уже покупал этот товар (на {_fmt(spent)} ₸).",
                                    it["name"],
                                )
                            )
                    else:
                        top = sorted([it for it in items if it["qty"]], key=lambda it: -(it["qty"] or 0))[:2]
                        for it in top:
                            qty = f"{it['qty']:g} {it['unit'] or ''}".strip()
                            leads.append(
                                base(
                                    "Предложение остатков",
                                    f"Склад {wh}",
                                    0.0,
                                    f"На складе {wh} есть «{it['name']}» ({qty}) — предложить клиенту из региона {region}.",
                                    it["name"],
                                )
                            )
                    break

    leads.sort(key=lambda x: -x["potential"])
    return leads, len(buyers), season_label


@router.get("/", response_model=LeadsResponse)
def list_leads(
    db: Session = Depends(get_db),
    lead_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=2000),
):
    leads, buyers_analyzed, season_label = _compute_leads(db)

    by_type_map: dict[str, LeadTypeStat] = {}
    for l in leads:
        stat = by_type_map.setdefault(l["lead_type"], LeadTypeStat(lead_type=l["lead_type"], count=0, potential=0.0))
        stat.count += 1
        stat.potential += l["potential"]
    by_type = sorted(by_type_map.values(), key=lambda s: -s.potential)

    filtered = leads
    if lead_type:
        filtered = [l for l in filtered if l["lead_type"] == lead_type]
    if search:
        needle = search.lower()
        filtered = [
            l
            for l in filtered
            if (l["company_name"] and needle in l["company_name"].lower())
            or (l["bin_iin"] and needle in l["bin_iin"])
        ]

    return LeadsResponse(
        total_leads=len(leads),
        total_potential=sum(l["potential"] for l in leads),
        buyers_analyzed=buyers_analyzed,
        season_label=season_label,
        by_type=by_type,
        items=[LeadOut(**l) for l in filtered[:limit]],
    )


def _openai_lead(name, evidence_text, category, product):
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    payload = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": (
                "Ты помощник менеджера по продажам агрохимии. По фактам сформулируй короткую "
                "деловую рекомендацию для звонка (1-3 предложения, по-русски), без выдумок."
            )},
            {"role": "user", "content": f"Клиент: {name}. Категория/товар: {category} / {product}. Факты: {evidence_text}"},
        ],
        "temperature": 0.4,
        "max_tokens": 220,
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


def _qty_str(q, unit):
    if q is None:
        return ""
    return f"{q:g} {unit or ''}".strip()


def _lead_narrative(name, category, product, season_label, current_year, seasons, current_season, related, ai):
    parts = []
    hist = seasons[0] if seasons else None
    subject = product or category or "эту категорию"
    if hist and hist.items:
        top = hist.items[0]
        parts.append(
            f"В сезон ({season_label}) {hist.year} закупал {subject}: {top.product} — "
            f"{_qty_str(top.quantity, top.unit)} на {_fmt(top.amount)} ₸."
        )
    if current_season and current_season.items:
        parts.append(f"В сезоне {current_year} по этой позиции уже закуплено на {_fmt(current_season.amount)} ₸.")
    else:
        parts.append(f"В сезоне {current_year} закупок по этой позиции ещё нет.")
    if related:
        r = related[0]
        parts.append(
            f"По договору №{r.contract_number} (приложение №{r.appendix_number} от {r.appendix_date}) "
            f"заказывал {r.item_name} — {_qty_str(r.quantity, r.unit)} на {_fmt(r.amount or 0)} ₸."
        )
    rule = " ".join(parts) or "Недостаточно истории для детализации."
    if ai:
        ai_text = _openai_lead(name, rule, category, product)
        if ai_text:
            return ai_text, "openai"
    return rule, "rule"


@router.get("/detail", response_model=LeadDetailOut)
def lead_detail(
    bin_iin: str,
    category: str | None = Query(default=None),
    lead_type: str | None = Query(default=None),
    product: str | None = Query(default=None),
    ai: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    nb = _normalize_bin(bin_iin) or bin_iin
    cand = {nb, nb.lstrip("0")}

    latest = db.query(func.max(Realization.realization_date)).scalar()
    current_year = latest.year if latest else None
    center = latest.month if latest else 6
    season = {((center - 2 + k) % 12) + 1 for k in range(3)}
    season_label = "–".join(MONTH_NAMES[m] for m in sorted(season))

    rows = db.query(Realization).filter(Realization.bin_iin.in_(cand)).all()
    name = next((r.counterparty for r in rows if r.counterparty), None)

    target_category = category if (category and not category.startswith("Склад")) else None
    target_base = _norm_prod(product) if product else None

    def _match(r):
        if target_category and _map_cat(r.category) == target_category:
            return True
        if target_base and _norm_prod(r.product_name) == target_base:
            return True
        return not target_category and not target_base

    lines = [
        r for r in rows
        if _match(r) and r.realization_date and r.realization_date.month in season
    ]

    agg: dict = {}
    for r in lines:
        key = (r.year, r.product_name or r.nomenclature)
        a = agg.setdefault(key, {"amount": 0.0, "qty": 0.0, "unit": r.unit, "month": r.realization_date.month, "last": r.realization_date})
        a["amount"] += float(r.amount_with_vat or 0)
        a["qty"] += float(r.quantity or 0)
        if r.realization_date > a["last"]:
            a["last"] = r.realization_date
            a["month"] = r.realization_date.month

    seasons_map: dict = defaultdict(list)
    for (yr, prod), a in agg.items():
        seasons_map[yr].append(
            LeadEvidenceItem(
                product=prod, quantity=a["qty"] or None, unit=a["unit"], amount=a["amount"],
                year=yr, month=a["month"], last_date=a["last"].isoformat() if a["last"] else None,
            )
        )

    current_season = None
    seasons = []
    for yr in sorted(seasons_map.keys(), key=lambda x: (x is not None, x), reverse=True):
        items = sorted(seasons_map[yr], key=lambda x: -x.amount)
        season_obj = LeadSeason(year=yr, amount=sum(i.amount for i in items), items=items)
        if yr == current_year:
            current_season = season_obj
        else:
            seasons.append(season_obj)

    related = []
    if target_base:
        for ct in db.query(ExtContract).filter(ExtContract.client_bin.in_(cand)).all():
            for app in ct.appendices:
                for it in app.items:
                    if _norm_prod(it.name) == target_base:
                        related.append(
                            LeadRelatedAppendix(
                                contract_id=ct.id, contract_number=ct.number, contract_date=ct.date,
                                appendix_number=app.appendix_number, appendix_date=app.appendix_date,
                                item_name=it.name, quantity=it.quantity, unit=it.unit, amount=it.total,
                            )
                        )
        related.sort(key=lambda x: -(x.amount or 0))
        related = related[:10]

    narrative, source = _lead_narrative(
        name, category, product, season_label, current_year, seasons, current_season, related, ai
    )

    return LeadDetailOut(
        bin_iin=nb, company_name=name, category=category, lead_type=lead_type,
        suggested_product=product, season_label=season_label, current_year=current_year,
        seasons=seasons, current_season=current_season, related_appendices=related,
        narrative=narrative, narrative_source=source,
    )

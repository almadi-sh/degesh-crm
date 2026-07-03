from pathlib import Path
import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.contract_ext import ExtAppendix, ExtAppendixItem, ExtContract, Shipment
from app.models.debt import Debt
from app.schemas.contract_ext import (
    AppendixItemOut,
    AppendixOut,
    ContractDetail,
    ContractListItem,
    ShipmentOut,
    ShipRequest,
)

router = APIRouter(prefix="/ext-contracts", tags=["Contracts"])

REPO_ROOT = Path(__file__).resolve().parents[4]
EPS = 1e-6


def _contracts_root() -> Path | None:
    for p in sorted(REPO_ROOT.glob("Договора Дегеш*")):
        if p.is_dir():
            return p
    return None


def _contract_file(folder_name: str | None) -> Path | None:
    if not folder_name:
        return None
    root = _contracts_root()
    if not root:
        return None
    folder = root / folder_name
    if not folder.is_dir():
        return None
    files = [f for f in folder.iterdir() if f.is_file() and not f.name.startswith("~$")]
    # Prefer the contract document (pdf/docx) over appendix spreadsheets
    for ext in (".pdf", ".docx", ".doc"):
        for f in files:
            if f.suffix.lower() == ext:
                return f
    return files[0] if files else None


def _item_status(qty, shipped) -> str:
    if not qty or qty <= 0:
        return "нет данных"
    if shipped <= EPS:
        return "не отгружен"
    if shipped >= qty - EPS:
        return "полностью отгружен"
    return "частично отгружен"


def _aggregate_status(statuses: list[str]) -> str:
    real = [s for s in statuses if s != "нет данных"]
    if not real:
        return "не отгружен"
    if all(s == "полностью отгружен" for s in real):
        return "полностью отгружен"
    if all(s == "не отгружен" for s in real):
        return "не отгружен"
    return "частично отгружен"


def _item_out(item: ExtAppendixItem) -> AppendixItemOut:
    shipped = sum((s.quantity or 0) for s in item.shipments)
    qty = item.quantity or 0
    remaining = max(0.0, qty - shipped) if qty else 0.0
    return AppendixItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        quantity=item.quantity,
        unit=item.unit,
        unit_price=item.unit_price,
        total=item.total,
        delivery_date=item.delivery_date,
        shipped=shipped,
        remaining=remaining,
        status=_item_status(item.quantity, shipped),
        shipments=[ShipmentOut.model_validate(s) for s in sorted(item.shipments, key=lambda x: x.id)],
    )


def _appendix_out(app: ExtAppendix) -> AppendixOut:
    items = [_item_out(it) for it in app.items]
    return AppendixOut(
        id=app.id,
        appendix_number=app.appendix_number,
        appendix_date=app.appendix_date,
        source_file=app.source_file,
        stated_total=app.stated_total,
        payment_schedule=app.payment_schedule or [],
        delivery_terms=app.delivery_terms,
        status=_aggregate_status([i.status for i in items]),
        items=items,
    )


def _contract_status(contract: ExtContract) -> str:
    statuses = []
    for app in contract.appendices:
        for it in app.items:
            shipped = sum((s.quantity or 0) for s in it.shipments)
            statuses.append(_item_status(it.quantity, shipped))
    return _aggregate_status(statuses)


def _bin_candidates(bin_iin: str) -> set:
    s = str(bin_iin or "").strip()
    return {s, s.lstrip("0"), s.zfill(12)}


def _client_debts(db: Session, client_bin: str | None):
    if not client_bin:
        return []
    return db.query(Debt).filter(Debt.bin_iin.in_(_bin_candidates(client_bin))).all()


def _payment(contract: ExtContract, client_debts) -> dict:
    total = contract.contract_total or 0
    num = re.sub(r"\s+", " ", str(contract.number or "").lower().strip())
    specific = bool(num) and not (num.isdigit() and len(num) < 5)
    matched = [d for d in client_debts if specific and num in (d.contract_name or "").lower()]
    if matched:
        unpaid = sum((d.debt_amount or 0) for d in matched)
    elif not client_debts:
        unpaid = 0.0  # client has no receivables at all -> paid
    else:
        unpaid = None  # cannot attribute a specific figure
    if unpaid is None or total <= 0:
        return {"payment_status": "не определён", "paid_amount": None, "unpaid_amount": None}
    if unpaid <= EPS:
        return {"payment_status": "оплачен", "paid_amount": total, "unpaid_amount": 0.0}
    if unpaid >= total - EPS:
        return {"payment_status": "не оплачен", "paid_amount": 0.0, "unpaid_amount": unpaid}
    return {"payment_status": "частично оплачен", "paid_amount": max(0.0, total - unpaid), "unpaid_amount": unpaid}


@router.get("/by-client/{bin_iin}", response_model=list[ContractListItem])
def contracts_by_client(bin_iin: str, db: Session = Depends(get_db)):
    s = str(bin_iin).strip()
    candidates = {s, s.lstrip("0"), s.zfill(12)}
    contracts = db.query(ExtContract).filter(ExtContract.client_bin.in_(candidates)).all()
    debts = _client_debts(db, str(bin_iin).strip())
    result = []
    for c in sorted(contracts, key=lambda x: (x.date or ""), reverse=True):
        pay = _payment(c, debts)
        result.append(
            ContractListItem(
                id=c.id,
                number=c.number,
                date=c.date,
                buyer_name=c.buyer_name,
                contract_total=c.contract_total,
                currency=c.currency,
                appendix_count=len(c.appendices),
                status=_contract_status(c),
                payment_status=pay["payment_status"],
                paid_amount=pay["paid_amount"],
                unpaid_amount=pay["unpaid_amount"],
                cancelled=bool(c.cancelled),
                has_file=_contract_file(c.folder_name) is not None,
            )
        )
    return result


@router.get("/{contract_id}", response_model=ContractDetail)
def contract_detail(contract_id: int, db: Session = Depends(get_db)):
    c = db.query(ExtContract).filter(ExtContract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    appendices = [_appendix_out(a) for a in sorted(c.appendices, key=lambda x: x.position)]
    pay = _payment(c, _client_debts(db, c.client_bin))
    return ContractDetail(
        id=c.id,
        folder_name=c.folder_name,
        number=c.number,
        date=c.date,
        buyer_name=c.buyer_name,
        supplier_name=c.supplier_name,
        contract_total=c.contract_total,
        currency=c.currency,
        client_bin=c.client_bin,
        manager=c.manager,
        cancelled=bool(c.cancelled),
        summary_for_manager=c.summary_for_manager,
        status=_contract_status(c),
        payment_status=pay["payment_status"],
        paid_amount=pay["paid_amount"],
        unpaid_amount=pay["unpaid_amount"],
        appendix_count=len(c.appendices),
        has_file=_contract_file(c.folder_name) is not None,
        appendices=appendices,
    )


@router.post("/items/{item_id}/ship", response_model=AppendixItemOut)
def ship_item(item_id: int, payload: ShipRequest, db: Session = Depends(get_db)):
    item = db.query(ExtAppendixItem).filter(ExtAppendixItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if payload.quantity is None or payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Количество должно быть больше нуля")
    shipped = sum((s.quantity or 0) for s in item.shipments)
    remaining = (item.quantity or 0) - shipped
    if item.quantity and payload.quantity > remaining + EPS:
        raise HTTPException(
            status_code=400,
            detail=f"Нельзя отгрузить {payload.quantity}: осталось отгрузить {remaining:g}",
        )
    shipment = Shipment(
        appendix_item_id=item.id,
        warehouse=payload.warehouse,
        quantity=payload.quantity,
        note=payload.note,
    )
    db.add(shipment)
    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.delete("/shipments/{shipment_id}", response_model=AppendixItemOut)
def delete_shipment(shipment_id: int, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    item = shipment.item
    db.delete(shipment)
    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.get("/{contract_id}/download")
def download_contract(contract_id: int, db: Session = Depends(get_db)):
    c = db.query(ExtContract).filter(ExtContract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    path = _contract_file(c.folder_name)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="Файл договора не найден")
    return FileResponse(path=str(path), filename=path.name)

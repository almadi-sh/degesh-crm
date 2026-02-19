import logging
from io import BytesIO
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from openpyxl import Workbook
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.contract import Contract
from app.models.contract_item import ContractItem
from app.models.inventory import Inventory
from app.models.product import Product
from app.schemas.contract_item import ContractItemCreate, ContractItemOut, ContractItemUpdate

router = APIRouter(prefix="/contract-items", tags=["Contract Items"])
logger = logging.getLogger("uvicorn.access")


def _calculate_total_amount(quantity: float, price: float, vat_enabled: bool) -> float:
    vat_multiplier = 1.16 if vat_enabled else 1.0
    return quantity * price * vat_multiplier


def _reserve_inventory(db: Session, product_id: int, quantity: float) -> None:
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv or inv.quantity_available < quantity:
        raise HTTPException(status_code=400, detail=f"Not enough inventory for product_id {product_id}")
    inv.quantity_available -= quantity
    inv.quantity_reserved += quantity
    db.add(inv)


def _release_inventory(db: Session, product_id: int, quantity: float) -> None:
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv:
        return
    inv.quantity_available += quantity
    inv.quantity_reserved = max(inv.quantity_reserved - quantity, 0)
    db.add(inv)


def _build_appendix_xlsx(rows: list[list[str | float]]) -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Appendix"

    for row in rows:
        worksheet.append(row)

    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


@router.post("/", response_model=ContractItemOut)
def create_contract_item(data: ContractItemCreate, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == data.contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.status != "Draft":
        raise HTTPException(status_code=400, detail="Contract items can only be added in Draft status")

    _reserve_inventory(db, data.product_id, data.quantity)
    total_amount = _calculate_total_amount(data.quantity, data.price, data.vat_enabled)

    contract_item = ContractItem(
        contract_id=data.contract_id,
        product_id=data.product_id,
        quantity=data.quantity,
        price=data.price,
        total_amount=total_amount,
        vat_enabled=data.vat_enabled,
        delivery_enabled=data.delivery_enabled,
        delivery_terms=data.delivery_terms if data.delivery_enabled else None,
        appendix_number=max(data.appendix_number, 1),
    )
    db.add(contract_item)
    db.commit()
    db.refresh(contract_item)
    logger.info("POST /contract-items -> %s", contract_item.id)
    return contract_item


@router.get("/", response_model=List[ContractItemOut])
def list_contract_items(
    db: Session = Depends(get_db),
    customer_id: int | None = Query(default=None),
    contract_id: int | None = Query(default=None),
):
    query = db.query(ContractItem)
    if contract_id is not None:
        query = query.filter(ContractItem.contract_id == contract_id)
    if customer_id is not None:
        query = query.join(Contract).filter(Contract.customer_id == customer_id)
    return query.all()


@router.get("/contract/{contract_id}/appendix/{appendix_number}/export-xlsx")
def export_appendix_xlsx(contract_id: int, appendix_number: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    items = (
        db.query(ContractItem, Product)
        .join(Product, Product.id == ContractItem.product_id)
        .filter(ContractItem.contract_id == contract_id, ContractItem.appendix_number == appendix_number)
        .all()
    )
    if not items:
        raise HTTPException(status_code=404, detail="Appendix has no items")

    rows: list[list[str | float]] = [
        [
            "Продукт",
            "Количество, л/кг/п.е.",
            "Цена вкл. НДС и таможенную пошлину, тенге/л/кг",
            "Общая стоимость, тенге",
            "Срок поставки",
            "Срок оплаты",
        ]
    ]
    for item, product in items:
        price_with_vat = item.price * 1.16 if item.vat_enabled else item.price
        rows.append(
            [
                product.name,
                item.quantity,
                price_with_vat,
                item.total_amount,
                item.delivery_terms or "",
                "",
            ]
        )

    file_bytes = _build_appendix_xlsx(rows)
    filename = f"appendix-{appendix_number}-contract-{contract.contract_number}.xlsx"
    return Response(
        content=file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.put("/{contract_item_id}", response_model=ContractItemOut)
def update_contract_item(
    contract_item_id: int,
    data: ContractItemUpdate,
    db: Session = Depends(get_db),
):
    contract_item = db.query(ContractItem).filter(ContractItem.id == contract_item_id).first()
    if not contract_item:
        raise HTTPException(status_code=404, detail="Contract item not found")

    if contract_item.contract.status != "Draft":
        raise HTTPException(status_code=400, detail="Contract items can only be updated in Draft status")

    update_data = data.dict(exclude_unset=True)
    if update_data.get("delivery_enabled") is False:
        update_data["delivery_terms"] = None
    if "product_id" in update_data or "quantity" in update_data:
        new_product_id = update_data.get("product_id", contract_item.product_id)
        new_quantity = update_data.get("quantity", contract_item.quantity)
        if new_product_id != contract_item.product_id:
            _release_inventory(db, contract_item.product_id, contract_item.quantity)
            _reserve_inventory(db, new_product_id, new_quantity)
        elif new_quantity != contract_item.quantity:
            diff = new_quantity - contract_item.quantity
            if diff > 0:
                _reserve_inventory(db, contract_item.product_id, diff)
            else:
                _release_inventory(db, contract_item.product_id, abs(diff))

    for key, value in update_data.items():
        setattr(contract_item, key, value)

    if "quantity" in update_data or "price" in update_data or "vat_enabled" in update_data:
        contract_item.total_amount = _calculate_total_amount(
            contract_item.quantity,
            contract_item.price,
            contract_item.vat_enabled,
        )

    db.commit()
    db.refresh(contract_item)
    logger.info("PUT /contract-items/%s", contract_item_id)
    return contract_item


@router.delete("/{contract_item_id}", status_code=204)
def delete_contract_item(contract_item_id: int, db: Session = Depends(get_db)):
    contract_item = db.query(ContractItem).filter(ContractItem.id == contract_item_id).first()
    if not contract_item:
        raise HTTPException(status_code=404, detail="Contract item not found")

    _release_inventory(db, contract_item.product_id, contract_item.quantity)
    db.delete(contract_item)
    db.commit()
    logger.info("DELETE /contract-items/%s", contract_item_id)

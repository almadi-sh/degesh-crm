from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, asc, desc
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.contract import Contract
from app.models.contract_item import ContractItem
from app.models.customer import Customer
from app.models.employee import Employee
from app.models.inventory import Inventory
from app.models.inventory_receipt import InventoryReceipt
from app.models.product import Product
from app.models.reservation import Reservation
from app.schemas.inventory import (
    InventoryOut,
    InventoryUpdate,
    InventorySnapshotItem,
    ReservationTimelineItem,
    InventoryReceiptCreate,
    InventoryReceiptOut,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _format_contract_number(contract_id: int, contract_date) -> str:
    if not contract_id or not contract_date:
        return "—"
    return f"№{contract_id}-{contract_date:%m-%d}"


@router.post("/receipts", response_model=InventoryReceiptOut)
def create_receipt(data: InventoryReceiptCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    inv = db.query(Inventory).filter(Inventory.product_id == data.product_id).first()
    if inv:
        inv.quantity_available += data.quantity
    else:
        inv = Inventory(product_id=data.product_id, quantity_available=data.quantity, quantity_reserved=0)
        db.add(inv)
        db.flush()

    receipt = InventoryReceipt(
        inventory_id=inv.id,
        product_id=data.product_id,
        quantity=data.quantity,
        needs_enrichment=False,
        supplier_contract_number=data.supplier_contract_number,
        supplier_name=data.supplier_name,
        comment=data.comment,
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    return InventoryReceiptOut(
        id=receipt.id,
        product_id=receipt.product_id,
        product_name=product.name,
        quantity=float(receipt.quantity),
        supplier_contract_number=receipt.supplier_contract_number,
        supplier_name=receipt.supplier_name,
        comment=receipt.comment,
        received_at=receipt.received_at,
    )


@router.get("/receipts", response_model=List[InventoryReceiptOut])
def list_receipts(db: Session = Depends(get_db)):
    rows = (
        db.query(InventoryReceipt, Product.name.label("product_name"))
        .join(Product, Product.id == InventoryReceipt.product_id)
        .order_by(desc(InventoryReceipt.received_at), desc(InventoryReceipt.id))
        .all()
    )

    return [
        InventoryReceiptOut(
            id=receipt.id,
            product_id=receipt.product_id,
            product_name=product_name,
            quantity=float(receipt.quantity),
            supplier_contract_number=receipt.supplier_contract_number,
            supplier_name=receipt.supplier_name,
            comment=receipt.comment,
            received_at=receipt.received_at,
        )
        for receipt, product_name in rows
    ]


@router.get("/reservations", response_model=List[ReservationTimelineItem])
def reservations_feed(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Reservation.id,
            Reservation.contract_id,
            ContractItem.appendix_number,
            Reservation.quantity,
            Reservation.delivery_due_date,
            Reservation.priority,
            Product.name.label("product_name"),
            Contract.id.label("contract_id"),
            Contract.contract_date,
            Customer.name.label("customer_name"),
            Employee.name.label("employee_name"),
            ContractItem.delivery_terms,
        )
        .join(Product, Product.id == Reservation.product_id)
        .join(Contract, Contract.id == Reservation.contract_id)
        .join(ContractItem, ContractItem.id == Reservation.contract_item_id)
        .join(Customer, Customer.id == Reservation.customer_id)
        .outerjoin(Employee, Employee.id == Reservation.employee_id)
        .filter(Reservation.status == "active")
        .order_by(asc(Reservation.priority), asc(Reservation.created_at))
        .all()
    )

    return [
        ReservationTimelineItem(
            reservation_id=row.id,
            employee_name=row.employee_name or "Не назначен",
            contract_number=_format_contract_number(row.contract_id, row.contract_date),
            contract_id=row.contract_id,
            appendix_number=row.appendix_number,
            quantity=float(row.quantity),
            product_name=row.product_name,
            delivery_terms=row.delivery_terms,
            delivery_due_date=row.delivery_due_date,
            customer_name=row.customer_name,
            priority=row.priority,
        )
        for row in rows
    ]


@router.post("/", response_model=InventoryOut)
def add_inventory(product_id: int, quantity: float, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if inv:
        inv.quantity_available += quantity
    else:
        inv = Inventory(product_id=product_id, quantity_available=quantity, quantity_reserved=0)
        db.add(inv)
        db.flush()

    receipt = InventoryReceipt(inventory_id=inv.id, product_id=product_id, quantity=quantity, needs_enrichment=False)
    db.add(receipt)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/", response_model=List[InventoryOut])
def list_inventory(
    db: Session = Depends(get_db),
    product_id: int | None = Query(default=None),
):
    query = db.query(Inventory)
    if product_id is not None:
        query = query.filter(Inventory.product_id == product_id)
    return query.all()


@router.get("/snapshot", response_model=List[InventorySnapshotItem])
def inventory_snapshot(
    db: Session = Depends(get_db),
    product_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
):
    query = (
        db.query(
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            func.coalesce(func.sum(InventoryReceipt.quantity), 0).label("incoming_total"),
            func.coalesce(func.sum(Reservation.quantity), 0).label("reserved_total"),
            func.max(Inventory.quantity_available).label("available_total"),
        )
        .join(Inventory, Inventory.product_id == Product.id)
        .outerjoin(InventoryReceipt, InventoryReceipt.product_id == Product.id)
        .outerjoin(
            Reservation,
            (Reservation.product_id == Product.id) & (Reservation.status == "active"),
        )
        .group_by(Product.id, Product.name)
    )

    if product_id is not None:
        query = query.filter(Product.id == product_id)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    items: list[InventorySnapshotItem] = []
    for row in query.all():
        supplier_name = "—"
        if "|" in row.product_name:
            supplier_name = row.product_name.split("|", maxsplit=1)[0].strip()
        balance = float(row.incoming_total) - float(row.reserved_total)
        items.append(
            InventorySnapshotItem(
                product_id=row.product_id,
                product_name=row.product_name,
                supplier_name=supplier_name,
                incoming_total=float(row.incoming_total),
                reserved_total=float(row.reserved_total),
                available_total=float(row.available_total or 0),
                balance=balance,
            )
        )
    return items


@router.get("/{product_id}/reservations-timeline", response_model=List[ReservationTimelineItem])
def reservations_timeline(product_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(
            Reservation.id,
            Reservation.contract_id,
            ContractItem.appendix_number,
            Reservation.quantity,
            Reservation.delivery_due_date,
            Reservation.priority,
            Product.name.label("product_name"),
            Contract.id.label("contract_id"),
            Contract.contract_date,
            Customer.name.label("customer_name"),
            Employee.name.label("employee_name"),
            ContractItem.delivery_terms,
        )
        .join(Product, Product.id == Reservation.product_id)
        .join(Contract, Contract.id == Reservation.contract_id)
        .join(ContractItem, ContractItem.id == Reservation.contract_item_id)
        .join(Customer, Customer.id == Reservation.customer_id)
        .outerjoin(Employee, Employee.id == Reservation.employee_id)
        .filter(Reservation.product_id == product_id, Reservation.status == "active")
        .order_by(asc(Reservation.priority), asc(Reservation.created_at))
        .all()
    )

    return [
        ReservationTimelineItem(
            reservation_id=row.id,
            employee_name=row.employee_name or "Не назначен",
            contract_number=_format_contract_number(row.contract_id, row.contract_date),
            contract_id=row.contract_id,
            appendix_number=row.appendix_number,
            quantity=float(row.quantity),
            product_name=row.product_name,
            delivery_terms=row.delivery_terms,
            delivery_due_date=row.delivery_due_date,
            customer_name=row.customer_name,
            priority=row.priority,
        )
        for row in rows
    ]


@router.get("/{inventory_id}", response_model=InventoryOut)
def get_inventory(inventory_id: int, db: Session = Depends(get_db)):
    item = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.put("/{inventory_id}", response_model=InventoryOut)
def update_inventory(
    inventory_id: int,
    data: InventoryUpdate,
    db: Session = Depends(get_db),
):
    item = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

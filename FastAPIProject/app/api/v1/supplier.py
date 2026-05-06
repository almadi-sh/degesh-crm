from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.inventory_receipt import InventoryReceipt
from app.models.supplier import Supplier
from app.models.supplier_item import SupplierItem
from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.post("/", response_model=SupplierOut)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Supplier with this BIN/IIN already exists")
    db.refresh(supplier)
    return supplier


@router.get("/", response_model=List[SupplierOut])
def list_suppliers(
    db: Session = Depends(get_db),
    name: str | None = Query(default=None),
    bin_iin: str | None = Query(default=None),
    city: str | None = Query(default=None),
    contact_person: str | None = Query(default=None),
    supplier_scope: str | None = Query(default=None),
    product_type: str | None = Query(default=None),
):
    query = db.query(Supplier)
    if name:
        query = query.filter(Supplier.name.ilike(f"%{name}%"))
    if bin_iin:
        query = query.filter(Supplier.bin_iin.ilike(f"%{bin_iin}%"))
    if city:
        query = query.filter(Supplier.city.ilike(f"%{city}%"))
    if contact_person:
        query = query.filter(Supplier.contact_person.ilike(f"%{contact_person}%"))
    if supplier_scope:
        query = query.filter(Supplier.supplier_scope == supplier_scope)
    if product_type:
        query = query.filter(Supplier.product_type == product_type)
    return query.order_by(Supplier.name.asc()).all()


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: int, data: SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Supplier with this BIN/IIN already exists")
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    has_items = (
        db.query(SupplierItem.id)
        .filter(SupplierItem.supplier_id == supplier_id)
        .first()
    )
    if has_items:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить поставщика: к нему привязаны товары поставщика",
        )

    has_receipts = (
        db.query(InventoryReceipt.id)
        .filter(InventoryReceipt.supplier_id == supplier_id)
        .first()
    )
    if has_receipts:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить поставщика: к нему привязаны поступления на склад",
        )

    db.delete(supplier)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить поставщика: к нему привязаны связанные записи",
        )

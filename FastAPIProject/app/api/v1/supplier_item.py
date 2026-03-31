from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.supplier import Supplier
from app.models.supplier_item import SupplierItem
from app.schemas.supplier_item import SupplierItemCreate, SupplierItemOut, SupplierItemUpdate

router = APIRouter(prefix="/supplier-items", tags=["Supplier Items"])


@router.get("/", response_model=List[SupplierItemOut])
def list_supplier_items(
    db: Session = Depends(get_db),
    supplier_id: int | None = Query(default=None),
):
    query = db.query(SupplierItem)
    if supplier_id is not None:
        query = query.filter(SupplierItem.supplier_id == supplier_id)
    return query.order_by(SupplierItem.id.desc()).all()


@router.post("/", response_model=SupplierItemOut)
def create_supplier_item(data: SupplierItemCreate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    item = SupplierItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=SupplierItemOut)
def update_supplier_item(item_id: int, data: SupplierItemUpdate, db: Session = Depends(get_db)):
    item = db.query(SupplierItem).filter(SupplierItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Supplier item not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_supplier_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(SupplierItem).filter(SupplierItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Supplier item not found")

    db.delete(item)
    db.commit()

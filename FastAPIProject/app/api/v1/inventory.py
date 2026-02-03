from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.models.inventory import Inventory
from app.schemas.inventory import InventoryOut, InventoryUpdate
from app.models.product import Product
from app.api.deps import get_db

router = APIRouter(prefix="/inventory", tags=["Inventory"])

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

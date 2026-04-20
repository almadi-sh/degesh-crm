from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db
from app.models.inventory import Inventory
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["Products"])


def _statuses(customs_cleared: bool) -> tuple[str, str]:
    if customs_cleared:
        return "растаможен", "готов к отгрузке"
    return "не растаможен", "не готов к отгрузке"


@router.post("/", response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    payload = data.dict(exclude={"quantity_available"})
    product = Product(**payload)
    db.add(product)
    db.commit()
    db.refresh(product)

    customs_status, shipment_status = _statuses(product.customs_cleared)
    inventory_item = Inventory(
        product_id=product.id,
        supplier_id=product.supplier_id,
        quantity_available=data.quantity_available,
        quantity_reserved=0,
        customs_status=customs_status,
        shipment_status=shipment_status,
    )
    db.add(inventory_item)
    db.commit()

    return product


@router.get("/", response_model=List[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    name: str | None = Query(default=None),
    supplier_id: int | None = Query(default=None),
):
    query = db.query(Product)
    if name:
        query = query.filter(Product.name.ilike(f"%{name}%"))
    if supplier_id is not None:
        query = query.filter(Product.supplier_id == supplier_id)
    return query.all()


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.dict(exclude_unset=True, exclude={"quantity_available"})
    for key, value in update_data.items():
        setattr(product, key, value)

    inv = db.query(Inventory).filter(Inventory.product_id == product.id).first()
    if inv:
        inv.supplier_id = product.supplier_id
        customs_status, shipment_status = _statuses(product.customs_cleared)
        inv.customs_status = customs_status
        inv.shipment_status = shipment_status
        if data.quantity_available is not None:
            inv.quantity_available = data.quantity_available

    db.commit()
    db.refresh(product)
    return product

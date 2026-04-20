from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.inventory import Inventory
from app.models.inventory_receipt import InventoryReceipt
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.supplier_item import SupplierItem
from app.schemas.supplier_item import SupplierItemCreate, SupplierItemOut, SupplierItemUpdate

router = APIRouter(prefix="/supplier-items", tags=["Supplier Items"])
SUPPLIER_ITEM_RECEIPT_MARKER = "supplier_item_id:"


def _find_or_create_product(
    db: Session,
    *,
    name: str,
    unit: str,
    price: float,
) -> Product:
    product = (
        db.query(Product)
        .filter(Product.name == name, Product.unit == unit)
        .first()
    )
    if product:
        product.price = price
        return product

    product = Product(name=name, unit=unit, price=price)
    db.add(product)
    db.flush()
    return product


def _find_or_create_inventory(db: Session, *, product_id: int) -> Inventory:
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if inventory:
        return inventory

    inventory = Inventory(product_id=product_id, quantity_available=0, quantity_reserved=0)
    db.add(inventory)
    db.flush()
    return inventory


def _get_linked_receipt(db: Session, *, supplier_item_id: int) -> InventoryReceipt | None:
    return (
        db.query(InventoryReceipt)
        .filter(InventoryReceipt.comment == f"{SUPPLIER_ITEM_RECEIPT_MARKER}{supplier_item_id}")
        .first()
    )


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
    db.flush()

    product = _find_or_create_product(db, name=item.name, unit=item.unit, price=item.purchase_price)
    inventory = _find_or_create_inventory(db, product_id=product.id)
    inventory.quantity_available += item.quantity_available

    receipt = InventoryReceipt(
        inventory_id=inventory.id,
        product_id=product.id,
        quantity=item.quantity_available,
        needs_enrichment=False,
        supplier_id=supplier.id,
        supplier_name=supplier.name,
        comment=f"{SUPPLIER_ITEM_RECEIPT_MARKER}{item.id}",
    )
    db.add(receipt)

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

    supplier = db.query(Supplier).filter(Supplier.id == item.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    product = _find_or_create_product(db, name=item.name, unit=item.unit, price=item.purchase_price)
    target_inventory = _find_or_create_inventory(db, product_id=product.id)

    receipt = _get_linked_receipt(db, supplier_item_id=item_id)
    if receipt:
        old_inventory = db.query(Inventory).filter(Inventory.id == receipt.inventory_id).first()
        old_quantity = receipt.quantity

        if receipt.product_id != product.id:
            if old_inventory:
                old_inventory.quantity_available = max(0, old_inventory.quantity_available - old_quantity)
            target_inventory.quantity_available += item.quantity_available
            receipt.product_id = product.id
            receipt.inventory_id = target_inventory.id
        else:
            delta = item.quantity_available - old_quantity
            target_inventory.quantity_available += delta

        receipt.quantity = item.quantity_available
        receipt.supplier_id = supplier.id
        receipt.supplier_name = supplier.name
    else:
        target_inventory.quantity_available += item.quantity_available
        db.add(
            InventoryReceipt(
                inventory_id=target_inventory.id,
                product_id=product.id,
                quantity=item.quantity_available,
                needs_enrichment=False,
                supplier_id=supplier.id,
                supplier_name=supplier.name,
                comment=f"{SUPPLIER_ITEM_RECEIPT_MARKER}{item.id}",
            )
        )

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_supplier_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(SupplierItem).filter(SupplierItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Supplier item not found")

    receipt = _get_linked_receipt(db, supplier_item_id=item_id)
    if receipt:
        inventory = db.query(Inventory).filter(Inventory.id == receipt.inventory_id).first()
        if inventory:
            inventory.quantity_available = max(0, inventory.quantity_available - receipt.quantity)
        db.delete(receipt)

    db.delete(item)
    db.commit()

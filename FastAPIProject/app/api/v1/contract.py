from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.models.contract import Contract
from app.models.contract_item import ContractItem
from app.models.inventory import Inventory
from app.schemas.contract import ContractCreate, ContractOut, ContractUpdate
from app.api.deps import get_db

router = APIRouter(prefix="/contracts", tags=["Contracts"])

@router.post("/", response_model=ContractOut)
def create_contract(data: ContractCreate, db: Session = Depends(get_db)):
    contract = Contract(
        customer_id=data.customer_id,
        number=data.number,
        date=data.date
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    contract_items = []

    for item in data.items:
        inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).first()
        if not inv or inv.quantity_available < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough inventory for product_id {item.product_id}"
            )

        inv.quantity_available -= item.quantity
        inv.quantity_reserved += item.quantity
        db.add(inv)

        contract_item = ContractItem(
            contract_id=contract.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            total=item.quantity * item.price,
            payment_terms=item.payment_terms,
            delivery_terms=item.delivery_terms
        )
        db.add(contract_item)
        contract_items.append(contract_item)

    db.commit()
    contract.items = contract_items
    return contract

@router.get("/", response_model=List[ContractOut])
def list_contracts(
    db: Session = Depends(get_db),
    customer_id: int | None = Query(default=None),
    number: str | None = Query(default=None),
):
    query = db.query(Contract)
    if customer_id is not None:
        query = query.filter(Contract.customer_id == customer_id)
    if number:
        query = query.filter(Contract.number.ilike(f"%{number}%"))
    return query.all()

@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@router.put("/{contract_id}", response_model=ContractOut)
def update_contract(
    contract_id: int,
    data: ContractUpdate,
    db: Session = Depends(get_db),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contract, key, value)
    db.commit()
    db.refresh(contract)
    return contract

@router.delete("/{contract_id}", status_code=204)
def delete_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    db.query(ContractItem).filter(ContractItem.contract_id == contract_id).delete()
    db.delete(contract)
    db.commit()

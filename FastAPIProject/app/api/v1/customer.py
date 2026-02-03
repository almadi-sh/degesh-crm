from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate
from app.models.customer import Customer
from app.models.contract import Contract
from app.api.deps import get_db

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.post("/", response_model=CustomerOut)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(**data.dict())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/", response_model=List[CustomerOut])
def list_customers(
    db: Session = Depends(get_db),
    name: str | None = Query(default=None),
    bin_iin: str | None = Query(default=None),
    address: str | None = Query(default=None),
):
    query = db.query(Customer)
    if name:
        query = query.filter(Customer.name.ilike(f"%{name}%"))
    if bin_iin:
        query = query.filter(Customer.bin_iin.ilike(f"%{bin_iin}%"))
    if address:
        query = query.filter(Customer.address.ilike(f"%{address}%"))
    return query.all()

@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    has_contracts = db.query(Contract).filter(Contract.customer_id == customer_id).first()
    if has_contracts:
        raise HTTPException(status_code=400, detail="Customer has active contracts")

    db.delete(customer)
    db.commit()

from datetime import date
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.models.contract import Contract
from app.schemas.contract import ContractCreate, ContractOut, ContractUpdate
from app.api.deps import get_db

router = APIRouter(prefix="/contracts", tags=["Contracts"])
logger = logging.getLogger("uvicorn.access")

STATUS_VALUES = {"Draft", "Confirmed", "Sent"}


def _generate_contract_number(db: Session) -> str:
    # Architecture decision: keep number generation server-side to guarantee consistency
    # and avoid collisions when multiple clients create contracts simultaneously.
    max_id = db.query(func.max(Contract.id)).scalar() or 0
    today = date.today()
    return f"№{max_id + 1}-{today:%m}-{today:%d}"

@router.post("/", response_model=ContractOut)
def create_contract(data: ContractCreate, db: Session = Depends(get_db)):
    contract = Contract(
        customer_id=data.customer_id,
        contract_number=_generate_contract_number(db),
        contract_date=date.today(),
        status="Draft",
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    logger.info("POST /contracts -> %s", contract.id)
    return contract

@router.get("/", response_model=List[ContractOut])
def list_contracts(
    db: Session = Depends(get_db),
    customer_id: int | None = Query(default=None),
    contract_number: str | None = Query(default=None),
):
    query = db.query(Contract)
    if customer_id is not None:
        query = query.filter(Contract.customer_id == customer_id)
    if contract_number:
        query = query.filter(Contract.contract_number.ilike(f"%{contract_number}%"))
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
    if data.status not in STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status value")
    contract.status = data.status
    db.commit()
    db.refresh(contract)
    logger.info("PUT /contracts/%s", contract_id)
    return contract

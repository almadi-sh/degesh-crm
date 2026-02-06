from datetime import date
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.models.contract import Contract
from app.schemas.contract import ContractCreate, ContractOut, ContractUpdate, ContractDocumentUpdate
from app.api.deps import get_db
from app.services.contract_document import build_default_contract_document

router = APIRouter(prefix="/contracts", tags=["Contracts"])
logger = logging.getLogger("uvicorn.access")

STATUS_VALUES = {"Draft", "Confirmed", "Sent"}

@router.post("/", response_model=ContractOut)
def create_contract(data: ContractCreate, db: Session = Depends(get_db)):
    contract = Contract(
        customer_id=data.customer_id,
        contract_date=date.today(),
        status="Draft",
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    contract.contract_document = build_default_contract_document(contract)
    db.commit()
    db.refresh(contract)
    logger.info("POST /contracts -> %s", contract.id)
    return contract

@router.get("/", response_model=List[ContractOut])
def list_contracts(
    db: Session = Depends(get_db),
    customer_id: int | None = Query(default=None),
):
    query = db.query(Contract)
    if customer_id is not None:
        query = query.filter(Contract.customer_id == customer_id)
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

@router.put("/{contract_id}/document", response_model=ContractOut)
def update_contract_document(
    contract_id: int,
    data: ContractDocumentUpdate,
    db: Session = Depends(get_db),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract.contract_document = data.contract_document.model_dump()
    db.commit()
    db.refresh(contract)
    logger.info("PUT /contracts/%s/document", contract_id)
    return contract

@router.delete("/{contract_id}", status_code=204)
@router.delete("/{contract_id}/", status_code=204, include_in_schema=False)
def delete_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    db.delete(contract)
    db.commit()
    logger.info("DELETE /contracts/%s", contract_id)

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.contract_item import ContractItem
from app.models.payment_term import PaymentTerm
from app.schemas.payment_term import PaymentTermCreate, PaymentTermOut, PaymentTermUpdate

router = APIRouter(prefix="/payment-terms", tags=["Payment Terms"])
logger = logging.getLogger("uvicorn.access")


def _validate_percent_limits(db: Session, contract_item_id: int, new_percent: float, existing_id: int | None = None):
    query = db.query(PaymentTerm).filter(PaymentTerm.contract_item_id == contract_item_id)
    if existing_id is not None:
        query = query.filter(PaymentTerm.id != existing_id)
    existing_terms = query.all()
    if len(existing_terms) >= 5 and existing_id is None:
        raise HTTPException(status_code=400, detail="Payment terms limit is 5")
    total_percent = sum(term.percent for term in existing_terms) + new_percent
    if total_percent > 100:
        raise HTTPException(status_code=400, detail="Total payment percent cannot exceed 100")


@router.post("/", response_model=PaymentTermOut)
def create_payment_term(data: PaymentTermCreate, db: Session = Depends(get_db)):
    contract_item = db.query(ContractItem).filter(ContractItem.id == data.contract_item_id).first()
    if not contract_item:
        raise HTTPException(status_code=404, detail="Contract item not found")

    _validate_percent_limits(db, data.contract_item_id, data.percent)
    # Architecture decision: store calculated amount to preserve historical values
    # even if contract item price/quantity changes later.
    amount = contract_item.total_amount * data.percent / 100

    term = PaymentTerm(
        contract_item_id=data.contract_item_id,
        percent=data.percent,
        amount=amount,
        due_date=data.due_date,
    )
    db.add(term)
    db.commit()
    db.refresh(term)
    logger.info("POST /payment-terms -> %s", term.id)
    return term


@router.put("/{payment_term_id}", response_model=PaymentTermOut)
def update_payment_term(
    payment_term_id: int,
    data: PaymentTermUpdate,
    db: Session = Depends(get_db),
):
    term = db.query(PaymentTerm).filter(PaymentTerm.id == payment_term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Payment term not found")

    _validate_percent_limits(db, term.contract_item_id, data.percent, existing_id=term.id)
    contract_item = db.query(ContractItem).filter(ContractItem.id == term.contract_item_id).first()
    if not contract_item:
        raise HTTPException(status_code=404, detail="Contract item not found")

    term.percent = data.percent
    term.amount = contract_item.total_amount * data.percent / 100
    term.due_date = data.due_date
    db.commit()
    db.refresh(term)
    logger.info("PUT /payment-terms/%s", payment_term_id)
    return term


@router.delete("/{payment_term_id}", status_code=204)
def delete_payment_term(payment_term_id: int, db: Session = Depends(get_db)):
    term = db.query(PaymentTerm).filter(PaymentTerm.id == payment_term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Payment term not found")
    db.delete(term)
    db.commit()
    logger.info("DELETE /payment-terms/%s", payment_term_id)

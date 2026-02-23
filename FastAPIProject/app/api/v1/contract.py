from datetime import date
from io import BytesIO
import logging
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.models.contract import Contract
from app.models.reservation import Reservation
from app.schemas.contract import ContractCreate, ContractOut, ContractUpdate, ContractDocumentUpdate
from app.api.deps import get_db
from app.services.contract_document import (
    build_default_contract_document,
    ensure_contract_document,
    normalize_contract_document_payload,
    render_contract_document_docx,
    render_contract_document_pdf,
)

router = APIRouter(prefix="/contracts", tags=["Contracts"])
logger = logging.getLogger("uvicorn.access")

STATUS_VALUES = {"Draft", "Confirmed", "Sent"}

@router.post("/", response_model=ContractOut)
def create_contract(data: ContractCreate, db: Session = Depends(get_db)):
    contract = Contract(
        customer_id=data.customer_id,
        contract_date=date.today(),
        status="Draft",
        owner_employee_id=data.owner_employee_id,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    contract.contract_document = build_default_contract_document(contract)
    db.commit()
    db.refresh(contract)
    logger.info("POST /contracts -> %s", contract.id)
    contract.contract_document = ensure_contract_document(contract)
    return contract

@router.get("/", response_model=List[ContractOut])
def list_contracts(
    db: Session = Depends(get_db),
    customer_id: int | None = Query(default=None),
):
    query = db.query(Contract)
    if customer_id is not None:
        query = query.filter(Contract.customer_id == customer_id)
    contracts = query.all()
    for contract in contracts:
        contract.contract_document = ensure_contract_document(contract)
    return contracts

@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract.contract_document = ensure_contract_document(contract)
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
    contract.contract_document = ensure_contract_document(contract)
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
    contract.contract_document = normalize_contract_document_payload(data.contract_document.model_dump())
    db.commit()
    db.refresh(contract)
    logger.info("PUT /contracts/%s/document", contract_id)
    contract.contract_document = ensure_contract_document(contract)
    return contract


@router.post("/{contract_id}/document/reset", response_model=ContractOut)
def reset_contract_document(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract.contract_document = build_default_contract_document(contract)
    db.commit()
    db.refresh(contract)
    logger.info("POST /contracts/%s/document/reset", contract_id)
    contract.contract_document = ensure_contract_document(contract)
    return contract



@router.post("/{contract_id}/document/preview-pdf")
@router.post("/{contract_id}/document/preview-pdf/", include_in_schema=False)
def preview_contract_document_pdf(
    contract_id: int,
    data: ContractDocumentUpdate | None = None,
    db: Session = Depends(get_db),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.status != "Confirmed":
        raise HTTPException(status_code=400, detail="Contract must be confirmed before preview")

    payload_override = data.contract_document.model_dump() if data else None
    try:
        content = render_contract_document_pdf(contract, payload_override)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return StreamingResponse(
        BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=contract-preview.pdf"},
    )

@router.get("/{contract_id}/document/export")
@router.get("/{contract_id}/document/export/", include_in_schema=False)
def export_contract_document(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.status != "Confirmed":
        raise HTTPException(status_code=400, detail="Contract must be confirmed before export")

    content = render_contract_document_docx(contract)

    filename = f"contract-{contract.contract_number}.docx".replace(" ", "_")
    filename_encoded = quote(filename)

    return StreamingResponse(
        BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename_encoded}"
        },
    )

@router.get("/{contract_id}/document/export-pdf")
@router.get("/{contract_id}/document/export-pdf/", include_in_schema=False)
def export_contract_document_pdf(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if contract.status != "Confirmed":
        raise HTTPException(status_code=400, detail="Contract must be confirmed before export")

    try:
        content = render_contract_document_pdf(contract)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    filename = f"contract-{contract.contract_number}.pdf".replace(" ", "_")
    filename_encoded = quote(filename)

    return StreamingResponse(
        BytesIO(content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename_encoded}"
        },
    )

@router.delete("/{contract_id}", status_code=204)
@router.delete("/{contract_id}/", status_code=204, include_in_schema=False)
def delete_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    db.query(Reservation).filter(Reservation.contract_id == contract_id).delete(
        synchronize_session=False,
    )

    db.delete(contract)
    db.commit()
    logger.info("DELETE /contracts/%s", contract_id)

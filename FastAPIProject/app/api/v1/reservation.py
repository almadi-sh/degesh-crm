from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.reservation import Reservation
from app.schemas.reservation import ReservationOut

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.get("/", response_model=List[ReservationOut])
def list_reservations(
    db: Session = Depends(get_db),
    product_id: int | None = Query(default=None),
    contract_id: int | None = Query(default=None),
    employee_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    query = db.query(Reservation)
    if product_id is not None:
        query = query.filter(Reservation.product_id == product_id)
    if contract_id is not None:
        query = query.filter(Reservation.contract_id == contract_id)
    if employee_id is not None:
        query = query.filter(Reservation.employee_id == employee_id)
    if status is not None:
        query = query.filter(Reservation.status == status)

    return query.order_by(asc(Reservation.priority), asc(Reservation.created_at)).all()

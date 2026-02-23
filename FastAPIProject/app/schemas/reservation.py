from datetime import date, datetime

from pydantic import BaseModel


class ReservationBase(BaseModel):
    inventory_id: int | None = None
    product_id: int
    contract_id: int
    contract_item_id: int
    employee_id: str | None = None
    customer_id: int
    quantity: float
    priority: int = 100
    delivery_due_date: date | None = None
    status: str = "active"


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    inventory_id: int | None = None
    product_id: int | None = None
    contract_id: int | None = None
    contract_item_id: int | None = None
    employee_id: str | None = None
    customer_id: int | None = None
    quantity: float | None = None
    priority: int | None = None
    delivery_due_date: date | None = None
    status: str | None = None


class ReservationOut(ReservationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

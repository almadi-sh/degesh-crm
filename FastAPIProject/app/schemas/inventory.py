from datetime import date

from pydantic import BaseModel


class InventoryBase(BaseModel):
    product_id: int
    quantity_available: float
    quantity_reserved: float


class InventoryOut(InventoryBase):
    id: int

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    quantity_available: float | None = None
    quantity_reserved: float | None = None


class InventorySnapshotItem(BaseModel):
    product_id: int
    product_name: str
    supplier_name: str
    incoming_total: float
    reserved_total: float
    available_total: float
    balance: float


class ReservationTimelineItem(BaseModel):
    reservation_id: int
    employee_name: str
    contract_number: str
    contract_id: int
    appendix_number: int
    quantity: float
    product_name: str
    delivery_terms: str | None = None
    delivery_due_date: date | None = None
    customer_name: str
    priority: int

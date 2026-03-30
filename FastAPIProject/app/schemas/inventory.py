from datetime import date, datetime

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


class InventoryReceiptCreate(BaseModel):
    product_id: int
    quantity: float
    supplier_contract_number: str | None = None
    supplier_name: str | None = None
    comment: str | None = None


class InventoryReceiptOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: float
    supplier_contract_number: str | None = None
    supplier_name: str | None = None
    comment: str | None = None
    received_at: datetime

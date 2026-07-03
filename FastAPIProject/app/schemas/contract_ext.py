from datetime import datetime

from pydantic import BaseModel


class ShipmentOut(BaseModel):
    id: int
    warehouse: str | None = None
    quantity: float
    shipped_at: datetime | None = None
    note: str | None = None

    class Config:
        from_attributes = True


class AppendixItemOut(BaseModel):
    id: int
    name: str | None = None
    category: str | None = None
    quantity: float | None = None
    unit: str | None = None
    unit_price: float | None = None
    total: float | None = None
    delivery_date: str | None = None
    shipped: float
    remaining: float
    status: str
    shipments: list[ShipmentOut]


class AppendixOut(BaseModel):
    id: int
    appendix_number: str | None = None
    appendix_date: str | None = None
    source_file: str | None = None
    stated_total: float | None = None
    payment_schedule: list[dict] = []
    delivery_terms: str | None = None
    status: str
    items: list[AppendixItemOut]


class ContractListItem(BaseModel):
    id: int
    number: str | None = None
    date: str | None = None
    buyer_name: str | None = None
    contract_total: float | None = None
    currency: str | None = None
    appendix_count: int
    status: str
    payment_status: str
    paid_amount: float | None = None
    unpaid_amount: float | None = None
    cancelled: bool
    has_file: bool


class ContractDetail(BaseModel):
    id: int
    folder_name: str | None = None
    number: str | None = None
    date: str | None = None
    buyer_name: str | None = None
    supplier_name: str | None = None
    contract_total: float | None = None
    currency: str | None = None
    client_bin: str | None = None
    manager: str | None = None
    cancelled: bool
    summary_for_manager: str | None = None
    status: str
    payment_status: str
    paid_amount: float | None = None
    unpaid_amount: float | None = None
    appendix_count: int
    has_file: bool
    appendices: list[AppendixOut]


class ShipRequest(BaseModel):
    warehouse: str
    quantity: float
    note: str | None = None

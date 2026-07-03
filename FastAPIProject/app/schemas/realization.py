from datetime import datetime

from pydantic import BaseModel


class RealizationOut(BaseModel):
    id: int
    document: str | None = None
    realization_date: datetime | None = None
    date_raw: str | None = None
    year: int | None = None
    year_month: str | None = None
    counterparty: str | None = None
    contract_ref: str | None = None
    bin_iin: str | None = None
    nomenclature: str | None = None
    product_name: str | None = None
    category: str | None = None
    active_substance: str | None = None
    unit: str | None = None
    quantity: float | None = None
    price: float | None = None
    amount_with_vat: float | None = None
    vat_amount: float | None = None
    vat_rate: float | None = None
    confidence: float | None = None

    class Config:
        from_attributes = True


class RealizationListOut(BaseModel):
    total: int
    items: list[RealizationOut]


# --- Analytics ---


class MonthPoint(BaseModel):
    year_month: str
    amount: float
    count: int


class CategoryPoint(BaseModel):
    category: str
    amount: float
    quantity: float
    count: int


class ProductPoint(BaseModel):
    product_name: str
    category: str | None = None
    amount: float
    quantity: float
    count: int


class CounterpartyPoint(BaseModel):
    counterparty: str
    amount: float
    count: int


class RegionPoint(BaseModel):
    region: str
    amount: float
    count: int


class RealizationAnalyticsOut(BaseModel):
    total_amount: float
    total_vat: float
    total_quantity: float
    line_items: int
    documents: int
    counterparties: int
    products: int
    date_from: str | None = None
    date_to: str | None = None
    years: list[int]
    by_month: list[MonthPoint]
    by_category: list[CategoryPoint]
    by_region: list[RegionPoint]
    top_products: list[ProductPoint]
    top_counterparties: list[CounterpartyPoint]


class PaymentSummaryOut(BaseModel):
    year: int | None = None
    total_realizations: float
    paid: float
    unpaid: float
    years: list[int] = []

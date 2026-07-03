from pydantic import BaseModel


class WarehouseStockOut(BaseModel):
    id: int
    warehouse: str
    product_name: str
    quantity: float | None = None
    unit: str | None = None
    note: str | None = None

    class Config:
        from_attributes = True


class WarehouseSummaryItem(BaseModel):
    warehouse: str
    item_count: int
    positions_with_qty: int


class WarehouseStockSummary(BaseModel):
    total_items: int
    distinct_products: int
    warehouses: list[WarehouseSummaryItem]


class WarehouseStockList(BaseModel):
    total: int
    items: list[WarehouseStockOut]

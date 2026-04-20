from pydantic import BaseModel


class InventoryBase(BaseModel):
    product_id: int
    supplier_id: int
    quantity_available: float
    quantity_reserved: float
    customs_status: str
    shipment_status: str


class InventoryOut(InventoryBase):
    id: int

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    quantity_available: float | None = None
    quantity_reserved: float | None = None
    customs_status: str | None = None
    shipment_status: str | None = None

from pydantic import BaseModel

class InventoryBase(BaseModel):
    product_id: int
    quantity_available: float
    quantity_reserved: float

class InventoryOut(InventoryBase):
    id: int

    class Config:
        orm_mode = True

class InventoryUpdate(BaseModel):
    quantity_available: float | None = None
    quantity_reserved: float | None = None

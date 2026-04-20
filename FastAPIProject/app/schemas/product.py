from pydantic import BaseModel


class ProductBase(BaseModel):
    supplier_id: int
    name: str
    unit: str
    price: float
    customs_cleared: bool = False


class ProductCreate(ProductBase):
    quantity_available: float = 0


class ProductUpdate(BaseModel):
    supplier_id: int | None = None
    name: str | None = None
    unit: str | None = None
    price: float | None = None
    customs_cleared: bool | None = None
    quantity_available: float | None = None


class ProductOut(ProductBase):
    id: int

    class Config:
        from_attributes = True

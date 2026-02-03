from pydantic import BaseModel

class ProductBase(BaseModel):
    name: str
    unit: str
    price: float

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    price: float | None = None

class ProductOut(ProductBase):
    id: int

    class Config:
        from_attributes = True

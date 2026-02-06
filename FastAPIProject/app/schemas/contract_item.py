from pydantic import BaseModel
from typing import Optional

class ContractItemBase(BaseModel):
    product_id: int
    quantity: float
    price: float
    vat_enabled: bool = False
    delivery_enabled: bool = False
    delivery_terms: Optional[str] = None

class ContractItemCreate(ContractItemBase):
    contract_id: int

class ContractItemUpdate(BaseModel):
    product_id: Optional[int] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    vat_enabled: Optional[bool] = None
    delivery_enabled: Optional[bool] = None
    delivery_terms: Optional[str] = None

class ContractItemOut(ContractItemBase):
    id: int
    contract_id: int
    total_amount: float

    class Config:
        from_attributes = True

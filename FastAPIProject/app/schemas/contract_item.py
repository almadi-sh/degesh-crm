from pydantic import BaseModel
from typing import Optional

class ContractItemBase(BaseModel):
    product_id: int
    quantity: float
    price: float

class ContractItemCreate(ContractItemBase):
    contract_id: int

class ContractItemUpdate(BaseModel):
    product_id: Optional[int] = None
    quantity: Optional[float] = None
    price: Optional[float] = None

class ContractItemOut(ContractItemBase):
    id: int
    contract_id: int
    total_amount: float

    class Config:
        from_attributes = True

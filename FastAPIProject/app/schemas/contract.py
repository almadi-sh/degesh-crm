from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from app.schemas.contract_item import ContractItemOut

class ContractBase(BaseModel):
    customer_id: int
    number: str
    date: Optional[date] = None

class ContractItemForCreate(BaseModel):
    product_id: int
    quantity: float
    price: float
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None

class ContractCreate(ContractBase):
    items: List[ContractItemForCreate]

class ContractUpdate(BaseModel):
    customer_id: Optional[int] = None
    number: Optional[str] = None
    date: Optional[date] = None

class ContractOut(ContractBase):
    id: int
    items: List[ContractItemOut] = []

    class Config:
        from_attributes = True  # <-- было orm_mode

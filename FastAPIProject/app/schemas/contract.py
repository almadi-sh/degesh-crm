from pydantic import BaseModel
from typing import List, Literal
from datetime import date, datetime
from app.schemas.contract_item import ContractItemOut

class ContractBase(BaseModel):
    customer_id: int
    contract_number: str
    contract_date: date
    status: Literal["Draft", "Confirmed", "Sent"]
    last_modified_at: datetime

class ContractCreate(BaseModel):
    customer_id: int

class ContractUpdate(BaseModel):
    status: Literal["Draft", "Confirmed", "Sent"]

class ContractOut(ContractBase):
    id: int
    items: List[ContractItemOut] = []

    class Config:
        from_attributes = True  # <-- было orm_mode

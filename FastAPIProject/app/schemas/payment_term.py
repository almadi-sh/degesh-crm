from datetime import date
from pydantic import BaseModel


class PaymentTermBase(BaseModel):
    percent: float
    due_date: date


class PaymentTermCreate(PaymentTermBase):
    contract_item_id: int


class PaymentTermUpdate(PaymentTermBase):
    pass


class PaymentTermOut(PaymentTermBase):
    id: int
    amount: float

    class Config:
        from_attributes = True

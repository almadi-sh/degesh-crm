from pydantic import BaseModel

class ContractItemBase(BaseModel):
    product_id: int
    quantity: float
    price: float
    total: float
    payment_terms: str | None = None
    delivery_terms: str | None = None

class ContractItemCreate(ContractItemBase):
    contract_id: int

class ContractItemOut(ContractItemBase):
    id: int

    class Config:
        from_attributes = True

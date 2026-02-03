from pydantic import BaseModel

class CustomerBase(BaseModel):
    name: str
    bin_iin: str | None = None
    address: str | None = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: str | None = None
    bin_iin: str | None = None
    address: str | None = None

class CustomerOut(CustomerBase):
    id: int

    class Config:
        orm_mode = True

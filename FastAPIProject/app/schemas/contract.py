from pydantic import BaseModel
from typing import List, Literal
from datetime import date, datetime
from app.schemas.contract_item import ContractItemOut

class ContractDocumentHeader(BaseModel):
    title: str
    contract_number: str
    city: str
    date: str

class ContractDocumentParagraphBlock(BaseModel):
    type: Literal["paragraph"]
    text: str


class ContractDocumentNumberedBlock(BaseModel):
    type: Literal["numbered"]
    items: List[str]


class ContractDocumentBulletsBlock(BaseModel):
    type: Literal["bullets"]
    items: List[str]


ContractDocumentBlock = (
    ContractDocumentParagraphBlock | ContractDocumentNumberedBlock | ContractDocumentBulletsBlock
)

class ContractDocumentClause(BaseModel):
    id: str
    title: str
    body: List[str] | None = None
    blocks: List[ContractDocumentBlock] | None = None
    deletable: bool


class ContractDocumentSignatures(BaseModel):
    seller_label: str
    buyer_label: str
    seller_position: str
    buyer_position: str
    seller_name: str
    buyer_name: str
    seller_stamp: str
    buyer_stamp: str

class ContractDocument(BaseModel):
    header: ContractDocumentHeader
    intro: str
    clauses: List[ContractDocumentClause]
    signatures: ContractDocumentSignatures

class ContractBase(BaseModel):
    customer_id: int
    contract_number: str
    contract_date: date
    status: Literal["Draft", "Confirmed", "Sent"]
    last_modified_at: datetime
    contract_document: ContractDocument | None = None

class ContractCreate(BaseModel):
    customer_id: int

class ContractUpdate(BaseModel):
    status: Literal["Draft", "Confirmed", "Sent"]

class ContractDocumentUpdate(BaseModel):
    contract_document: ContractDocument

class ContractOut(ContractBase):
    id: int
    items: List[ContractItemOut] = []

    class Config:
        from_attributes = True  # <-- было orm_mode

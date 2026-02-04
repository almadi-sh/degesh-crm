from sqlalchemy import Column, Integer, ForeignKey, Float, Date
from sqlalchemy.orm import relationship
from app.core.database import Base


class PaymentTerm(Base):
    __tablename__ = "payment_terms"

    id = Column(Integer, primary_key=True, index=True)
    contract_item_id = Column(Integer, ForeignKey("contract_items.id"), nullable=False)
    percent = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)

    contract_item = relationship("ContractItem", back_populates="payment_terms")

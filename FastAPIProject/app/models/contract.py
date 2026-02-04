from datetime import date

from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    contract_number = Column(String, nullable=False)
    contract_date = Column(Date, nullable=False, default=date.today)
    status = Column(String, nullable=False, default="Draft")
    last_modified_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    customer = relationship("Customer")
    items = relationship("ContractItem", back_populates="contract", cascade="all, delete-orphan")

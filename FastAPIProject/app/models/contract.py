from datetime import date

from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    owner_employee_id = Column(String, ForeignKey("employees.id"), nullable=True)
    contract_date = Column(Date, nullable=False, default=date.today)
    status = Column(String, nullable=False, default="Draft")
    last_modified_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    contract_document = Column(JSON, nullable=True)

    customer = relationship("Customer")
    owner_employee = relationship("Employee")
    items = relationship("ContractItem", back_populates="contract", cascade="all, delete-orphan")

    @property
    def contract_number(self) -> str:
        if not self.id:
            return "—"
        return f"№{self.id}-{self.contract_date:%m-%d}"

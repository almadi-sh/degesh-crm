from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.core.database import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    number = Column(String, nullable=False)  # например "16-М-А"
    date = Column(Date, nullable=True)

    customer = relationship("Customer")
    items = relationship("ContractItem", back_populates="contract")

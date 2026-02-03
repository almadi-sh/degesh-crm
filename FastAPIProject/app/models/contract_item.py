from sqlalchemy import Column, Integer, ForeignKey, Float, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class ContractItem(Base):
    __tablename__ = "contract_items"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    payment_terms = Column(String, nullable=True)  # объединенный срок оплаты
    delivery_terms = Column(String, nullable=True)  # объединенный срок поставки

    contract = relationship("Contract", back_populates="items")
    product = relationship("Product")

from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    quantity_available = Column(Float, default=0)
    quantity_reserved = Column(Float, default=0)
    customs_status = Column(String, nullable=False, default="не растаможен")
    shipment_status = Column(String, nullable=False, default="не готов к отгрузке")

    product = relationship("Product")
    supplier = relationship("Customer")

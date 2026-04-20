from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    customs_cleared = Column(Boolean, nullable=False, default=False)

    supplier = relationship("Customer")

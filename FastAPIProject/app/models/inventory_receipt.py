from sqlalchemy import Column, Integer, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class InventoryReceipt(Base):
    __tablename__ = "inventory_receipts"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=0)
    needs_enrichment = Column(Boolean, nullable=False, default=False, server_default="false")

    inventory = relationship("Inventory")
    product = relationship("Product")

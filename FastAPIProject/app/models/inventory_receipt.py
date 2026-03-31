from sqlalchemy import Column, Integer, ForeignKey, Float, Boolean, String, DateTime, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class InventoryReceipt(Base):
    __tablename__ = "inventory_receipts"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=0)
    needs_enrichment = Column(Boolean, nullable=False, default=False, server_default="false")
    supplier_contract_number = Column(String, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True, index=True)
    supplier_name = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    inventory = relationship("Inventory")
    product = relationship("Product")
    supplier = relationship("Supplier")

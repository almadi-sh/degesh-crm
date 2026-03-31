import enum

from sqlalchemy import Boolean, Column, Enum, Float, ForeignKey, Integer, String

from app.core.database import Base


class SupplierItemType(str, enum.Enum):
    service = "service"
    seeds = "seeds"
    pesticide = "pesticide"
    fertilizer = "fertilizer"


class SupplierItem(Base):
    __tablename__ = "supplier_items"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    quantity_available = Column(Float, nullable=False, default=0)
    purchase_price = Column(Float, nullable=False, default=0)
    item_type = Column(Enum(SupplierItemType), nullable=False)
    unit = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")

from sqlalchemy import Column, Float, Integer, String

from app.core.database import Base


class WarehouseStock(Base):
    """Stock balance per warehouse, imported from the warehouse-stock xlsx.

    One row per (warehouse, product).
    """

    __tablename__ = "warehouse_stock"

    id = Column(Integer, primary_key=True, index=True)
    warehouse = Column(String, nullable=False, index=True)
    product_name = Column(String, nullable=False, index=True)
    quantity = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    note = Column(String, nullable=True)

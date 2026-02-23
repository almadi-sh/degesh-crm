from sqlalchemy import Column, Integer, ForeignKey, Float, String, DateTime, func, Date
from sqlalchemy.orm import relationship

from app.core.database import Base


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    contract_item_id = Column(Integer, ForeignKey("contract_items.id"), nullable=False, unique=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    priority = Column(Integer, nullable=False, default=100)
    delivery_due_date = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    inventory = relationship("Inventory")
    product = relationship("Product")
    contract = relationship("Contract")
    contract_item = relationship("ContractItem")
    employee = relationship("Employee")
    customer = relationship("Customer")

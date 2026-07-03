from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class ExtContract(Base):
    """A contract parsed from the contract folders (all_results.json)."""

    __tablename__ = "ext_contracts"

    id = Column(Integer, primary_key=True, index=True)
    folder_name = Column(String, unique=True, index=True)
    number = Column(String, nullable=True, index=True)
    date = Column(String, nullable=True)
    buyer_name = Column(String, nullable=True)
    supplier_name = Column(String, nullable=True)
    contract_total = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    client_bin = Column(String, nullable=True, index=True)  # matched counterparty BIN
    manager = Column(String, nullable=True)
    cancelled = Column(Integer, default=0)
    summary_for_manager = Column(Text, nullable=True)

    appendices = relationship(
        "ExtAppendix", back_populates="contract", cascade="all, delete-orphan"
    )


class ExtAppendix(Base):
    __tablename__ = "ext_appendices"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("ext_contracts.id"), nullable=False, index=True)
    appendix_number = Column(String, nullable=True)
    appendix_date = Column(String, nullable=True)
    source_file = Column(String, nullable=True)
    stated_total = Column(Float, nullable=True)
    payment_schedule = Column(JSON, nullable=True)
    delivery_terms = Column(String, nullable=True)
    position = Column(Integer, default=0)  # order within contract

    contract = relationship("ExtContract", back_populates="appendices")
    items = relationship(
        "ExtAppendixItem", back_populates="appendix", cascade="all, delete-orphan"
    )


class ExtAppendixItem(Base):
    __tablename__ = "ext_appendix_items"

    id = Column(Integer, primary_key=True, index=True)
    appendix_id = Column(Integer, ForeignKey("ext_appendices.id"), nullable=False, index=True)
    name = Column(String, nullable=True)
    category = Column(String, nullable=True)
    quantity = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    unit_price = Column(Float, nullable=True)
    total = Column(Float, nullable=True)
    delivery_date = Column(String, nullable=True)

    appendix = relationship("ExtAppendix", back_populates="items")
    shipments = relationship(
        "Shipment", back_populates="item", cascade="all, delete-orphan"
    )


class Shipment(Base):
    """A single shipment of an appendix item from a warehouse (partial deliveries)."""

    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    appendix_item_id = Column(Integer, ForeignKey("ext_appendix_items.id"), nullable=False, index=True)
    warehouse = Column(String, nullable=True)
    quantity = Column(Float, nullable=False, default=0)
    shipped_at = Column(DateTime, default=datetime.utcnow)
    note = Column(String, nullable=True)

    item = relationship("ExtAppendixItem", back_populates="shipments")

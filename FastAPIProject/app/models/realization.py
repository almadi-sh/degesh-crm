from sqlalchemy import Column, DateTime, Float, Integer, String

from app.core.database import Base


class Realization(Base):
    """A single realization (sale) line item imported from 1C exports."""

    __tablename__ = "realizations"

    id = Column(Integer, primary_key=True, index=True)

    document = Column(String, nullable=True)
    realization_date = Column(DateTime, nullable=True, index=True)
    date_raw = Column(String, nullable=True)
    year = Column(Integer, nullable=True, index=True)
    year_month = Column(String, nullable=True, index=True)  # e.g. "2026-06"

    counterparty = Column(String, nullable=True, index=True)
    contract_ref = Column(String, nullable=True)
    bin_iin = Column(String, nullable=True, index=True)

    nomenclature = Column(String, nullable=True)  # raw item name from 1C
    product_name = Column(String, nullable=True, index=True)  # normalized/final name
    category = Column(String, nullable=True, index=True)
    active_substance = Column(String, nullable=True)

    unit = Column(String, nullable=True)
    quantity = Column(Float, nullable=True)
    price = Column(Float, nullable=True)
    amount_with_vat = Column(Float, nullable=True)
    vat_amount = Column(Float, nullable=True)
    vat_rate = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)

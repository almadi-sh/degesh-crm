from sqlalchemy import Column, Integer, String

from app.core.database import Base


class Counterparty(Base):
    """Reference counterparty data (name, BIN/IIN, address, phone) parsed
    from 1C exports. Used to enrich debtors with contact info.
    """

    __tablename__ = "counterparties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    bin_iin = Column(String, nullable=True, unique=True, index=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)

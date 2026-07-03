from sqlalchemy import Column, Float, Integer, String

from app.core.database import Base


class Debt(Base):
    """A single accounts-receivable line (account 1210) imported from 1C.

    One counterparty may have several rows (per contract / ledger).
    """

    __tablename__ = "debts"

    id = Column(Integer, primary_key=True, index=True)
    bin_iin = Column(String, nullable=True, index=True)
    company_name = Column(String, nullable=True, index=True)
    contract_name = Column(String, nullable=True)
    turnover_debit = Column(Float, nullable=True)
    turnover_credit = Column(Float, nullable=True)
    debt_amount = Column(Float, nullable=True, index=True)
    report_date = Column(String, nullable=True)

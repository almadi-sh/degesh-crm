from sqlalchemy import Column, Integer, String
from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    legal_form = Column(String, nullable=True)
    contract_signer_full_name = Column(String, nullable=True)
    contract_signer_role = Column(String, nullable=True)
    contract_signer_basis = Column(String, nullable=True)
    bin_iin = Column(String, unique=True, index=True)
    city = Column(String, nullable=True)
    legal_address = Column(String, nullable=True)
    address = Column(String, nullable=True)
    tax_regime = Column(String, nullable=True)
    created_by_user = Column(String, nullable=True)
    initial_contact_user = Column(String, nullable=True)

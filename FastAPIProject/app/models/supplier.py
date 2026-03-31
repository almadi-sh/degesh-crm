from sqlalchemy import Column, Integer, String

from app.core.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    legal_form = Column(String, nullable=True)
    bin_iin = Column(String, nullable=True, unique=True, index=True)
    city = Column(String, nullable=True)
    legal_address = Column(String, nullable=True)
    contact_person = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    payment_terms = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_by_user = Column(String, nullable=True)

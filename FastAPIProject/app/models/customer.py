from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    bin_iin = Column(String, unique=True, index=True)
    address = Column(String, nullable=True)

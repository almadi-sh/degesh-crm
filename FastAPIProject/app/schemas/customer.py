from pydantic import BaseModel, field_validator


class CustomerBase(BaseModel):
    name: str
    legal_form: str | None = None
    contract_signer_full_name: str | None = None
    contract_signer_role: str | None = None
    contract_signer_basis: str | None = None
    bin_iin: str | None = None
    city: str | None = None
    legal_address: str | None = None
    address: str | None = None
    tax_regime: str | None = None
    created_by_user: str | None = None
    initial_contact_user: str | None = None

    @field_validator("bin_iin")
    @classmethod
    def validate_bin_iin(cls, value: str | None):
      if value is None or value == "":
          return None
      normalized = value.strip()
      if len(normalized) != 12 or not normalized.isdigit():
          raise ValueError("BIN/IIN must contain exactly 12 digits")
      return normalized


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = None
    legal_form: str | None = None
    contract_signer_full_name: str | None = None
    contract_signer_role: str | None = None
    contract_signer_basis: str | None = None
    bin_iin: str | None = None
    city: str | None = None
    legal_address: str | None = None
    address: str | None = None
    tax_regime: str | None = None
    created_by_user: str | None = None
    initial_contact_user: str | None = None

    @field_validator("bin_iin")
    @classmethod
    def validate_bin_iin(cls, value: str | None):
      if value is None or value == "":
          return None
      normalized = value.strip()
      if len(normalized) != 12 or not normalized.isdigit():
          raise ValueError("BIN/IIN must contain exactly 12 digits")
      return normalized


class CustomerOut(CustomerBase):
    id: int

    class Config:
        from_attributes = True

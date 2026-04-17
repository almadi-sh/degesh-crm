from pydantic import BaseModel, field_validator


class SupplierBase(BaseModel):
    name: str
    legal_form: str | None = None
    supplier_scope: str | None = None
    product_type: str | None = None
    bin_iin: str | None = None
    city: str | None = None
    legal_address: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    payment_terms: str | None = None
    notes: str | None = None
    created_by_user: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Name is required")
        return normalized

    @field_validator("bin_iin")
    @classmethod
    def validate_bin_iin(cls, value: str | None):
        if value is None or value == "":
            return None
        normalized = value.strip()
        if len(normalized) != 12 or not normalized.isdigit():
            raise ValueError("BIN/IIN must contain exactly 12 digits")
        return normalized

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None):
        if value is None or value == "":
            return None
        normalized = "".join(ch for ch in value if ch not in {" ", "(", ")", "-"})
        return normalized.strip() or None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = None
    legal_form: str | None = None
    supplier_scope: str | None = None
    product_type: str | None = None
    bin_iin: str | None = None
    city: str | None = None
    legal_address: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    payment_terms: str | None = None
    notes: str | None = None
    created_by_user: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None):
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Name is required")
        return normalized

    @field_validator("bin_iin")
    @classmethod
    def validate_bin_iin(cls, value: str | None):
        if value is None or value == "":
            return None
        normalized = value.strip()
        if len(normalized) != 12 or not normalized.isdigit():
            raise ValueError("BIN/IIN must contain exactly 12 digits")
        return normalized

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None):
        if value is None or value == "":
            return None
        normalized = "".join(ch for ch in value if ch not in {" ", "(", ")", "-"})
        return normalized.strip() or None


class SupplierOut(SupplierBase):
    id: int

    class Config:
        from_attributes = True

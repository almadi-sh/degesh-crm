from pydantic import BaseModel, field_validator

from app.models.supplier_item import SupplierItemType


class SupplierItemBase(BaseModel):
    supplier_id: int
    name: str
    quantity_available: float
    purchase_price: float
    item_type: SupplierItemType
    unit: str
    is_active: bool = True

    @field_validator("name", "unit")
    @classmethod
    def validate_required_text(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Field is required")
        return normalized

    @field_validator("quantity_available", "purchase_price")
    @classmethod
    def validate_non_negative(cls, value: float):
        if value < 0:
            raise ValueError("Value must be non-negative")
        return value


class SupplierItemCreate(SupplierItemBase):
    pass


class SupplierItemUpdate(BaseModel):
    name: str | None = None
    quantity_available: float | None = None
    purchase_price: float | None = None
    item_type: SupplierItemType | None = None
    unit: str | None = None
    is_active: bool | None = None

    @field_validator("name", "unit")
    @classmethod
    def validate_text_optional(cls, value: str | None):
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Field is required")
        return normalized

    @field_validator("quantity_available", "purchase_price")
    @classmethod
    def validate_non_negative(cls, value: float | None):
        if value is None:
            return None
        if value < 0:
            raise ValueError("Value must be non-negative")
        return value


class SupplierItemOut(SupplierItemBase):
    id: int

    class Config:
        from_attributes = True

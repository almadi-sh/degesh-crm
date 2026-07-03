from pydantic import BaseModel


class ClientListItem(BaseModel):
    bin_iin: str
    name: str | None = None
    total_debt: float
    realization_total: float


class ClientProfile(BaseModel):
    bin_iin: str
    name: str | None = None
    phone: str | None = None
    address: str | None = None
    region: str | None = None


class CardDebtLine(BaseModel):
    contract_name: str | None = None
    turnover_debit: float | None = None
    turnover_credit: float | None = None
    debt_amount: float | None = None
    report_date: str | None = None


class CardPurchaseLine(BaseModel):
    date: str | None = None
    contract_ref: str | None = None
    product_name: str | None = None
    category: str | None = None
    quantity: float | None = None
    unit: str | None = None
    price: float | None = None
    amount: float | None = None


class CardCategory(BaseModel):
    category: str
    amount: float
    quantity: float


class CardProduct(BaseModel):
    product_name: str
    amount: float
    quantity: float
    count: int


class ClientCard(BaseModel):
    profile: ClientProfile
    total_debt: float
    realization_total: float
    purchase_lines: int
    product_count: int
    first_purchase: str | None = None
    last_purchase: str | None = None
    debts: list[CardDebtLine]
    purchases: list[CardPurchaseLine]
    categories: list[CardCategory]
    top_products: list[CardProduct]


class AiSummaryOut(BaseModel):
    summary: str
    source: str  # "openai" | "fallback"

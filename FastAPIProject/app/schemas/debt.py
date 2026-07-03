from pydantic import BaseModel


class DebtOut(BaseModel):
    id: int
    bin_iin: str | None = None
    company_name: str | None = None
    contract_name: str | None = None
    turnover_debit: float | None = None
    turnover_credit: float | None = None
    debt_amount: float | None = None
    report_date: str | None = None

    class Config:
        from_attributes = True


class DebtListOut(BaseModel):
    total: int
    items: list[DebtOut]


class DebtContractLine(BaseModel):
    contract_name: str | None = None
    debt_amount: float


class DebtorOut(BaseModel):
    bin_iin: str | None = None
    company_name: str | None = None
    phone: str | None = None
    address: str | None = None
    total_debt: float
    contract_count: int
    contracts: list[DebtContractLine]
    # Connection to realizations (sales)
    realization_total: float
    realization_last_date: str | None = None
    top_product: str | None = None
    is_active_buyer: bool
    priority: str  # Высокий / Средний / Низкий
    priority_rank: int


class DebtorListOut(BaseModel):
    report_date: str | None = None
    total: int
    items: list[DebtorOut]


class DebtBucket(BaseModel):
    label: str
    count: int
    amount: float


class TopDebtor(BaseModel):
    company_name: str
    bin_iin: str | None = None
    total_debt: float
    phone: str | None = None


class DebtSummaryOut(BaseModel):
    report_date: str | None = None
    total_debt: float
    debtor_count: int
    contract_lines: int
    average_debt: float
    max_debt: float
    top10_share: float
    with_phone: int
    active_buyers: int
    high_priority: int
    buckets: list[DebtBucket]
    top_debtors: list[TopDebtor]


class DueInstallment(BaseModel):
    date: str | None = None
    percent: float | None = None
    amount: float | None = None


class DebtObligation(BaseModel):
    contract_name: str | None = None
    debt_amount: float
    report_date: str | None = None
    contract_id: int | None = None
    contract_number: str | None = None
    contract_date: str | None = None
    due_schedule: list[DueInstallment]


class DebtorDetailOut(BaseModel):
    bin_iin: str | None = None
    company_name: str | None = None
    total_debt: float
    report_date: str | None = None
    obligations: list[DebtObligation]

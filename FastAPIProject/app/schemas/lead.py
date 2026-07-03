from pydantic import BaseModel


class LeadOut(BaseModel):
    bin_iin: str | None = None
    company_name: str | None = None
    phone: str | None = None
    lead_type: str  # Кросс-продажа / Потенциал роста / Сезонная допродажа
    category: str
    suggested_product: str | None = None
    reason: str
    potential: float
    total_bought: float
    last_purchase: str | None = None


class LeadTypeStat(BaseModel):
    lead_type: str
    count: int
    potential: float


class LeadsResponse(BaseModel):
    total_leads: int
    total_potential: float
    buyers_analyzed: int
    season_label: str | None = None
    by_type: list[LeadTypeStat]
    items: list[LeadOut]


class LeadEvidenceItem(BaseModel):
    product: str | None = None
    quantity: float | None = None
    unit: str | None = None
    amount: float
    year: int | None = None
    month: int | None = None
    last_date: str | None = None


class LeadSeason(BaseModel):
    year: int | None = None
    amount: float
    items: list[LeadEvidenceItem]


class LeadRelatedAppendix(BaseModel):
    contract_id: int
    contract_number: str | None = None
    contract_date: str | None = None
    appendix_number: str | None = None
    appendix_date: str | None = None
    item_name: str | None = None
    quantity: float | None = None
    unit: str | None = None
    amount: float | None = None


class LeadDetailOut(BaseModel):
    bin_iin: str | None = None
    company_name: str | None = None
    category: str | None = None
    lead_type: str | None = None
    suggested_product: str | None = None
    season_label: str | None = None
    current_year: int | None = None
    seasons: list[LeadSeason]
    current_season: LeadSeason | None = None
    related_appendices: list[LeadRelatedAppendix]
    narrative: str
    narrative_source: str

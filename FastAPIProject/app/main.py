from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.database import Base, engine
from app import models
from sqlalchemy import inspect, text

# создаём таблицы в базе
Base.metadata.create_all(bind=engine)

inspector = inspect(engine)
if inspector.has_table("contracts"):
    columns = {column["name"] for column in inspector.get_columns("contracts")}
    if "contract_document" not in columns:
        with engine.begin() as connection:
            if engine.dialect.name == "postgresql":
                connection.execute(
                    text("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_document JSONB"),
                )
            else:
                connection.execute(
                    text("ALTER TABLE contracts ADD COLUMN contract_document JSON"),
                )

if inspector.has_table("customers"):
    columns = {column["name"] for column in inspector.get_columns("customers")}
    expected_columns = [
        "legal_form",
        "contract_signer_full_name",
        "contract_signer_role",
        "contract_signer_basis",
        "city",
        "legal_address",
        "tax_regime",
        "created_by_user",
        "initial_contact_user",
    ]
    with engine.begin() as connection:
        for column_name in expected_columns:
            if column_name not in columns:
                connection.execute(text(f"ALTER TABLE customers ADD COLUMN {column_name} VARCHAR"))

app = FastAPI(title="Corp System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
def root():
    return {"message": "Welcome to Corp System API"}

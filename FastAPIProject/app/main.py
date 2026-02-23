from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app import models
from app.api.v1.api import api_router
from app.core.database import Base, SessionLocal, engine
from app.models.employee import Employee
from app.models.inventory import Inventory
from app.models.inventory_receipt import InventoryReceipt
from app.models.product import Product

Base.metadata.create_all(bind=engine)

inspector = inspect(engine)
if inspector.has_table("contracts"):
    columns = {column["name"] for column in inspector.get_columns("contracts")}
    with engine.begin() as connection:
        if "contract_document" not in columns:
            if engine.dialect.name == "postgresql":
                connection.execute(text("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_document JSONB"))
            else:
                connection.execute(text("ALTER TABLE contracts ADD COLUMN contract_document JSON"))
        if "owner_employee_id" not in columns:
            connection.execute(text("ALTER TABLE contracts ADD COLUMN owner_employee_id VARCHAR"))

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

if inspector.has_table("contract_items"):
    columns = {column["name"] for column in inspector.get_columns("contract_items")}
    if "appendix_number" not in columns:
        with engine.begin() as connection:
            if engine.dialect.name == "postgresql":
                connection.execute(text("ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS appendix_number INTEGER NOT NULL DEFAULT 1"))
            else:
                connection.execute(text("ALTER TABLE contract_items ADD COLUMN appendix_number INTEGER NOT NULL DEFAULT 1"))


SEED_EMPLOYEES = [
    {"id": "manager-001", "name": "Айгерим Менеджер", "email": "manager1@degeshcrm.local", "role": "manager", "city": "Астана"},
    {"id": "manager-002", "name": "Нурлан Менеджер", "email": "manager2@degeshcrm.local", "role": "manager", "city": "Алматы"},
    {"id": "sales-001", "name": "Ерлан Продажи", "email": "sales1@degeshcrm.local", "role": "sales", "city": "Шымкент"},
    {"id": "sales-002", "name": "Дина Продажи", "email": "sales2@degeshcrm.local", "role": "sales", "city": "Караганда"},
]

SEED_INCOMING = [
    ("NANJING RICHEN", "Ардглиф", 289000, False),
    ("ZHEJIANG CHEMICALS", "Эфир 960", 192000, False),
    ("HANGZHOU RUIJANG", "Сармат Экстра", 128000, False),
    ("HANGZHOU YUNRUN", "Парадеус", 6000, False),
    ("HANGZHOU YUNRUN", "Виват", 5000, False),
    ("HANGZHOU YUNRUN", "Раптора", 10000, False),
    ("HANGZHOU YUNRUN", "Король 400", 2000, False),
    ("HANGZHOU YUNRUN", "Бомбардир", 5000, False),
    ("HANGZHOU YUNRUN", "Циперфос-д", 8000, False),
    ("ZHEJIANG CHEMICALS", "Мустер", 48000, False),
    ("ZHEJIANG CHEMICALS", "Талгам", 17200, False),
    ("HANGZHOU RUIJANG", "Сункар", 25000, False),
    ("placeholder supplier", "Кловит", 11230, True),
    ("placeholder supplier", "Имидор", 7200, True),
    ("placeholder supplier", "Диома", 11520, True),
    ("placeholder supplier", "Хитон", 144000, True),
    ("placeholder supplier", "Триактив", 20000, True),
    ("placeholder supplier", "Мощь", 17280, True),
    ("placeholder supplier", "Интеграл", 20000, True),
    ("placeholder supplier", "Авецид", 28800, True),
    ("placeholder supplier", "Флокси микс", 5000, True),
    ("placeholder supplier", "Нанкина", 16000, True),
    ("placeholder supplier", "Супер стар", 8000, True),
    ("placeholder supplier", "Мустанг", 6000, True),
]


def seed_initial_data() -> None:
    db: Session = SessionLocal()
    try:
        for employee_data in SEED_EMPLOYEES:
            if not db.query(Employee).filter(Employee.id == employee_data["id"]).first():
                db.add(Employee(**employee_data))
        db.flush()

        for supplier, product_name, quantity, needs_enrichment in SEED_INCOMING:
            composed_name = f"{supplier} | {product_name}"
            product = db.query(Product).filter(Product.name == composed_name).first()
            if not product:
                product = Product(name=composed_name, unit="кг", price=0)
                db.add(product)
                db.flush()

            inventory = db.query(Inventory).filter(Inventory.product_id == product.id).first()
            if not inventory:
                inventory = Inventory(product_id=product.id, quantity_available=quantity, quantity_reserved=0)
                db.add(inventory)
                db.flush()

            receipt_exists = (
                db.query(InventoryReceipt)
                .filter(InventoryReceipt.product_id == product.id, InventoryReceipt.quantity == quantity)
                .first()
            )
            if not receipt_exists:
                db.add(
                    InventoryReceipt(
                        inventory_id=inventory.id,
                        product_id=product.id,
                        quantity=quantity,
                        needs_enrichment=needs_enrichment,
                    )
                )

        db.commit()
    finally:
        db.close()


seed_initial_data()

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

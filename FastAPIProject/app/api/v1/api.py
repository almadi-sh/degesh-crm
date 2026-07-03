from fastapi import APIRouter
from .customer import router as customers_router
from .product import router as products_router
from .contract import router as contracts_router
from .contract_item import router as contract_items_router
from .inventory import router as inventory_router
from .payment_term import router as payment_terms_router
from .reservation import router as reservations_router
from .supplier import router as suppliers_router
from .supplier_item import router as supplier_items_router
from .employee import router as employees_router
from .realization import router as realizations_router
from .debt import router as debts_router
from .counterparty import router as counterparties_router
from .lead import router as leads_router
from .warehouse_stock import router as warehouse_stock_router
from .contract_ext import router as ext_contracts_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(customers_router)
api_router.include_router(products_router)
api_router.include_router(contracts_router)
api_router.include_router(contract_items_router)
api_router.include_router(inventory_router)
api_router.include_router(payment_terms_router)
api_router.include_router(reservations_router)
api_router.include_router(suppliers_router)
api_router.include_router(supplier_items_router)
api_router.include_router(employees_router)
api_router.include_router(realizations_router)
api_router.include_router(debts_router)
api_router.include_router(counterparties_router)
api_router.include_router(leads_router)
api_router.include_router(warehouse_stock_router)
api_router.include_router(ext_contracts_router)

from fastapi import APIRouter
from .customer import router as customers_router
from .product import router as products_router
from .contract import router as contracts_router
from .inventory import router as inventory_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(customers_router)
api_router.include_router(products_router)
api_router.include_router(contracts_router)
api_router.include_router(inventory_router)

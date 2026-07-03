from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.warehouse_stock import WarehouseStock
from app.schemas.warehouse_stock import (
    WarehouseStockList,
    WarehouseStockSummary,
    WarehouseSummaryItem,
)

router = APIRouter(prefix="/warehouse-stock", tags=["WarehouseStock"])


@router.get("/", response_model=WarehouseStockList)
def list_stock(
    db: Session = Depends(get_db),
    warehouse: str | None = Query(default=None),
    search: str | None = Query(default=None),
):
    query = db.query(WarehouseStock)
    if warehouse:
        query = query.filter(WarehouseStock.warehouse == warehouse)
    if search:
        query = query.filter(WarehouseStock.product_name.ilike(f"%{search}%"))
    items = query.order_by(WarehouseStock.warehouse, WarehouseStock.product_name).all()
    return {"total": len(items), "items": items}


@router.get("/summary", response_model=WarehouseStockSummary)
def stock_summary(db: Session = Depends(get_db)):
    total_items = db.query(func.count(WarehouseStock.id)).scalar() or 0
    distinct_products = db.query(func.count(distinct(WarehouseStock.product_name))).scalar() or 0

    warehouses = []
    for warehouse, item_count, with_qty in (
        db.query(
            WarehouseStock.warehouse,
            func.count(WarehouseStock.id),
            func.count(WarehouseStock.quantity),
        )
        .group_by(WarehouseStock.warehouse)
        .order_by(WarehouseStock.warehouse)
        .all()
    ):
        warehouses.append(
            WarehouseSummaryItem(
                warehouse=warehouse,
                item_count=int(item_count or 0),
                positions_with_qty=int(with_qty or 0),
            )
        )

    return WarehouseStockSummary(
        total_items=int(total_items),
        distinct_products=int(distinct_products),
        warehouses=warehouses,
    )

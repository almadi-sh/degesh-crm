from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.employee import Employee
from app.schemas.employee import EmployeeOut

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("/", response_model=list[EmployeeOut])
def list_employees(
    db: Session = Depends(get_db),
    role: str | None = Query(default=None),
):
    query = db.query(Employee)
    if role:
        query = query.filter(Employee.role == role)
    return query.order_by(Employee.name).all()

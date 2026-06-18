from pydantic import BaseModel


class EmployeeOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    city: str | None = None

    class Config:
        from_attributes = True

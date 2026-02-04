from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.database import Base, engine
from app.core.migrations import run_legacy_migrations
from app import models

# apply guarded migrations before ORM creates missing tables
run_legacy_migrations(engine)
# создаём таблицы в базе
Base.metadata.create_all(bind=engine)

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

from pathlib import Path
import os

from dotenv import load_dotenv

# Load environment from backend folder and repository root (if present).
BASE_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")
load_dotenv(REPO_ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
SEED_DEMO_EMPLOYEES = os.getenv("SEED_DEMO_EMPLOYEES", "false").lower() in {"1", "true", "yes", "on"}
SEED_DEMO_INVENTORY = os.getenv("SEED_DEMO_INVENTORY", "false").lower() in {"1", "true", "yes", "on"}

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Create FastAPIProject/.env (or repo .env) "
        "and add DATABASE_URL=postgresql://user:password@host:port/dbname"
    )

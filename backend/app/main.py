import os
import sys
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend directory to path so that 'app' module imports work properly when run from root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.routes import upload, clean, download, auth
from app.utils.db import init_db

# Initialize database schemas
init_db()

app = FastAPI(
    title="ZoomInfo Lead Data Cleaner API",
    description="Internal tool API for mapping, cleaning, and exporting messy lead data.",
    version="1.0.0"
)

# Configure CORS
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS")
if not allowed_origins_raw:
    raise RuntimeError("ALLOWED_ORIGINS environment variable is not configured in the environment / .env file.")
allowed_origins = allowed_origins_raw.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api prefix
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="", tags=["Authentication"])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(clean.router, prefix="/clean", tags=["Clean"])
api_router.include_router(download.router, prefix="", tags=["Download & Cleanup"])

app.include_router(api_router)

@app.get("/")
@app.get("/api")
async def health_check():
    """
    Service health check endpoint.
    """
    return {
        "status": "ok",
        "service": "ZoomInfo Lead Data Cleaner"
    }


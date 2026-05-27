import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

# Include Routers
app.include_router(auth.router, prefix="", tags=["Authentication"])
app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(clean.router, prefix="/clean", tags=["Clean"])
# Mounted at root so paths are /download/{file_id} and /cleanup/{session_id}
app.include_router(download.router, tags=["Download & Cleanup"])

@app.get("/")
async def health_check():
    """
    Service health check endpoint.
    """
    return {
        "status": "ok",
        "service": "ZoomInfo Lead Data Cleaner"
    }

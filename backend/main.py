from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import engine, Base
from starlette.middleware.sessions import SessionMiddleware
from pathlib import Path
import os

# Get the project root directory (parent of backend)
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    description="Social Monkey - Emotion-aware social media helper API",
    version="0.1.0"

)

# Mount static files from frontend directory
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# Configure CORS - Updated to include file:// protocol for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session middleware for OAuth state management
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)  # Use settings.SECRET_KEY instead of hardcoded value

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

from fastapi.responses import FileResponse

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Serve favicon"""
    favicon_path = FRONTEND_DIR / "assets/icons/Main.ico"
    if favicon_path.exists():
        return FileResponse(favicon_path)
    return HTMLResponse(status_code=204)  # No Content if favicon doesn't exist


@app.get("/")
async def root():
    """Root endpoint"""
    index_file = FRONTEND_DIR / "landing.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(), status_code=200)
    else:
        return {"message": "Welcome to Social Monkey API. Frontend not found."}

@app.get("/login")
async def login():
    """Login endpoint"""
    login_file = FRONTEND_DIR / "templates/login.html"
    if login_file.exists():
        return HTMLResponse(content=login_file.read_text(encoding="utf-8"), status_code=200)
    else:
        return {"message": "Login page not found."}

@app.get("/register")
async def register():
    """Register endpoint"""
    register_file = FRONTEND_DIR / "templates/register.html"
    if register_file.exists():
        return HTMLResponse(content=register_file.read_text(encoding="utf-8"), status_code=200)
    else:
        return {"message": "Register page not found."}

@app.get("/dashboard")
async def dashboard():
    """Dashboard endpoint"""
    dashboard_file = FRONTEND_DIR / "templates/dashboard.html"
    if dashboard_file.exists():
        return HTMLResponse(content=dashboard_file.read_text(encoding="utf-8"), status_code=200)
    else:
        return {"message": "Dashboard page not found."}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

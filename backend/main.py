from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
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

# Simplified CORS - only needed for development tools since we're serving from same origin
# Remove most CORS complexity since frontend and backend are now on same origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Only for development tools
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Add session middleware for OAuth state management
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Frontend routes - serve HTML files
@app.get("/", response_class=HTMLResponse)
async def serve_login():
    """Serve the login page"""
    login_file = FRONTEND_DIR / "index.html"
    if not login_file.exists():
        raise HTTPException(404, f"Frontend file not found: {login_file}")
    return FileResponse(str(login_file))

@app.get("/dashboard", response_class=HTMLResponse)
async def serve_dashboard():
    """Serve the dashboard page"""
    dashboard_file = FRONTEND_DIR / "dashboard.html"
    if not dashboard_file.exists():
        raise HTTPException(404, f"Frontend file not found: {dashboard_file}")
    return FileResponse(str(dashboard_file))

@app.get("/register", response_class=HTMLResponse)
async def serve_register():
    """Serve the register page"""
    register_file = FRONTEND_DIR / "register.html"
    if not register_file.exists():
        raise HTTPException(404, f"Frontend file not found: {register_file}")
    return FileResponse(str(register_file))

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "version": "0.1.0"}

@app.get("/api", response_class=HTMLResponse)
async def api_info():
    """API information endpoint"""
    return {
        "message": "Social Monkey API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health"
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

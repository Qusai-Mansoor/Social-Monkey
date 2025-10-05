from fastapi import APIRouter
from app.api.v1.endpoints import auth, oauth, ingestion

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["OAuth"])
api_router.include_router(ingestion.router, prefix="/data", tags=["Data Ingestion"])

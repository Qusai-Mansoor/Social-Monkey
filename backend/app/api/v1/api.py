from fastapi import APIRouter
from app.api.v1.endpoints import auth, oauth, ingestion, terms_services, privacy_policy, analytics

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["OAuth"])
api_router.include_router(ingestion.router, prefix="/data", tags=["Data Ingestion"])
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["Ingestion"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(terms_services.router, prefix="/terms", tags=["Terms Services"])
api_router.include_router(privacy_policy.router, prefix="/privacy", tags=["Privacy Policy"])


from urllib.parse import parse_qs, urlparse
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.twitter_service import twitter_service
from app.schemas.social import SocialAccountResponse, OAuthCallback
from app.core.security import verify_token, get_current_user_id
from app.models.models import OAuthState


router = APIRouter()


@router.get("/twitter/authorize")
async def twitter_authorize(
    request: Request, 
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Initiate Twitter OAuth flow
    
    Returns authorization URL for user to grant access to their Twitter account.
    User should be redirected to this URL.
    """
    try:
        # Pass user_id to the OAuth service so it can be embedded in state
        auth_url = twitter_service.get_oauth_url(db, request, user_id)
       
        return {"authorization_url": auth_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )


@router.get("/twitter/callback")
async def twitter_callback(
    request: Request,
    code: str = Query(..., description="Authorization code from Twitter"),
    state: str = Query(None, description="State parameter for CSRF protection"),
    db: Session = Depends(get_db)
):
    """
    Handle Twitter OAuth callback
    
    This endpoint is called by Twitter after user authorizes the application.
    It exchanges the authorization code for access tokens and stores them.
    
    Steps:
    1. Extract authorization code from query parameters
    2. Exchange code for access token
    3. Fetch user info from Twitter
    4. Store encrypted tokens in database
    5. Redirect to frontend with success message
    """
    # Extract user_id from OAuth state since Twitter callback doesn't include JWT
    try:
        # Get OAuth state from database to retrieve user_id
        oauth_state = db.query(OAuthState).filter(OAuthState.state == state).first()
        if not oauth_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OAuth state"
            )
        
        # Extract user_id from the OAuth state
        user_id = oauth_state.user_id
        
        social_account = await twitter_service.handle_callback(
            code=code,
            state=state,
            user_id=user_id,
            request=request,
            db=db
        )
        
        # Redirect to frontend dashboard with success message
        return RedirectResponse(
            url="/dashboard?connected=twitter&username=" + social_account.platform_username,
            status_code=302
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect Twitter account: {str(e)}" 
        )


@router.get("/instagram/authorize")
async def instagram_authorize():
    """
    Initiate Instagram OAuth flow
    
    TODO: Implement Instagram OAuth
    Instagram OAuth is similar to Twitter but uses different endpoints
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Instagram OAuth not yet implemented"
    )


@router.get("/instagram/callback")
async def instagram_callback(
    code: str = Query(...),
    state: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle Instagram OAuth callback
    
    TODO: Implement Instagram OAuth callback
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Instagram OAuth not yet implemented"
    )

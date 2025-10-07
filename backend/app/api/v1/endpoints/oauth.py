from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.twitter_service import twitter_service
from app.schemas.social import SocialAccountResponse, OAuthCallback
from app.core.security import verify_token

router = APIRouter()


@router.get("/twitter/authorize")
async def twitter_authorize(request: Request):
    """
    Initiate Twitter OAuth flow
    
    Returns authorization URL for user to grant access to their Twitter account.
    User should be redirected to this URL.
    """
    try:
        auth_url = twitter_service.get_oauth_url(request)
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
    # TODO: Extract user_id from session or JWT token
    # For now, this is a placeholder - you need to implement proper auth
    user_id = 1  # This should come from authenticated user
    
    try:
        social_account = await twitter_service.handle_callback(
            code=code,
            state=state,
            user_id=user_id,
            request=request,
            db=db
        )
        
        # Redirect to frontend with success
        # In production, redirect to your frontend URL with success message
        return {
            "message": "Twitter account connected successfully",
            "account": {
                "platform": social_account.platform,
                "username": social_account.platform_username,
                "connected_at": social_account.created_at
            }
        }
    
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

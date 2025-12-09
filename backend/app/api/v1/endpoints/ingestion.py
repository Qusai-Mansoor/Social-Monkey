from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.social import PostResponse, PostWithComments, IngestionStatus, SocialAccountResponse
from app.models.models import SocialAccount, Post, Comment, User
from app.services.twitter_service import twitter_service
from app.core.security import get_current_user_id, get_current_user

router = APIRouter()


@router.get("/accounts", response_model=List[SocialAccountResponse])
async def get_connected_accounts(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Get all connected social media accounts for the authenticated user"""
    
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.is_active == True
    ).all()
    
    return accounts


@router.post("/ingest/{account_id}")
async def ingest_data(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync/Ingest data from connected social media account using RapidAPI
    
    This endpoint fetches posts and comments for authenticated users.
    
    For Twitter:
    1. Uses RapidAPI timeline endpoint to fetch user's posts
    2. Uses RapidAPI thread endpoint to fetch replies/comments for each post
    3. Performs emotion analysis and slang detection on all content
    
    Note: OAuth must be completed before syncing. The platform_username
    from the OAuth flow is used to fetch data from RapidAPI.
    """
    # Get social account
    social_account = db.query(SocialAccount).filter(
        SocialAccount.id == account_id,
        SocialAccount.user_id == current_user.id
    ).first()
    
    if not social_account:
        raise HTTPException(status_code=404, detail="Social account not found")
    
    if not social_account.is_active:
        raise HTTPException(status_code=400, detail="Social account is not active")
    
    try:
        if social_account.platform == "twitter":
            # Step 1: Fetch posts using RapidAPI timeline endpoint
            posts_result = await twitter_service.fetch_user_tweets(
                social_account=social_account,
                db=db,
                max_results=50
            )
            
            if "error" in posts_result:
                raise HTTPException(status_code=429, detail=posts_result["error"])
            
            posts_created = posts_result.get("posts_created", 0)
            
            # Step 2: Fetch comments for each post using RapidAPI thread endpoint
            comments_created = 0
            errors = []
            rate_limited = False
            
            # Get posts ordered by most recent with replies
            posts = db.query(Post).filter(
                Post.social_account_id == social_account.id,
                Post.replies_count > 0  # Only posts that have replies
            ).order_by(Post.created_at_platform.desc()).limit(20).all()  # Limit to 20 to avoid rate limits
            
            for post in posts:
                # Stop if we hit rate limit
                if rate_limited:
                    break
                    
                try:
                    # Count existing comments
                    existing_comments_count = db.query(Comment).filter(
                        Comment.post_id == post.id
                    ).count()
                    
                    # Only fetch if we have fewer comments than the post's reply count
                    # This means there are new replies to fetch
                    if existing_comments_count < post.replies_count:
                        comments_count = await twitter_service.fetch_tweet_replies(
                            post=post,
                            social_account=social_account,
                            db=db,
                            max_results=20
                        )
                        comments_created += comments_count
                except ValueError as e:
                    error_msg = str(e)
                    # Check if it's a rate limit error
                    if "Rate limit" in error_msg or "rate limit" in error_msg.lower():
                        errors.append(f"Rate limited - stopping comment fetch. {error_msg}")
                        rate_limited = True
                        break  # Stop trying more posts
                    else:
                        errors.append(f"Post {post.id}: {error_msg}")
                except Exception as e:
                    error_msg = str(e)
                    errors.append(f"Post {post.id}: {error_msg}")
                    # Continue with next post for other errors
                    continue
            
            return {
                "message": "Data sync completed successfully",
                "platform": "twitter",
                "posts_created": posts_created,
                "comments_created": comments_created,
                "data_source": "RapidAPI",
                "errors": errors if errors else None
            }
        
        elif social_account.platform == "instagram":
            raise HTTPException(
                status_code=501,
                detail="Instagram ingestion not yet implemented"
            )
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported platform: {social_account.platform}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts", response_model=List[PostResponse])
async def get_posts(
    account_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Get posts with optional filtering by account - only for authenticated user"""
    # Join with SocialAccount to ensure user only sees their own posts
    query = db.query(Post).join(SocialAccount).filter(
        SocialAccount.user_id == user_id
    )
    
    if account_id:
        query = query.filter(Post.social_account_id == account_id)
    
    posts = query.offset(skip).limit(limit).all()
    print(posts)
    return posts


@router.get("/posts/{post_id}", response_model=PostWithComments)
async def get_post_with_comments(
    post_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Get a specific post with all its comments - only for authenticated user"""
    # Join with SocialAccount to ensure user only sees their own posts
    post = db.query(Post).join(SocialAccount).filter(
        Post.id == post_id,
        SocialAccount.user_id == user_id
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    return post


@router.get("/stats")
async def get_ingestion_stats(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Get overall ingestion statistics for authenticated user"""
    
    # Get user's social accounts
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id
    ).all()
    
    account_ids = [acc.id for acc in accounts]
    
    # Count posts
    total_posts = db.query(Post).filter(
        Post.social_account_id.in_(account_ids)
    ).count()
    
    # Count preprocessed posts
    preprocessed_posts = db.query(Post).filter(
        Post.social_account_id.in_(account_ids),
        Post.is_preprocessed == True
    ).count()
    
    return {
        "total_accounts": len(accounts),
        "total_posts": total_posts,
        "preprocessed_posts": preprocessed_posts,
        "accounts": [
            {
                "id": acc.id,
                "platform": acc.platform,
                "username": acc.platform_username
            }
            for acc in accounts
        ]
    }

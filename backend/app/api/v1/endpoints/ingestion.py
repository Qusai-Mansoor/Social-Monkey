from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.social import PostResponse, PostWithComments, IngestionStatus, SocialAccountResponse
from app.models.models import SocialAccount, Post
from app.services.twitter_service import twitter_service
from app.core.security import get_current_user_id

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


@router.post("/ingest/{account_id}", response_model=IngestionStatus)
async def ingest_data(
    account_id: int,
    max_posts: int = 100,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Ingest posts and comments from a connected social account
    
    Steps:
    1. Fetch user's posts from the platform
    2. For each post, fetch comments/replies
    3. Preprocess all content
    4. Store in database
    5. Return ingestion statistics
    """
    # Get social account - ensure it belongs to the authenticated user
    social_account = db.query(SocialAccount).filter(
        SocialAccount.id == account_id,
        SocialAccount.user_id == user_id,  # Security: only allow access to user's own accounts
        SocialAccount.is_active == True
    ).first()
    
    if not social_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Social account not found"
        )
    
    try:
        if social_account.platform == "twitter":
            # Fetch tweets
            result = await twitter_service.fetch_user_tweets(
                social_account=social_account,
                db=db,
                max_results=max_posts
            )
            
            # Check if there was an error
            if "error" in result:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS if "Rate limit" in result["error"] else status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=result["error"]
                )
            
            posts_fetched = result["posts_created"]
            
            # Only fetch replies if we successfully got posts
            total_comments = 0
            if posts_fetched > 0:
                # Fetch replies for each post (limit to recent posts to avoid rate limits)
                posts = db.query(Post).filter(
                    Post.social_account_id == account_id
                ).order_by(Post.created_at_platform.desc()).limit(5).all()  # Reduced to 5 most recent posts
                
                for post in posts:
                    try:
                        comments_count = await twitter_service.fetch_tweet_replies(
                            post=post,
                            social_account=social_account,
                            db=db,
                            max_results=10  # Reduced from 20 to 10
                        )
                        total_comments += comments_count
                    except ValueError as e:
                        if "Rate limit" in str(e):
                            # If we hit rate limit, stop processing more posts
                            return IngestionStatus(
                                status="partial_success",
                                posts_fetched=posts_fetched,
                                comments_fetched=total_comments,
                                message=f"Partially completed: Fetched {posts_fetched} posts and {total_comments} comments. {str(e)}"
                            )
                        else:
                            print(f"Error fetching replies for post {post.id}: {e}")
                            continue  # Skip this post but continue with others
            else:
                # If no posts were fetched, we check if new replies can be fetched for existing posts
                existing_posts = db.query(Post).filter(
                    Post.social_account_id == account_id
                ).order_by(Post.created_at_platform.desc()).limit(5).all()

                for post in existing_posts:
                    try:
                        comments_count = await twitter_service.fetch_tweet_replies(
                            post=post,
                            social_account=social_account,
                            db=db,
                            max_results=10  # Reduced from 20 to 10
                        )
                        total_comments += comments_count
                    except ValueError as e:
                        if "Rate limit" in str(e):
                            # If we hit rate limit, stop processing more posts
                            return IngestionStatus(
                                status="partial_success",
                                posts_fetched=posts_fetched,
                                comments_fetched=total_comments,
                                message=f"Partially completed: Fetched {posts_fetched} posts and {total_comments} comments. {str(e)}"
                            )
                        else:
                            print(f"Error fetching replies for post {post.id}: {e}")
                            continue  # Skip this post but continue with others


            return IngestionStatus(
                status="success",
                posts_fetched=posts_fetched,
                comments_fetched=total_comments,
                message=f"Successfully ingested {posts_fetched} posts and {total_comments} comments"
            )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=f"Platform {social_account.platform} not yet supported"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest data: {str(e)}"
        )


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

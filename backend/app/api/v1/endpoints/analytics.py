from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
import re

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.models import User, SocialAccount, Post, Comment

router = APIRouter()

def calculate_engagement(post: Post) -> int:
    """Calculate total engagement for a post"""
    return (post.likes_count or 0) + (post.retweets_count or 0) + (post.replies_count or 0)

@router.post("/analyze-existing")
def analyze_existing_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger analysis for existing posts AND comments that haven't been analyzed yet.
    """
    from app.analysis.emotion_engine import analyze_emotion
    from app.analysis.slang_normalizer import SlangNormalizer

    # Get user's social accounts
    account_ids = db.query(SocialAccount.id).filter(SocialAccount.user_id == current_user.id).all()
    account_ids = [id[0] for id in account_ids]
    
    if not account_ids:
        return {"message": "No social accounts found", "updated_count": 0, "comments_updated": 0}

    # Fetch posts that need analysis (where emotion_scores OR dominant_emotion is null)
    posts = db.query(Post).filter(
        Post.social_account_id.in_(account_ids)
    ).filter(
        (Post.emotion_scores == None) | (Post.dominant_emotion == None)
    ).all()
    
    print(f"DEBUG: Found {len(posts)} posts needing analysis")
    for p in posts:
        print(f"  Post ID {p.id}: emotion_scores={p.emotion_scores}, dominant_emotion={p.dominant_emotion}")
    
    updated_count = 0
    normalizer = SlangNormalizer.get_instance()
    
    for post in posts:
        print(f"DEBUG: Analyzing post {post.id}: {post.content[:50]}...")
        # Analyze Emotion
        emotion_result = analyze_emotion(post.content)
        post.emotion_scores = emotion_result["scores"]
        post.dominant_emotion = emotion_result["dominant"]
        post.sentiment_score = emotion_result["sentiment_score"]
        
        print(f"  Result: dominant={emotion_result['dominant']}, sentiment={emotion_result['sentiment_score']}")
        
        # Analyze Slang
        detected_slang = normalizer.detect_slang(post.content)
        slang_result = [{"term": s["text"], "meaning": s["normalized"]} for s in detected_slang]
        post.detected_slang = slang_result
        
        print(f"  Slang: {len(slang_result)} terms detected")
        
        updated_count += 1
    
    # Also analyze comments
    post_ids = db.query(Post.id).filter(Post.social_account_id.in_(account_ids)).all()
    post_ids = [id[0] for id in post_ids]
    
    comments_updated = 0
    if post_ids:
        comments = db.query(Comment).filter(
            Comment.post_id.in_(post_ids)
        ).filter(
            (Comment.emotion_scores == None) | (Comment.dominant_emotion == None)
        ).all()
        
        for comment in comments:
            # Analyze Emotion
            emotion_result = analyze_emotion(comment.content)
            comment.emotion_scores = emotion_result["scores"]
            comment.dominant_emotion = emotion_result["dominant"]
            comment.sentiment_score = emotion_result["sentiment_score"]
            
            # Analyze Slang
            detected_slang = normalizer.detect_slang(comment.content)
            slang_result = [{"term": s["text"], "meaning": s["normalized"]} for s in detected_slang]
            comment.detected_slang = slang_result
            
            comments_updated += 1
        
    db.commit()
    
    print(f"DEBUG: Committing changes. Posts: {updated_count}, Comments: {comments_updated}")
    
    return {
        "message": "Analysis complete", 
        "updated_count": updated_count,
        "comments_updated": comments_updated,
        "total_updated": updated_count + comments_updated
    }

@router.get("/overview")
def get_overview_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overview dashboard data with REAL values from database"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        account_ids = [account.id for account in accounts] if accounts else []
        
        if not account_ids:
             return {
                "total_posts": 0,
                "total_engagement": 0,
                "avg_sentiment": 0,
                "flagged_posts": 0,
                "emotion_distribution": {}
            }

        # Get real post count
        total_posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).count()
        
        # Calculate real engagement and slang usage
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()
        
        total_engagement = sum(calculate_engagement(post) for post in posts)
        avg_engagement = total_engagement / total_posts if total_posts > 0 else 0
        
        # Calculate Slang Usage (Percentage of posts containing slang)
        posts_with_slang = 0
        for post in posts:
            slang_data = post.detected_slang
            if slang_data and isinstance(slang_data, list) and len(slang_data) > 0:
                posts_with_slang += 1
                
        slang_usage_percent = (posts_with_slang / total_posts * 100) if total_posts > 0 else 0
        
        # Calculate Average Sentiment (0-100 scale)
        # sentiment_score is -1 to 1. We map it to 0-100.
        sentiment_scores = [p.sentiment_score for p in posts if p.sentiment_score is not None]
        avg_sentiment_raw = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        avg_sentiment = int((avg_sentiment_raw + 1) * 50) # Map -1->0, 0->50, 1->100
        
        # Count Flagged Posts (Negative emotions)
        negative_emotions = ['anger', 'sadness', 'disgust', 'disappointment', 'annoyance']
        flagged_posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids),
            Post.dominant_emotion.in_(negative_emotions)
        ).count()
        
        # Get Emotion Distribution
        emotion_counts = db.query(Post.dominant_emotion, func.count(Post.id))\
            .filter(Post.social_account_id.in_(account_ids))\
            .filter(Post.dominant_emotion != None)\
            .group_by(Post.dominant_emotion).all()
            
        emotion_distribution = {r[0]: r[1] for r in emotion_counts}
        
        return {
            "total_posts": total_posts,
            "total_engagement": total_engagement,
            "avg_engagement": avg_engagement,
            "slang_usage_percent": round(slang_usage_percent, 1),
            "avg_sentiment": avg_sentiment,
            "flagged_posts": flagged_posts,
            "emotion_distribution": emotion_distribution
        }
        
    except Exception as e:
        print(f"Error in overview: {e}")
        # Return empty structure on error
        return {
            "total_posts": 0,
            "total_engagement": 0,
            "avg_sentiment": 0,
            "flagged_posts": 0,
            "emotion_distribution": {}
        }


@router.get("/posts")
def get_posts(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's posts (returns real data or dummy data)"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return []
        
        account_ids = [account.id for account in accounts]
        
        # Get real posts from database
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).order_by(desc(Post.created_at_platform)).limit(limit).all()
        
        if not posts:
            return []
        
        # Return real posts
        return [
            {
                "id": post.id,
                "platform": post.social_account.platform if post.social_account else "twitter",
                "content": post.content,
                "created_at_platform": post.created_at_platform.isoformat() if post.created_at_platform else None,
                "likes_count": post.likes_count or 0,
                "retweets_count": post.retweets_count or 0,
                "replies_count": post.replies_count or 0,
                "sentiment_label": post.dominant_emotion or "neutral",
                "sentiment_score": post.sentiment_score or 0
            }
            for post in posts
        ]
        
    except Exception as e:
        # Return dummy posts on error
        return [
            {
                "id": 1,
                "platform": "Tiktok",
                "content": "Just posted a new vlog! Link in bio 🎬",
                "created_at_platform": "2025-10-10T12:00:00",
                "likes_count": 2341,
                "retweets_count": 456,
                "replies_count": 234,
                "sentiment_label": "joy",
                "sentiment_score": 0.93
            },
            {
                "id": 2,
                "platform": "Instagram",
                "content": "Behind the scenes of our latest photoshoot 📸",
                "created_at_platform": "2025-10-13T15:30:00",
                "likes_count": 892,
                "retweets_count": 234,
                "replies_count": 67,
                "sentiment_label": "admiration",
                "sentiment_score": 0.91
            },
            {
                "id": 3,
                "platform": "Instagram",
                "content": "Morning smoothie routine #energy ✨",
                "created_at_platform": "2025-10-15T09:00:00",
                "likes_count": 342,
                "retweets_count": 68,
                "replies_count": 23,
                "sentiment_label": "joy",
                "sentiment_score": 0.87
            }
        ]


@router.get("/stats")
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get basic user statistics"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return {
                "total_posts": 0,
                "preprocessed_posts": 0,
                "total_accounts": 0,
                "total_slang_terms": 0,
                "avg_engagement": 0
            }
        
        account_ids = [account.id for account in accounts]
        
        # Get total posts
        total_posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).count()
        
        # Get preprocessed posts
        preprocessed_posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids),
            Post.preprocessed_content.isnot(None)
        ).count()
        
        # Get all posts for slang analysis
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()
        
        total_slang_terms = 0
        total_engagement = 0
        
        for post in posts:
            # Use stored slang data - it's a list of {"term": ..., "meaning": ...} objects
            slang_data = post.detected_slang
            if slang_data and isinstance(slang_data, list):
                total_slang_terms += len(slang_data)
            
            total_engagement += calculate_engagement(post)
        
        avg_engagement = total_engagement // total_posts if total_posts > 0 else 0
        
        return {
            "total_posts": total_posts,
            "preprocessed_posts": preprocessed_posts,
            "total_accounts": len(accounts),
            "total_slang_terms": total_slang_terms,
            "avg_engagement": avg_engagement
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

@router.get("/emotion-analysis")
def get_emotion_analysis(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get emotion analysis of user's posts (Real Data) with time-based trends"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()

        if not accounts:
            return {
                "emotions": {"positive": 0, "neutral": 0, "negative": 0},
                "total_analyzed": 0,
                "breakdown": {},
                "avg_sentiment_score": 0,
                "emotion_trends": {"dates": [], "emotions": {}}
            }

        account_ids = [account.id for account in accounts]

        # Calculate date range (timezone-aware for comparison with database dates)
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)

        # Get all posts that have been analyzed (have dominant_emotion)
        emotion_counts = db.query(
            Post.dominant_emotion,
            func.count(Post.id)
        ).filter(
            Post.social_account_id.in_(account_ids),
            Post.dominant_emotion.isnot(None)
        ).group_by(Post.dominant_emotion).all()

        emotions = {"positive": 0, "neutral": 0, "negative": 0}
        breakdown = {}
        total_analyzed = 0

        # Simple mapping for aggregation
        positive_set = {'joy', 'love', 'admiration', 'approval', 'caring', 'excitement', 'gratitude', 'optimism', 'pride', 'relief', 'desire', 'amusement'}
        negative_set = {'anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'embarrassment', 'fear', 'grief', 'nervousness', 'remorse', 'sadness'}

        for emotion, count in emotion_counts:
            # Update breakdown
            breakdown[emotion] = count
            total_analyzed += count

            # Update aggregated emotions
            if emotion in positive_set:
                emotions["positive"] += count
            elif emotion in negative_set:
                emotions["negative"] += count
            else:
                emotions["neutral"] += count

        # Calculate average sentiment score from actual database values
        sentiment_scores = db.query(Post.sentiment_score).filter(
            Post.social_account_id.in_(account_ids),
            Post.sentiment_score.isnot(None)
        ).all()

        avg_sentiment = 0
        if sentiment_scores:
            scores = [s[0] for s in sentiment_scores if s[0] is not None]
            if scores:
                # sentiment_score is -1 to 1, convert to 0-100
                avg_raw = sum(scores) / len(scores)
                avg_sentiment = round((avg_raw + 1) * 50, 1)  # Map -1->0, 0->50, 1->100

        # Get emotion trends over time (last N days)
        # Use created_at_platform for actual post dates, fallback to created_at if not available
        posts_with_dates = db.query(Post).filter(
            Post.social_account_id.in_(account_ids),
            Post.dominant_emotion.isnot(None)
        ).all()

        # Filter posts by date and group by date and emotion
        daily_emotion_counts = {}
        for post in posts_with_dates:
            # Use platform date if available, otherwise use created_at
            post_date = post.created_at_platform if post.created_at_platform else post.created_at

            if not post_date:
                continue

            # Check if post is within date range
            if post_date < start_date or post_date > end_date:
                continue

            date_str = post_date.date().isoformat()
            emotion = post.dominant_emotion

            if date_str not in daily_emotion_counts:
                daily_emotion_counts[date_str] = {}

            daily_emotion_counts[date_str][emotion] = daily_emotion_counts[date_str].get(emotion, 0) + 1

        # Get all unique emotions for trends
        all_emotions = set(breakdown.keys())

        # Build trend data
        dates = sorted(daily_emotion_counts.keys())
        emotion_trends = {emotion: [] for emotion in all_emotions}

        for date in dates:
            for emotion in all_emotions:
                count = daily_emotion_counts[date].get(emotion, 0)
                emotion_trends[emotion].append(count)

        # If no trends data found but we have posts, it might be a date range issue
        # Return debug info to help troubleshoot
        debug_info = {}
        if len(dates) == 0 and total_analyzed > 0:
            # Get sample post dates to help debug
            sample_posts = db.query(Post).filter(
                Post.social_account_id.in_(account_ids),
                Post.dominant_emotion.isnot(None)
            ).limit(5).all()

            debug_info = {
                "message": "No posts found in date range",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "sample_post_dates": [
                    {
                        "created_at": p.created_at.isoformat() if p.created_at else None,
                        "created_at_platform": p.created_at_platform.isoformat() if p.created_at_platform else None
                    }
                    for p in sample_posts
                ]
            }

        return {
            "emotions": emotions,
            "breakdown": breakdown,
            "total_analyzed": total_analyzed,
            "avg_sentiment_score": avg_sentiment,
            "emotion_trends": {
                "dates": dates,
                "emotions": emotion_trends
            },
            "debug": debug_info if debug_info else None
        }

    except Exception as e:
        print(f"Error in emotion-analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing emotions: {str(e)}")

@router.get("/slang-analysis")
def get_slang_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Gen-Z slang analysis of user's posts AND comments (Real Data)"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return {
                "slang_frequency": {},
                "total_slang_terms": 0,
                "unique_terms": 0,
                "top_terms": []
            }
        
        account_ids = [account.id for account in accounts]
        
        # Get all posts
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()
        
        slang_frequency = {}
        total_slang_terms = 0
        
        # Process posts
        for post in posts:
            # Use stored slang data - it's a list of {"term": ..., "meaning": ...} objects
            slang_data = post.detected_slang
            if slang_data and isinstance(slang_data, list):
                total_slang_terms += len(slang_data)
                
                for item in slang_data:
                    if isinstance(item, dict):
                        term = item.get("term")
                        if term:
                            slang_frequency[term] = slang_frequency.get(term, 0) + 1
        
        # Get all comments from these posts
        post_ids = [post.id for post in posts]
        if post_ids:
            comments = db.query(Comment).filter(
                Comment.post_id.in_(post_ids)
            ).all()
            
            # Process comments
            for comment in comments:
                slang_data = comment.detected_slang
                if slang_data and isinstance(slang_data, list):
                    total_slang_terms += len(slang_data)
                    
                    for item in slang_data:
                        if isinstance(item, dict):
                            term = item.get("term")
                            if term:
                                slang_frequency[term] = slang_frequency.get(term, 0) + 1
        
        # Format for frontend
        sorted_terms = sorted(slang_frequency.items(), key=lambda x: x[1], reverse=True)
        top_terms = [{"term": term, "count": count} for term, count in sorted_terms[:10]]
        
        return {
            "slang_frequency": dict(sorted_terms),
            "total_slang_terms": total_slang_terms,
            "unique_terms": len(slang_frequency),
            "top_terms": top_terms
        }
        
    except Exception as e:
        print(f"Error in slang-analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing slang: {str(e)}")

@router.get("/top-posts")
def get_top_posts(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top performing posts by engagement (Real Data)"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return []
        
        account_ids = [account.id for account in accounts]
        
        # Get posts ordered by engagement (calculated in DB or app)
        # Since we don't have a total_engagement column, we fetch all and sort in python
        # For large datasets this should be optimized with a computed column or SQL expression
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()
        
        # Calculate engagement and sort
        posts_with_engagement = []
        for post in posts:
            engagement = calculate_engagement(post)
            
            # Use stored analysis
            emotion = post.dominant_emotion or "neutral"
            slang_data = post.detected_slang or []
            # detected_slang is a list of {"term": ..., "meaning": ...} objects
            slang_terms = [item.get("term") for item in slang_data if isinstance(item, dict)] if isinstance(slang_data, list) else []
            
            posts_with_engagement.append({
                "id": post.id,
                "content": post.content,
                "likes_count": post.likes_count or 0,
                "retweets_count": post.retweets_count or 0,
                "replies_count": post.replies_count or 0,
                "engagement": engagement,
                "emotion": emotion,
                "dominant_emotion": post.dominant_emotion,
                "emotion_scores": post.emotion_scores,  # JSON with all 28 emotions
                "sentiment_score": post.sentiment_score,  # Float for percentage calculation
                "slang_terms": slang_terms,
                "created_at": post.created_at.isoformat() if post.created_at else None,
                "created_at_platform": post.created_at_platform.isoformat() if post.created_at_platform else None,
                "platform": post.social_account.platform if post.social_account else "twitter",
                "platform_post_id": post.platform_post_id
            })
        
        # Sort by engagement and return top posts
        top_posts = sorted(posts_with_engagement, key=lambda x: x["engagement"], reverse=True)[:limit]
        
        return top_posts
        
    except Exception as e:
        print(f"Error in top-posts: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting top posts: {str(e)}")

@router.get("/engagement-trends")
def get_engagement_trends(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get engagement trends over time"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return {"dates": [], "engagements": []}
        
        account_ids = [account.id for account in accounts]

        # Get posts from the last N days (timezone-aware)
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)

        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()

        # Group by date and calculate average engagement
        daily_engagement = {}
        daily_counts = {}

        for post in posts:
            # Use platform date if available, otherwise use created_at
            post_date = post.created_at_platform if post.created_at_platform else post.created_at

            if not post_date:
                continue

            # Check if post is within date range
            if post_date < start_date or post_date > end_date:
                continue

            date_str = post_date.date().isoformat()
            engagement = calculate_engagement(post)
            
            if date_str not in daily_engagement:
                daily_engagement[date_str] = 0
                daily_counts[date_str] = 0
            
            daily_engagement[date_str] += engagement
            daily_counts[date_str] += 1
        
        # Calculate averages
        dates = []
        engagements = []
        
        for date_str in sorted(daily_engagement.keys()):
            dates.append(date_str)
            avg_engagement = daily_engagement[date_str] / daily_counts[date_str] if daily_counts[date_str] > 0 else 0
            engagements.append(round(avg_engagement, 2))
        
        return {
            "dates": dates,
            "engagements": engagements
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting engagement trends: {str(e)}")

@router.get("/post-frequency")
def get_post_frequency(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get posting frequency over time"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return {"dates": [], "post_counts": []}
        
        account_ids = [account.id for account in accounts]

        # Get posts from the last N days (timezone-aware)
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)

        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()

        # Group by date and count posts
        daily_counts = {}

        for post in posts:
            # Use platform date if available, otherwise use created_at
            post_date = post.created_at_platform if post.created_at_platform else post.created_at

            if not post_date:
                continue

            # Check if post is within date range
            if post_date < start_date or post_date > end_date:
                continue

            date_str = post_date.date().isoformat()
            daily_counts[date_str] = daily_counts.get(date_str, 0) + 1
        
        # Create complete date range
        dates = []
        post_counts = []
        current_date = start_date.date()
        
        while current_date <= end_date.date():
            date_str = current_date.isoformat()
            dates.append(date_str)
            post_counts.append(daily_counts.get(date_str, 0))
            current_date += timedelta(days=1)
        
        return {
            "dates": dates,
            "post_counts": post_counts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting post frequency: {str(e)}")

@router.get("/advanced-analytics")
def get_advanced_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive analytics data"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return {
                "total_posts": 0,
                "emotion_distribution": {"positive": 0, "neutral": 0, "negative": 0},
                "slang_analysis": {"total_terms": 0, "unique_terms": 0, "top_terms": []},
                "engagement_summary": {"total": 0, "average": 0, "top_post": None},
                "activity_summary": {"most_active_day": None, "posts_per_day": 0}
            }
        
        account_ids = [account.id for account in accounts]
        
        # Get all posts
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()
        
        if not posts:
            return {
                "total_posts": 0,
                "emotion_distribution": {"positive": 0, "neutral": 0, "negative": 0},
                "slang_analysis": {"total_terms": 0, "unique_terms": 0, "top_terms": []},
                "engagement_summary": {"total": 0, "average": 0, "top_post": None},
                "activity_summary": {"most_active_day": None, "posts_per_day": 0}
            }
        
        # Analyze emotions
        emotions = {"positive": 0, "neutral": 0, "negative": 0}
        slang_frequency = {}
        total_engagement = 0
        daily_posts = {}
        top_post = None
        max_engagement = 0
        
        # Simple mapping for aggregation
        positive_set = {'joy', 'love', 'admiration', 'approval', 'caring', 'excitement', 'gratitude', 'optimism', 'pride', 'relief', 'desire'}
        negative_set = {'anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'embarrassment', 'fear', 'grief', 'nervousness', 'remorse', 'sadness'}
        
        for post in posts:
            # Emotion analysis
            emotion_label = post.dominant_emotion
            if emotion_label in positive_set:
                emotions["positive"] += 1
            elif emotion_label in negative_set:
                emotions["negative"] += 1
            else:
                emotions["neutral"] += 1
            
            # Slang analysis
            slang_data = post.detected_slang
            slang_terms = []
            if slang_data and isinstance(slang_data, dict):
                slang_terms = slang_data.get("found_slang", [])
                
            for term in slang_terms:
                slang_frequency[term] = slang_frequency.get(term, 0) + 1
            
            # Engagement analysis
            engagement = calculate_engagement(post)
            total_engagement += engagement
            
            if engagement > max_engagement:
                max_engagement = engagement
                top_post = {
                    "id": post.id,
                    "content": post.content[:100] + "..." if len(post.content) > 100 else post.content,
                    "engagement": engagement
                }
            
            # Activity analysis
            if post.created_at:
                date_str = post.created_at.date().isoformat()
                daily_posts[date_str] = daily_posts.get(date_str, 0) + 1
        
        # Calculate activity summary
        most_active_day = max(daily_posts.items(), key=lambda x: x[1]) if daily_posts else None
        avg_posts_per_day = len(posts) / max(len(daily_posts), 1)
        
        # Get top slang terms
        top_slang_terms = sorted(slang_frequency.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_posts": len(posts),
            "emotion_distribution": emotions,
            "slang_analysis": {
                "total_terms": sum(slang_frequency.values()),
                "unique_terms": len(slang_frequency),
                "top_terms": [{"term": term, "count": count} for term, count in top_slang_terms]
            },
            "engagement_summary": {
                "total": total_engagement,
                "average": round(total_engagement / len(posts), 2) if posts else 0,
                "top_post": top_post
            },
            "activity_summary": {
                "most_active_day": most_active_day[0] if most_active_day else None,
                "posts_per_day": round(avg_posts_per_day, 2)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting advanced analytics: {str(e)}")

@router.get("/dashboard/emotion-distribution")
def get_emotion_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the distribution of dominant emotions across all user posts.
    Returns: [{"emotion": "joy", "count": 15}, ...]
    """
    # Get user's social accounts
    account_ids = db.query(SocialAccount.id).filter(SocialAccount.user_id == current_user.id).all()
    account_ids = [id[0] for id in account_ids]
    
    if not account_ids:
        return []

    results = db.query(Post.dominant_emotion, func.count(Post.id))\
        .filter(Post.social_account_id.in_(account_ids))\
        .filter(Post.dominant_emotion != None)\
        .group_by(Post.dominant_emotion).all()
        
    return [{"emotion": r[0], "count": r[1]} for r in results]

@router.get("/dashboard/slang-insights")
def get_slang_insights(
    date_range: int = 30,
    platform: str = "all",
    sort_by: str = "frequency",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive Gen-Z slang insights with filtering and sorting.
    
    Params:
    - date_range: Number of days to look back (7, 30, 90)
    - platform: Filter by platform ('all', 'twitter', 'instagram')
    - sort_by: Sort method ('frequency', 'engagement', 'growth')
    
    Returns comprehensive slang analytics including:
    - Total slang terms count
    - Total emoji count
    - Top slang term
    - Growth rate
    - Detailed slang analysis with engagement metrics
    - Platform usage breakdown
    - Trend analysis
    """
    # Get user's social accounts
    account_ids = db.query(SocialAccount.id).filter(SocialAccount.user_id == current_user.id).all()
    account_ids = [id[0] for id in account_ids]
    
    if not account_ids:
        return {
            "total_slang_count": 0,
            "total_emoji_count": 0,
            "top_slang_term": "N/A",
            "growth_rate": 0,
            "slang_analysis": [],
            "platform_usage": {},
            "trends": {}
        }

    # Calculate date range
    start_date = datetime.now(timezone.utc) - timedelta(days=date_range)
    mid_date = datetime.now(timezone.utc) - timedelta(days=date_range // 2)  # For growth calculation
    
    # Build query with filters
    query = db.query(Post).filter(
        Post.social_account_id.in_(account_ids),
        Post.created_at >= start_date
    )
    
    # Apply platform filter
    if platform != "all":
        platform_account_ids = db.query(SocialAccount.id).filter(
            SocialAccount.user_id == current_user.id,
            SocialAccount.platform == platform
        ).all()
        platform_account_ids = [id[0] for id in platform_account_ids]
        if platform_account_ids:
            query = query.filter(Post.social_account_id.in_(platform_account_ids))
    
    posts = query.all()
    
    # Also get comments for comprehensive analysis
    post_ids = [p.id for p in posts]
    comments = []
    if post_ids:
        comments = db.query(Comment).filter(Comment.post_id.in_(post_ids)).all()
    
    # Combine content from posts and comments
    all_content = [(p, 'post', p.content, p.detected_slang, p.created_at) for p in posts]
    all_content += [(c, 'comment', c.content, c.detected_slang, c.created_at) for c in comments]
    
    # Analyze slang usage and emoji patterns
    slang_data = {}  # {term: {count, meaning, posts, engagement, recent_count, older_count, emotions}}
    emoji_pattern = re.compile(r'[\U0001F300-\U0001F9FF\u2600-\u26FF\u2700-\u27BF]')
    emoji_emotion_map = {}  # {emoji: {count, emotion}}
    total_emoji_count = 0
    
    # First pass: collect data from posts only for engagement
    post_slang_map = {}  # {term: [post_ids]}
    for post in posts:
        if post.detected_slang and isinstance(post.detected_slang, list):
            for slang_item in post.detected_slang:
                term = slang_item.get('term')
                if term:
                    if term not in post_slang_map:
                        post_slang_map[term] = []
                    post_slang_map[term].append(post.id)
    
    for item, item_type, content, detected_slang, created_at in all_content:
        # Count emojis and map to emotions
        emojis = emoji_pattern.findall(content)
        total_emoji_count += len(emojis)
        
        # Map emojis to emotions (from post/comment emotion data)
        for emoji in emojis:
            if emoji not in emoji_emotion_map:
                emoji_emotion_map[emoji] = {'count': 0, 'emotion': 'neutral'}
            emoji_emotion_map[emoji]['count'] += 1
            
            # Try to associate emoji with the dominant emotion of the content
            if item_type == 'post' and hasattr(item, 'dominant_emotion') and item.dominant_emotion:
                emoji_emotion_map[emoji]['emotion'] = item.dominant_emotion
            elif item_type == 'comment' and hasattr(item, 'dominant_emotion') and item.dominant_emotion:
                emoji_emotion_map[emoji]['emotion'] = item.dominant_emotion
        
        # Process detected slang
        if detected_slang and isinstance(detected_slang, list):
            for slang_item in detected_slang:
                term = slang_item.get('term')
                meaning = slang_item.get('meaning', '')
                
                if term:
                    if term not in slang_data:
                        slang_data[term] = {
                            'count': 0,
                            'meaning': meaning,
                            'posts': set(),
                            'engagement': 0,
                            'recent_count': 0,
                            'older_count': 0,
                            'emotions': []  # Track emotions from BERTweet
                        }
                    
                    slang_data[term]['count'] += 1
                    
                    # Track emotion from BERTweet analysis
                    if item_type == 'post' and hasattr(item, 'dominant_emotion') and item.dominant_emotion:
                        slang_data[term]['emotions'].append(item.dominant_emotion)
                    elif item_type == 'comment' and hasattr(item, 'dominant_emotion') and item.dominant_emotion:
                        slang_data[term]['emotions'].append(item.dominant_emotion)
                    
                    # Track growth (count all occurrences for trend)
                    if created_at >= mid_date:
                        slang_data[term]['recent_count'] += 1
                    else:
                        slang_data[term]['older_count'] += 1
    
    # Second pass: calculate engagement for posts containing each slang
    for term in slang_data:
        if term in post_slang_map:
            post_ids = post_slang_map[term]
            slang_data[term]['posts'] = set(post_ids)
            
            # Calculate total engagement for posts with this slang
            for post in posts:
                if post.id in post_ids:
                    slang_data[term]['engagement'] += calculate_engagement(post)
    
    # Calculate metrics for each slang term
    slang_analysis = []
    for term, data in slang_data.items():
        # Calculate growth percentage
        # Calculate average engagement per post
        avg_engagement = data['engagement'] / len(data['posts']) if data['posts'] else 0
        
        # Determine dominant emotion for this slang term
        dominant_emotion = 'neutral'
        if data['emotions']:
            # Count emotion occurrences and get most common
            from collections import Counter
            emotion_counter = Counter(data['emotions'])
            dominant_emotion = emotion_counter.most_common(1)[0][0]
        
        # Calculate growth percentage
        if data['older_count'] > 0:
            growth = ((data['recent_count'] - data['older_count']) / data['older_count']) * 100
        else:
            growth = 0 if data['recent_count'] == 0 else 100
        
        slang_analysis.append({
            'term': term,
            'meaning': data['meaning'],
            'usage_count': data['count'],
            'posts': len(data['posts']),
            'avg_engagement': round(avg_engagement, 2),
            'growth': round(growth, 1),
            'emotion': dominant_emotion
        })
    
    # Sort based on sort_by parameter
    if sort_by == 'frequency':
        slang_analysis.sort(key=lambda x: x['usage_count'], reverse=True)
    elif sort_by == 'engagement':
        slang_analysis.sort(key=lambda x: x['avg_engagement'], reverse=True)
    elif sort_by == 'growth':
        slang_analysis.sort(key=lambda x: x['growth'], reverse=True)
    
    # Calculate overall growth rate
    total_recent = sum(d['recent_count'] for d in slang_data.values())
    total_older = sum(d['older_count'] for d in slang_data.values())
    overall_growth = ((total_recent - total_older) / total_older * 100) if total_older > 0 else 0
    
    # Platform usage breakdown
    platform_usage = {}
    for platform_name in ['twitter', 'instagram']:
        platform_posts = [p for p in posts if p.social_account and p.social_account.platform == platform_name]
        platform_posts_with_slang = [
            p for p in platform_posts 
            if p.detected_slang and isinstance(p.detected_slang, list) and len(p.detected_slang) > 0
        ]
        
        if len(platform_posts) > 0:
            percentage = (len(platform_posts_with_slang) / len(platform_posts)) * 100
            platform_usage[platform_name] = {
                'total': len(platform_posts),
                'with_slang': len(platform_posts_with_slang),
                'percentage': round(percentage, 1)
            }
    
    # Calculate total slang terms (sum of all frequencies)
    total_slang_count = sum(data['count'] for data in slang_data.values())
    
    # Get top slang term
    top_slang_term = slang_analysis[0]['term'] if slang_analysis else "N/A"
    
    # Format emoji emotion map for frontend
    emoji_data = [
        {
            'emoji': emoji,
            'count': data['count'],
            'emotion': data['emotion']
        }
        for emoji, data in sorted(emoji_emotion_map.items(), key=lambda x: x[1]['count'], reverse=True)[:20]
    ]
    
    return {
        "total_slang_count": total_slang_count,
        "total_emoji_count": total_emoji_count,
        "top_slang_term": top_slang_term,
        "slang_analysis": slang_analysis,
        "emoji_emotion_map": emoji_data,
        "unique_terms": len(slang_data)
    }

@router.get("/dashboard/negative-triggers")
def get_negative_triggers(
    date_range: int = 30,
    platform: str = "all",
    severity: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get posts that triggered negative emotions based on comment analysis.
    A post is flagged as negative if >= 25% of its comments have negative emotions.
    
    Params:
    - date_range: Number of days to look back (default: 30)
    - platform: Filter by platform ('all', 'twitter', 'facebook', etc.)
    - severity: Filter by severity level ('all', 'high', 'medium', 'low')
    """
    # Get user's social accounts
    account_ids = db.query(SocialAccount.id).filter(SocialAccount.user_id == current_user.id).all()
    account_ids = [id[0] for id in account_ids]

    if not account_ids:
        return {
            "negativeTriggers": [],
            "topPosts": [],
            "stats": {
                "totalNegative": 0,
                "negativeRate": 0,
                "highSeverityCount": 0,
                "mediumSeverityCount": 0,
                "lowSeverityCount": 0
            }
        }

    # Define negative emotions
    negative_emotions = ['anger', 'sadness', 'disgust', 'disappointment', 'annoyance', 'fear', 'disapproval']
    
    # Calculate date range
    start_date = datetime.now(timezone.utc) - timedelta(days=date_range)
    
    # Build base query for posts
    posts_query = db.query(Post).filter(
        Post.social_account_id.in_(account_ids),
        Post.created_at >= start_date
    )
    
    # Apply platform filter if specified
    if platform != "all":
        # Get account IDs for the specific platform
        platform_account_ids = db.query(SocialAccount.id).filter(
            SocialAccount.user_id == current_user.id,
            SocialAccount.platform == platform
        ).all()
        platform_account_ids = [id[0] for id in platform_account_ids]
        posts_query = posts_query.filter(Post.social_account_id.in_(platform_account_ids))
    
    posts = posts_query.all()
    
    # Analyze each post based on its comments
    negative_threshold = 0.25  # 25% of comments must be negative
    triggered_posts = []
    
    for post in posts:
        # Get all comments for this post
        comments = db.query(Comment).filter(Comment.post_id == post.id).all()
        
        if not comments or len(comments) == 0:
            continue
        
        # Calculate percentage of negative comments
        negative_comment_count = sum(
            1 for c in comments 
            if c.dominant_emotion and c.dominant_emotion in negative_emotions
        )
        
        negative_percentage = negative_comment_count / len(comments) if len(comments) > 0 else 0
        
        # Only flag if negative percentage exceeds threshold
        if negative_percentage >= negative_threshold:
            # Calculate trigger score based on engagement and negative percentage
            engagement = calculate_engagement(post)
            trigger_score = (negative_percentage * 100) + (engagement * 0.1)
            
            # Determine severity based on negative percentage
            if negative_percentage >= 0.6:  # 60%+ negative
                severity_level = 'high'
            elif negative_percentage >= 0.4:  # 40-60% negative
                severity_level = 'medium'
            else:  # 25-40% negative
                severity_level = 'low'
            
            triggered_posts.append({
                "id": post.id,
                "content": post.content,
                "platform": post.social_account.platform if post.social_account else "twitter",
                "created_at": post.created_at_platform.isoformat() if post.created_at_platform else post.created_at.isoformat(),
                "likes_count": post.likes_count or 0,
                "retweets_count": post.retweets_count or 0,
                "replies_count": post.replies_count or 0,
                "engagement": engagement,
                "dominant_emotion": post.dominant_emotion,
                "emotion_scores": post.emotion_scores,
                "triggerScore": trigger_score,
                "severity": severity_level,
                "negativePercentage": negative_percentage * 100,
                "totalComments": len(comments),
                "negativeComments": negative_comment_count
            })
    
    # Sort by trigger score
    triggered_posts.sort(key=lambda x: x['triggerScore'], reverse=True)
    
    # Apply severity filter
    if severity != "all":
        triggered_posts = [p for p in triggered_posts if p['severity'] == severity]
    
    # Calculate stats
    total_posts = len(posts)
    total_negative = len(triggered_posts)
    negative_rate = (total_negative / total_posts * 100) if total_posts > 0 else 0
    
    high_severity = sum(1 for p in triggered_posts if p['severity'] == 'high')
    medium_severity = sum(1 for p in triggered_posts if p['severity'] == 'medium')
    low_severity = sum(1 for p in triggered_posts if p['severity'] == 'low')
    
    return {
        "negativeTriggers": triggered_posts,
        "topPosts": [
            {
                "id": p.id,
                "content": p.content,
                "platform": p.social_account.platform if p.social_account else "twitter",
                "created_at": p.created_at_platform.isoformat() if p.created_at_platform else p.created_at.isoformat(),
                "engagement": calculate_engagement(p)
            }
            for p in posts[:20]
        ],
        "stats": {
            "totalNegative": total_negative,
            "negativeRate": round(negative_rate, 1),
            "highSeverityCount": high_severity,
            "mediumSeverityCount": medium_severity,
            "lowSeverityCount": low_severity
        }
    }

@router.get("/post-comments/{post_id}")
def get_post_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all comments for a specific post with emotion analysis and comprehensive stats
    """
    try:
        # Get user's social accounts
        account_ids = db.query(SocialAccount.id).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        account_ids = [id[0] for id in account_ids]

        if not account_ids:
            return {
                "post": None,
                "comments": [],
                "total_comments": 0,
                "stats": {},
                "error": "No social accounts found"
            }

        # Verify the post belongs to the user
        post = db.query(Post).filter(
            Post.id == post_id,
            Post.social_account_id.in_(account_ids)
        ).first()

        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        # Get all comments for this post
        comments = db.query(Comment).filter(
            Comment.post_id == post_id
        ).order_by(Comment.created_at_platform.desc()).all()

        # Format post data
        post_data = {
            "id": post.id,
            "content": post.content,
            "platform": post.social_account.platform if post.social_account else "twitter",
            "created_at_platform": post.created_at_platform.isoformat() if post.created_at_platform else None,
            "likes_count": post.likes_count or 0,
            "retweets_count": post.retweets_count or 0,
            "replies_count": post.replies_count or 0,
            "dominant_emotion": post.dominant_emotion,
            "emotion_scores": post.emotion_scores,
            "sentiment_score": post.sentiment_score
        }

        # Format comments data and calculate stats
        comments_data = []
        total_likes = 0
        sentiment_scores = []
        emotion_counts = {}
        
        for comment in comments:
            # Add to stats calculations
            total_likes += comment.likes_count or 0
            if comment.sentiment_score is not None:
                sentiment_scores.append(comment.sentiment_score)
            if comment.dominant_emotion:
                emotion_counts[comment.dominant_emotion] = emotion_counts.get(comment.dominant_emotion, 0) + 1
            
            comments_data.append({
                "id": comment.id,
                "author_username": comment.author_username,
                "content": comment.content,
                "created_at_platform": comment.created_at_platform.isoformat() if comment.created_at_platform else None,
                "likes_count": comment.likes_count or 0,
                "dominant_emotion": comment.dominant_emotion,
                "emotion_scores": comment.emotion_scores,
                "sentiment_score": comment.sentiment_score,
                "detected_slang": comment.detected_slang
            })

        # Calculate aggregate stats
        stats = {
            "total_comments": len(comments_data),
            "total_likes": total_likes,
            "avg_sentiment": sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0,
            "dominant_emotion": max(emotion_counts.items(), key=lambda x: x[1])[0] if emotion_counts else "neutral",
            "emotion_breakdown": emotion_counts
        }

        return {
            "post": post_data,
            "comments": comments_data,
            "stats": stats
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting post comments: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving comments: {str(e)}")


@router.get("/post-negative-comments/{post_id}")
def get_post_negative_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all negative comments for a specific post with detailed emotion analysis.
    Returns comments that have negative emotions (anger, sadness, disgust, etc.)
    """
    try:
        # Get user's social accounts
        account_ids = db.query(SocialAccount.id).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        account_ids = [id[0] for id in account_ids]

        if not account_ids:
            return {
                "post": None,
                "negativeComments": [],
                "totalComments": 0,
                "negativeCount": 0,
                "negativePercentage": 0,
                "stats": {},
                "error": "No social accounts found"
            }

        # Verify the post belongs to the user
        post = db.query(Post).filter(
            Post.id == post_id,
            Post.social_account_id.in_(account_ids)
        ).first()

        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        # Define negative emotions
        negative_emotions = ['anger', 'sadness', 'disgust', 'disappointment', 'annoyance', 'fear', 'disapproval', 'embarrassment', 'grief', 'nervousness', 'remorse']

        # Get all comments for this post
        all_comments = db.query(Comment).filter(
            Comment.post_id == post_id
        ).all()

        # Filter for negative comments
        negative_comments = [
            c for c in all_comments 
            if c.dominant_emotion and c.dominant_emotion in negative_emotions
        ]

        # Sort by sentiment score (most negative first)
        negative_comments.sort(
            key=lambda x: x.sentiment_score if x.sentiment_score is not None else 0
        )

        # Format post data
        post_data = {
            "id": post.id,
            "content": post.content,
            "platform": post.social_account.platform if post.social_account else "twitter",
            "created_at_platform": post.created_at_platform.isoformat() if post.created_at_platform else None,
            "likes_count": post.likes_count or 0,
            "retweets_count": post.retweets_count or 0,
            "replies_count": post.replies_count or 0,
            "dominant_emotion": post.dominant_emotion,
            "emotion_scores": post.emotion_scores,
            "sentiment_score": post.sentiment_score
        }

        # Format negative comments data
        comments_data = []
        total_likes = 0
        sentiment_scores = []
        emotion_counts = {}
        
        for comment in negative_comments:
            # Add to stats calculations
            total_likes += comment.likes_count or 0
            if comment.sentiment_score is not None:
                sentiment_scores.append(comment.sentiment_score)
            if comment.dominant_emotion:
                emotion_counts[comment.dominant_emotion] = emotion_counts.get(comment.dominant_emotion, 0) + 1
            
            comments_data.append({
                "id": comment.id,
                "author_username": comment.author_username,
                "content": comment.content,
                "created_at_platform": comment.created_at_platform.isoformat() if comment.created_at_platform else None,
                "likes_count": comment.likes_count or 0,
                "dominant_emotion": comment.dominant_emotion,
                "emotion_scores": comment.emotion_scores,
                "sentiment_score": comment.sentiment_score,
                "detected_slang": comment.detected_slang
            })

        # Calculate aggregate stats
        total_comments_count = len(all_comments)
        negative_count = len(negative_comments)
        negative_percentage = (negative_count / total_comments_count * 100) if total_comments_count > 0 else 0

        stats = {
            "totalComments": total_comments_count,
            "negativeCount": negative_count,
            "negativePercentage": round(negative_percentage, 1),
            "totalLikes": total_likes,
            "avgSentiment": sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0,
            "dominantEmotion": max(emotion_counts.items(), key=lambda x: x[1])[0] if emotion_counts else "neutral",
            "emotionBreakdown": emotion_counts
        }

        return {
            "post": post_data,
            "negativeComments": comments_data,
            "stats": stats
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting negative comments: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving negative comments: {str(e)}")

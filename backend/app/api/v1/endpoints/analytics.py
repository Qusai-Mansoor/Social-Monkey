from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
import re

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.models import User, SocialAccount, Post

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
    Trigger analysis for existing posts that haven't been analyzed yet.
    """
    from app.analysis.emotion_engine import analyze_emotion
    from app.analysis.slang_detector import slang_detector

    # Get user's social accounts
    account_ids = db.query(SocialAccount.id).filter(SocialAccount.user_id == current_user.id).all()
    account_ids = [id[0] for id in account_ids]
    
    if not account_ids:
        return {"message": "No social accounts found", "updated_count": 0}

    # Fetch posts that need analysis (where emotion_scores is null)
    posts = db.query(Post).filter(
        Post.social_account_id.in_(account_ids),
        Post.emotion_scores == None
    ).all()
    
    updated_count = 0
    for post in posts:
        # Analyze Emotion
        emotion_result = analyze_emotion(post.content)
        post.emotion_scores = emotion_result["scores"]
        post.dominant_emotion = emotion_result["dominant"]
        post.sentiment_score = emotion_result["sentiment_score"]
        
        # Analyze Slang
        slang_result = slang_detector.detect(post.content)
        post.detected_slang = slang_result
        
        updated_count += 1
        
    db.commit()
    
    return {"message": "Analysis complete", "updated_count": updated_count}

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
            if slang_data and isinstance(slang_data, dict) and slang_data.get("found_slang"):
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
            # Use stored slang data
            slang_data = post.detected_slang
            if slang_data and isinstance(slang_data, dict):
                # Assuming structure from slang_detector
                total_slang_terms += slang_data.get('total_count', 0)
            
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
    """Get Gen-Z slang analysis of user's posts (Real Data)"""
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
        
        for post in posts:
            # Use stored slang data
            slang_data = post.detected_slang
            if slang_data and isinstance(slang_data, dict):
                # Assuming structure: {"found_slang": ["term1", "term2"], "total_count": 2}
                found_slang = slang_data.get("found_slang", [])
                total_slang_terms += len(found_slang)
                
                for term in found_slang:
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
            slang_data = post.detected_slang or {}
            slang_terms = slang_data.get("found_slang", []) if isinstance(slang_data, dict) else []
            
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the most frequently used slang terms.
    Returns: [{"term": "no cap", "count": 10, "meaning": "..."}, ...]
    """
    # Get user's social accounts
    account_ids = db.query(SocialAccount.id).filter(SocialAccount.user_id == current_user.id).all()
    account_ids = [id[0] for id in account_ids]
    
    if not account_ids:
        return []

    # Fetch posts with detected slang
    posts = db.query(Post.detected_slang)\
        .filter(Post.social_account_id.in_(account_ids))\
        .filter(Post.detected_slang != None).all()
    
    slang_counts = {}
    slang_meanings = {}
    
    for post in posts:
        # post.detected_slang is a list of dicts: [{"term": "no cap", "meaning": "..."}]
        if post.detected_slang:
            for item in post.detected_slang: 
                term = item.get('term')
                if term:
                    slang_counts[term] = slang_counts.get(term, 0) + 1
                    if term not in slang_meanings:
                        slang_meanings[term] = item.get('meaning', '')
            
    # Sort by count descending
    sorted_slang = sorted(slang_counts.items(), key=lambda x: x[1], reverse=True)
    
    return [
        {"term": term, "count": count, "meaning": slang_meanings.get(term, "")} 
        for term, count in sorted_slang[:20]  # Top 20
    ]

@router.get("/dashboard/negative-triggers")
def get_negative_triggers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get posts that triggered negative emotions (anger, sadness, disgust).
    """
    # Get user's social accounts
    account_ids = db.query(SocialAccount.id).filter(SocialAccount.user_id == current_user.id).all()
    account_ids = [id[0] for id in account_ids]
    
    if not account_ids:
        return []

    negative_emotions = ['anger', 'sadness', 'disgust', 'disappointment', 'annoyance']
    
    posts = db.query(Post)\
        .filter(Post.social_account_id.in_(account_ids))\
        .filter(Post.dominant_emotion.in_(negative_emotions))\
        .order_by(desc(Post.created_at))\
        .limit(20)\
        .all()
        
    return [
        {
            "id": post.id,
            "content": post.content,
            "dominant_emotion": post.dominant_emotion,
            "emotion_scores": post.emotion_scores,
            "created_at": post.created_at
        }
        for post in posts
    ]

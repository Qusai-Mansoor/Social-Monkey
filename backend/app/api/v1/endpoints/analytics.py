from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any
from datetime import datetime, timedelta
import re

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.models import User, SocialAccount, Post

router = APIRouter()

# Gen-Z Slang Dictionary for analysis
GEN_Z_SLANG = {
    # Communication & Reactions
    'no cap': 'no lie, for real',
    'cap': 'lie, false',
    'bet': 'yes, okay, sure',
    'say less': 'I understand, say no more',
    'periodt': 'period, end of discussion',
    'facts': 'true, agree',
    'fr': 'for real',
    'ngl': 'not gonna lie',
    'tbh': 'to be honest',
    'ong': 'on god',
    'deadass': 'seriously, for real',
    
    # Positive/Approval
    'bussin': 'really good, amazing',
    'slaps': 'really good',
    'fire': 'awesome, cool',
    'lit': 'exciting, fun',
    'slayed': 'did amazing',
    'ate': 'did really well',
    'served': 'delivered perfectly',
    'understood the assignment': 'did exactly what was needed',
    'main character': 'confident, taking charge',
    'vibe': 'mood, feeling',
    'vibes': 'good feelings',
    
    # Negative/Disapproval
    'mid': 'mediocre, average',
    'cringe': 'embarrassing',
    'ick': 'gross, unappealing',
    'sus': 'suspicious',
    'toxic': 'harmful, negative',
    'clown': 'foolish person',
    'pressed': 'upset, bothered',
    'salty': 'bitter, upset',
    'triggered': 'upset, offended',
    
    # Social Media Specific
    'ratio': 'getting more replies than likes',
    'stan': 'big fan of',
    'simp': 'overly devoted to someone',
    'ship': 'support a relationship',
    'tea': 'gossip, drama',
    'spill': 'tell the gossip',
    'cancel': 'boycott someone',
    'touch grass': 'go outside, get offline',
    'chronically online': 'spends too much time online',
    
    # Lifestyle & Personality
    'aesthetic': 'visual style, vibe',
    'energy': 'vibe, attitude',
    'aura': 'personal energy',
    'main character energy': 'confident attitude',
    'pick me': 'seeking attention',
    'npc': 'basic person, no personality',
    'it girl': 'trendy, popular girl',
    'moment': 'perfect time or situation',
    'era': 'phase of life',
    'red flag': 'warning sign',
    'green flag': 'good sign',
    
    # Expressions
    'slay': 'do amazing',
    'queen': 'amazing woman',
    'king': 'amazing man',
    'bestie': 'best friend',
    'bae': 'before anyone else',
    'fam': 'family, close friends',
    'lowkey': 'somewhat, secretly',
    'highkey': 'definitely, obviously',
    'sending me': 'making me laugh',
    'im deceased': 'very funny',
    'not me': 'expressing disbelief',
    'the way': 'emphasis phrase',
    'pls': 'please',
    'ur': 'your',
    'bc': 'because',
    'rn': 'right now',
    'af': 'as f***',
    'asf': 'as f***',
    'istg': 'I swear to god',
    'lmao': 'laughing my ass off',
    'lmfao': 'laughing my f***ing ass off',
    'idk': 'I don\'t know',
    'wdym': 'what do you mean',
    'omg': 'oh my god',
    'wtf': 'what the f***',
    'bruh': 'expressing disbelief',
    'oop': 'oops, awkward',
    'yikes': 'expression of concern',
    'oof': 'expression of pain/sympathy'
}

def analyze_slang(text: str) -> List[str]:
    """Analyze text for Gen-Z slang terms"""
    found_slang = []
    lower_text = text.lower()
    
    for term in GEN_Z_SLANG.keys():
        # Use word boundaries to match whole words/phrases
        pattern = rf'\b{re.escape(term)}\b'
        if re.search(pattern, lower_text, re.IGNORECASE):
            found_slang.append(term)
    
    return found_slang

def analyze_emotion(text: str) -> str:
    """Simple emotion analysis based on keywords"""
    positive_words = ['good', 'great', 'awesome', 'amazing', 'love', 'happy', 'excellent', 
                     'wonderful', 'fantastic', 'perfect', 'best', 'beautiful', 'incredible', 
                     'outstanding', 'brilliant', 'superb', 'magnificent', 'terrific']
    
    negative_words = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'horrible', 
                     'worst', 'disgusting', 'annoying', 'stupid', 'ugly', 'boring', 
                     'pathetic', 'miserable', 'dreadful', 'appalling']
    
    lower_text = text.lower()
    positive_score = sum(1 for word in positive_words if word in lower_text)
    negative_score = sum(1 for word in negative_words if word in lower_text)
    
    if positive_score > negative_score:
        return 'positive'
    elif negative_score > positive_score:
        return 'negative'
    else:
        return 'neutral'

def calculate_engagement(post: Post) -> int:
    """Calculate total engagement for a post"""
    return (post.likes_count or 0) + (post.retweets_count or 0) + (post.replies_count or 0)

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
            slang_terms = analyze_slang(post.content)
            total_slang_terms += len(slang_terms)
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get emotion analysis of user's posts"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return {
                "emotions": {"positive": 0, "neutral": 0, "negative": 0},
                "total_analyzed": 0
            }
        
        account_ids = [account.id for account in accounts]
        
        # Get all posts
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()
        
        emotions = {"positive": 0, "neutral": 0, "negative": 0}
        
        for post in posts:
            emotion = analyze_emotion(post.content)
            emotions[emotion] += 1
        
        return {
            "emotions": emotions,
            "total_analyzed": len(posts)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing emotions: {str(e)}")

@router.get("/slang-analysis")
def get_slang_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Gen-Z slang analysis of user's posts"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return {
                "slang_frequency": {},
                "total_slang_terms": 0,
                "unique_terms": 0
            }
        
        account_ids = [account.id for account in accounts]
        
        # Get all posts
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()
        
        slang_frequency = {}
        total_slang_terms = 0
        
        for post in posts:
            slang_terms = analyze_slang(post.content)
            total_slang_terms += len(slang_terms)
            
            for term in slang_terms:
                slang_frequency[term] = slang_frequency.get(term, 0) + 1
        
        return {
            "slang_frequency": dict(sorted(slang_frequency.items(), key=lambda x: x[1], reverse=True)),
            "total_slang_terms": total_slang_terms,
            "unique_terms": len(slang_frequency)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing slang: {str(e)}")

@router.get("/top-posts")
def get_top_posts(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top performing posts by engagement"""
    try:
        # Get user's social accounts
        accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id
        ).all()
        
        if not accounts:
            return []
        
        account_ids = [account.id for account in accounts]
        
        # Get posts ordered by engagement
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids)
        ).all()
        
        # Calculate engagement and sort
        posts_with_engagement = []
        for post in posts:
            engagement = calculate_engagement(post)
            emotion = analyze_emotion(post.content)
            slang_terms = analyze_slang(post.content)
            
            posts_with_engagement.append({
                "id": post.id,
                "content": post.content,
                "likes_count": post.likes_count or 0,
                "retweets_count": post.retweets_count or 0,
                "replies_count": post.replies_count or 0,
                "engagement": engagement,
                "emotion": emotion,
                "slang_terms": slang_terms,
                "created_at": post.created_at.isoformat() if post.created_at else None,
                "platform_post_id": post.platform_post_id
            })
        
        # Sort by engagement and return top posts
        top_posts = sorted(posts_with_engagement, key=lambda x: x["engagement"], reverse=True)[:limit]
        
        return top_posts
        
    except Exception as e:
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
        
        # Get posts from the last N days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids),
            Post.created_at >= start_date,
            Post.created_at <= end_date
        ).all()
        
        # Group by date and calculate average engagement
        daily_engagement = {}
        daily_counts = {}
        
        for post in posts:
            if not post.created_at:
                continue
                
            date_str = post.created_at.date().isoformat()
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
        
        # Get posts from the last N days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        posts = db.query(Post).filter(
            Post.social_account_id.in_(account_ids),
            Post.created_at >= start_date,
            Post.created_at <= end_date
        ).all()
        
        # Group by date and count posts
        daily_counts = {}
        
        for post in posts:
            if not post.created_at:
                continue
                
            date_str = post.created_at.date().isoformat()
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
        
        for post in posts:
            # Emotion analysis
            emotion = analyze_emotion(post.content)
            emotions[emotion] += 1
            
            # Slang analysis
            slang_terms = analyze_slang(post.content)
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
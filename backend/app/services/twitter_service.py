import tweepy
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import SocialAccount, Post, Comment
from app.utils.encryption import token_encryption
from app.utils.preprocessing import text_preprocessor


class TwitterService:
    """Service for Twitter OAuth and data ingestion"""
    
    def __init__(self):
        self.client_id = settings.TWITTER_CLIENT_ID
        self.client_secret = settings.TWITTER_CLIENT_SECRET
        self.callback_url = settings.TWITTER_CALLBACK_URL
        self.bearer_token = settings.TWITTER_BEARER_TOKEN
        self.auth_url = ""
    def get_oauth_url(self, state: str = None) -> str:
        """
        Generate Twitter OAuth 2.0 authorization URL
        
        Steps to implement:
        1. Create OAuth2UserHandler with client_id, redirect_uri, and scopes
        2. Generate authorization URL
        3. Return URL for user to authorize
        
        Scopes needed: tweet.read, users.read, offline.access
        """
        oauth2_user_handler = tweepy.OAuth2UserHandler(
            client_id=self.client_id,
            redirect_uri=self.callback_url,
            scope=["tweet.read", "users.read", "offline.access"],
            client_secret=self.client_secret
        )
        self.auth_url = oauth2_user_handler.get_authorization_url()
        return self.auth_url

    async def handle_callback(
        self, 
        code: str, 
        user_id: int, 
        db: Session
    ) -> SocialAccount:
        """
        Handle OAuth callback and exchange code for tokens
        
        Steps:
        1. Exchange authorization code for access token
        2. Get user info from Twitter API
        3. Encrypt tokens
        4. Store in database
        """
        # Exchange code for token
        oauth2_user_handler = tweepy.OAuth2UserHandler(
            client_id=self.client_id,
            redirect_uri=self.callback_url,
            scope=["tweet.read", "users.read", "offline.access"],
            client_secret=self.client_secret
        )
        try:
            access_token = oauth2_user_handler.fetch_token(
                authorization_response=f"{self.callback_url}?code={code}&code_verifier=challenge&client_secret={self.client_secret}&grant_type=authorization_code&redirect_uri={self.callback_url}",
            )
        except Exception as e:
            raise ValueError(f"Error fetching access token: {e}")
        # Create client with access token
        client = tweepy.Client(bearer_token=access_token['access_token'])
        
        # Get user info
        user_info = client.get_me()
        
        # Encrypt tokens
        encrypted_access_token = token_encryption.encrypt(access_token['access_token'])
        encrypted_refresh_token = token_encryption.encrypt(
            access_token.get('refresh_token', '')
        ) if access_token.get('refresh_token') else None
        
        # Check if account already exists
        existing_account = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == "twitter",
            SocialAccount.platform_user_id == str(user_info.data.id)
        ).first()
        
        if existing_account:
            # Update existing account
            existing_account.access_token = encrypted_access_token
            existing_account.refresh_token = encrypted_refresh_token
            existing_account.platform_username = user_info.data.username
            existing_account.is_active = True
            db.commit()
            db.refresh(existing_account)
            return existing_account
        
        # Create new social account
        social_account = SocialAccount(
            user_id=user_id,
            platform="twitter",
            platform_user_id=str(user_info.data.id),
            platform_username=user_info.data.username,
            access_token=encrypted_access_token,
            refresh_token=encrypted_refresh_token,
            is_active=True
        )
        
        db.add(social_account)
        db.commit()
        db.refresh(social_account)
        
        return social_account
    
    async def fetch_user_tweets(
        self, 
        social_account: SocialAccount, 
        db: Session,
        max_results: int = 100
    ) -> Dict[str, int]:
        """
        Fetch user's tweets and store in database
        
        Steps:
        1. Decrypt access token
        2. Create Twitter client
        3. Fetch user's tweets with metrics
        4. Store raw data and preprocess
        5. Return counts
        """
        # Decrypt token
        access_token = token_encryption.decrypt(social_account.access_token)
        
        # Create client
        client = tweepy.Client(bearer_token=access_token)
        
        # Fetch tweets
        tweets = client.get_users_tweets(
            id=social_account.platform_user_id,
            max_results=max_results,
            tweet_fields=['created_at', 'public_metrics', 'lang'],
            exclude=['retweets', 'replies']
        )
        
        posts_created = 0
        
        if tweets.data:
            for tweet in tweets.data:
                # Check if post already exists
                existing_post = db.query(Post).filter(
                    Post.platform_post_id == str(tweet.id)
                ).first()
                
                if existing_post:
                    continue
                
                # Preprocess content
                preprocessed_text, language = text_preprocessor.preprocess(tweet.text)
                
                # Create post
                post = Post(
                    social_account_id=social_account.id,
                    platform_post_id=str(tweet.id),
                    content=tweet.text,
                    raw_data=tweet.data,
                    preprocessed_content=preprocessed_text,
                    language=language or tweet.lang,
                    created_at_platform=tweet.created_at,
                    likes_count=tweet.public_metrics.get('like_count', 0),
                    retweets_count=tweet.public_metrics.get('retweet_count', 0),
                    replies_count=tweet.public_metrics.get('reply_count', 0),
                    is_preprocessed=True
                )
                
                db.add(post)
                posts_created += 1
            
            db.commit()
        
        return {"posts_created": posts_created}
    
    async def fetch_tweet_replies(
        self,
        post: Post,
        social_account: SocialAccount,
        db: Session,
        max_results: int = 100
    ) -> int:
        """
        Fetch replies to a specific tweet
        
        Steps:
        1. Search for tweets that are replies to the given tweet
        2. Store replies as comments
        3. Preprocess and return count
        """
        # Decrypt token
        access_token = token_encryption.decrypt(social_account.access_token)
        
        # Create client
        client = tweepy.Client(bearer_token=access_token)
        
        # Search for replies
        query = f"conversation_id:{post.platform_post_id}"
        
        try:
            replies = client.search_recent_tweets(
                query=query,
                max_results=max_results,
                tweet_fields=['created_at', 'public_metrics', 'author_id'],
            )
            
            comments_created = 0
            
            if replies.data:
                for reply in replies.data:
                    # Skip if it's the original tweet
                    if str(reply.id) == post.platform_post_id:
                        continue
                    
                    # Check if comment already exists
                    existing_comment = db.query(Comment).filter(
                        Comment.platform_comment_id == str(reply.id)
                    ).first()
                    
                    if existing_comment:
                        continue
                    
                    # Preprocess content
                    preprocessed_text, language = text_preprocessor.preprocess(reply.text)
                    
                    # Get author username (you may need to fetch user details)
                    author_username = f"user_{reply.author_id}"
                    
                    # Create comment
                    comment = Comment(
                        post_id=post.id,
                        platform_comment_id=str(reply.id),
                        author_username=author_username,
                        content=reply.text,
                        raw_data=reply.data,
                        preprocessed_content=preprocessed_text,
                        language=language,
                        created_at_platform=reply.created_at,
                        likes_count=reply.public_metrics.get('like_count', 0),
                        is_preprocessed=True
                    )
                    
                    db.add(comment)
                    comments_created += 1
                
                db.commit()
                
            return comments_created
            
        except Exception as e:
            print(f"Error fetching replies: {e}")
            return 0


# Global instance
twitter_service = TwitterService()

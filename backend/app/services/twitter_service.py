import os
import tweepy
import hashlib
import base64
import requests
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import SocialAccount, Post, Comment
from app.utils.encryption import token_encryption
from app.utils.preprocessing import text_preprocessor
from fastapi import Request
import secrets
from sqlalchemy import Column, String, DateTime
from app.db.session import Base
from app.models.models import OAuthState






class TwitterService:
    """Service for Twitter OAuth and data ingestion"""
    
    def __init__(self):
        # Allow insecure transport for development/testing
        os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
        
        self.client_id = settings.TWITTER_CLIENT_ID
        self.client_secret = settings.TWITTER_CLIENT_SECRET
        self.callback_url = settings.TWITTER_CALLBACK_URL
        self.bearer_token = settings.TWITTER_BEARER_TOKEN
        self.oauth_handler = None  # Store the handler to maintain state
        
        # Rate limiting tracking - persistent across requests
        self.rate_limit_file = Path("twitter_rate_limits.json")
        self.rate_limit_window = 900  # 15 minutes in seconds
        self._load_rate_limits()
    
    def _load_rate_limits(self):
        """Load rate limits from persistent file"""
        if self.rate_limit_file.exists():
            try:
                with open(self.rate_limit_file, 'r') as f:
                    data = json.load(f)
                    # Load tweet fetching rate limits
                    self.last_tweet_request = datetime.fromisoformat(data.get('last_tweet_request', '2000-01-01T00:00:00'))
                    self.tweet_request_count = data.get('tweet_request_count', 0)
                    # Load reply searching rate limits (separate endpoint)
                    self.last_reply_request = datetime.fromisoformat(data.get('last_reply_request', '2000-01-01T00:00:00'))
                    self.reply_request_count = data.get('reply_request_count', 0)
            except Exception as e:
                print(f"Error loading rate limits: {e}")
                self._reset_rate_limits()
        else:
            self._reset_rate_limits()
    
    def _reset_rate_limits(self):
        """Reset rate limit counters"""
        self.last_tweet_request = datetime.min
        self.tweet_request_count = 0
        self.last_reply_request = datetime.min
        self.reply_request_count = 0
    
    def _save_rate_limits(self):
        """Save rate limits to persistent file"""
        data = {
            'last_tweet_request': self.last_tweet_request.isoformat(),
            'tweet_request_count': self.tweet_request_count,
            'last_reply_request': self.last_reply_request.isoformat(),
            'reply_request_count': self.reply_request_count
        }
        try:
            with open(self.rate_limit_file, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            print(f"Error saving rate limits: {e}")
    
    def _check_rate_limit(self) -> bool:
        """DEPRECATED: Use _check_tweet_rate_limit or _check_reply_rate_limit instead"""
        return self._check_tweet_rate_limit()
    
    def _check_tweet_rate_limit(self) -> bool:
        """Check if we can make a tweet fetch request"""
        now = datetime.now()
        max_requests = 100  # Conservative limit (Twitter allows 180 per 15 min)
        
        # Reset counter if window has passed
        if (now - self.last_tweet_request).total_seconds() >= self.rate_limit_window:
            self.tweet_request_count = 0
            self.last_tweet_request = now
            self._save_rate_limits()
            return True
        
        # Check if we're under the limit
        if self.tweet_request_count < max_requests:
            self.tweet_request_count += 1
            self.last_tweet_request = now
            self._save_rate_limits()
            return True
        
        # Rate limit exceeded
        return False
    
    def _check_reply_rate_limit(self) -> bool:
        """Check if we can make a reply search request"""
        now = datetime.now()
        max_requests = 50  # Very conservative for search endpoint (Twitter allows 180 but shared across app)
        
        # Reset counter if window has passed
        if (now - self.last_reply_request).total_seconds() >= self.rate_limit_window:
            self.reply_request_count = 0
            self.last_reply_request = now
            self._save_rate_limits()
            return True
        
        # Check if we're under the limit
        if self.reply_request_count < max_requests:
            self.reply_request_count += 1
            self.last_reply_request = now
            self._save_rate_limits()
            return True
        
        # Rate limit exceeded
        return False

    def _generate_code_verifier(self) -> str:
        """Generate a code verifier for PKCE"""
        return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')

    def _generate_code_challenge(self, code_verifier: str) -> str:
        """Generate a code challenge from code verifier"""
        digest = hashlib.sha256(code_verifier.encode('utf-8')).digest()
        return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')

    def get_oauth_url(self, db: Session, request: Request, user_id: int) -> str:
        """Generate Twitter OAuth 2.0 authorization URL"""
        
        # Generate PKCE parameters
        code_verifier = self._generate_code_verifier()
        code_challenge = self._generate_code_challenge(code_verifier)
        state = secrets.token_urlsafe(32)
        
        # Store the code verifier, state, and user_id in database
        oauth_state = OAuthState(
            state=state,
            code_verifier=code_verifier,  # Store the actual code_verifier, not code_challenge
            user_id=user_id  # Store user_id so we can retrieve it in callback
        )
        db.add(oauth_state)
        db.commit()
        
        # Build authorization URL manually
        auth_url = (
            f"https://twitter.com/i/oauth2/authorize"
            f"?response_type=code"
            f"&client_id={self.client_id}"
            f"&redirect_uri={self.callback_url}"
            f"&scope=tweet.read users.read offline.access"
            f"&state={state}"
            f"&code_challenge={code_challenge}"
            f"&code_challenge_method=S256"
        )
        
        return auth_url

    async def handle_callback(
        self, 
        code: str, 
        state: Optional[str],
        user_id: int, 
        request: Request,
        db: Session
    ) -> SocialAccount:
        """Handle OAuth callback and exchange code for tokens"""
        
        try:
            # Retrieve code verifier from database using state
            oauth_state = db.query(OAuthState).filter(OAuthState.state == state).first()
            if not oauth_state:
                raise ValueError("Missing OAuth state")
            
            import base64
        
            # Create Basic Auth header
            credentials = f"{self.client_id}:{self.client_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
                
            print(f"Code: {code}, State: {state}, Code Verifier from DB: {oauth_state.code_verifier}")

            # Preparing data to send to twitter to get access token
            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {encoded_credentials}"
            }
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self.callback_url,
                "code_verifier": oauth_state.code_verifier  # This is now the correct code_verifier
            }

            response = requests.post("https://api.twitter.com/2/oauth2/token", headers=headers, data=data)
            
            if response.status_code != 200:
                print(f"Token exchange failed: {response.status_code} - {response.text}")
                raise ValueError(f"Token exchange failed: {response.text}")
            
            access_token = response.json()
            
            # Clean up the OAuth state after successful token exchange
            db.delete(oauth_state)
            db.commit()
            
            if not access_token or 'access_token' not in access_token:
                raise ValueError("Failed to obtain access token")
            else:
                print("Access token obtained successfully, access token:", access_token)

            # Create client with access token
            client = tweepy.Client(bearer_token=access_token['access_token'], consumer_key=self.client_id, consumer_secret=self.client_secret)
            print("Tweepy client created successfully")
            # Get user info
            user_info = client.get_me(user_auth=False)
            print("User info fetched:", user_info)
            # Encrypt tokens
            encrypted_access_token = token_encryption.encrypt(access_token['access_token'])
            encrypted_refresh_token = None
            if access_token.get('refresh_token'):
                encrypted_refresh_token = token_encryption.encrypt(access_token['refresh_token'])
            
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
            
        except Exception as e:
            raise ValueError(f"Error fetching access token: {e}")











    async def fetch_user_tweets(
        self, 
        social_account: SocialAccount, 
        db: Session,
        max_results: int = 50  # Reduced default to avoid rate limits
    ) -> Dict[str, int]:
        """Fetch user's tweets and store in database"""
        # Decrypt token
        access_token = token_encryption.decrypt(social_account.access_token)
        
        # Create client with OAuth access token (not bearer token)
        client = tweepy.Client(
            access_token=access_token,
            access_token_secret=None,  # For OAuth 2.0, this is None
            consumer_key=self.client_id,
            consumer_secret=self.client_secret,
            bearer_token=self.bearer_token
        )
        print("Tweepy client created for fetching tweets")
        
        try:
            # Check rate limits before making the request
            if not self._check_tweet_rate_limit():
                wait_time = (self.last_tweet_request + timedelta(seconds=self.rate_limit_window) - datetime.now()).total_seconds()
                wait_minutes = round(wait_time / 60, 1)
                return {"posts_created": 0, "error": f"Rate limit reached for fetching tweets. Please wait {wait_minutes} minutes before trying again."}

            # Fetch tweets with smaller batch size to avoid rate limits
            tweets = client.get_users_tweets(
                id=social_account.platform_user_id,
                max_results=min(max_results, 10),  # Reduced to 10 to be more conservative
                tweet_fields=['created_at', 'public_metrics', 'lang', 'conversation_id', 'in_reply_to_user_id'],
                exclude=['retweets']  # Remove 'replies' from exclude to get all tweets
            )
        
        except tweepy.TooManyRequests as e:
            # Get the reset time from the response headers
            reset_time = None
            if hasattr(e.response, 'headers') and 'x-rate-limit-reset' in e.response.headers:
                reset_time = datetime.fromtimestamp(int(e.response.headers['x-rate-limit-reset']))
                wait_time = (reset_time - datetime.now()).total_seconds()
                wait_minutes = round(wait_time / 60, 1)
                error_msg = f"Rate limit exceeded. Please wait {wait_minutes} minutes before trying again."
            else:
                error_msg = "Rate limit exceeded. Please wait 15 minutes before trying again."
            
            print(f"Rate limit error: {error_msg}")
            return {"posts_created": 0, "error": error_msg}
            
        except tweepy.Unauthorized as e:
            print(f"Unauthorized access: {e}")
            return {"posts_created": 0, "error": "Unauthorized access. Please re-authenticate."}
        
        
        posts_created = 0
        
        if tweets and tweets.data:
            for tweet in tweets.data:
                # Skip if this is a reply to someone else's tweet
                if tweet.in_reply_to_user_id and str(tweet.in_reply_to_user_id) != social_account.platform_user_id:
                    continue
                
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
                    likes_count=tweet.public_metrics.get('like_count', 0) if tweet.public_metrics else 0,
                    retweets_count=tweet.public_metrics.get('retweet_count', 0) if tweet.public_metrics else 0,
                    replies_count=tweet.public_metrics.get('reply_count', 0) if tweet.public_metrics else 0,
                    is_preprocessed=True
                )
                
                db.add(post)
                posts_created += 1
            
            try:
                db.commit()
                print(f"Successfully created {posts_created} posts")
            except Exception as e:
                db.rollback()
                print(f"Error committing posts to database: {e}")
                return {"posts_created": 0, "error": f"Database error: {str(e)}"}
        else:
            print("No tweets found or empty response")
        
        return {"posts_created": posts_created}
    
    async def fetch_tweet_replies(
        self,
        post: Post,
        social_account: SocialAccount,
        db: Session,
        max_results: int = 20  # Reduced to avoid rate limits
    ) -> int:
        """Fetch replies to a specific tweet"""
        # Decrypt token
        access_token = token_encryption.decrypt(social_account.access_token)
        
        # Create client with OAuth access token 
        client = tweepy.Client(
            access_token=access_token,
            access_token_secret=None,
            consumer_key=self.client_id,
            consumer_secret=self.client_secret,
            bearer_token=self.bearer_token,
            
        )
        print("Tweepy client created for fetching replies")
        #print("Rate limit status:", client.rate_limit_status()['resources'])
        # Search for replies
        query = f"conversation_id:{post.platform_post_id}"
        
        try:
            # Check rate limits before making the request
            if not self._check_reply_rate_limit():
                wait_time = (self.last_reply_request + timedelta(seconds=self.rate_limit_window) - datetime.now()).total_seconds()
                wait_minutes = round(wait_time / 60, 1)
                raise ValueError(f"Rate limit reached for searching replies. Please wait {wait_minutes} minutes before trying again.")

            replies = client.search_recent_tweets(
                query=query,
                max_results=min(max_results, 10),  # Reduced to 10 to be more conservative
                tweet_fields=['created_at', 'public_metrics', 'author_id', 'in_reply_to_user_id', 'conversation_id'],
                expansions=['author_id']
            )
        except tweepy.TooManyRequests as e:
            # Get the reset time from the response headers
            reset_time = None
            if hasattr(e.response, 'headers') and 'x-rate-limit-reset' in e.response.headers:
                reset_time = datetime.fromtimestamp(int(e.response.headers['x-rate-limit-reset']))
                wait_time = (reset_time - datetime.now()).total_seconds()
                wait_minutes = round(wait_time / 60, 1)
                error_msg = f"Rate limit exceeded. Please wait {wait_minutes} minutes before trying again."
            else:
                error_msg = str(e)
            print(f"Rate limit error for replies: {error_msg}")
            raise ValueError(error_msg)
        except tweepy.Unauthorized as e:
            print(f"Unauthorized access for replies: {e}")
            raise ValueError(f"Unauthorized access: {str(e)}")
        except Exception as e:
            print(f"Error fetching replies: {e}")
            raise ValueError(f"Error fetching replies: {str(e)}")
        
        comments_created = 0
        
        try:
            if replies and replies.data:
                for reply in replies.data:
                    # Only process if it's actually a reply to the original post
                # or a reply in the same thread
                    if (str(reply.in_reply_to_user_id) != social_account.platform_user_id or 
                        str(reply.conversation_id) != post.platform_post_id):
                        continue
                    
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
                        likes_count=reply.public_metrics.get('like_count', 0) if reply.public_metrics else 0,
                        is_preprocessed=True
                    )
                    
                    db.add(comment)
                    comments_created += 1
                
                db.commit()
                print(f"Successfully created {comments_created} comments")
            else:
                print("No replies found")
            
        except Exception as e:
            db.rollback()
            print(f"Error processing replies: {e}")
            return 0
        
        return comments_created


# Global instance
twitter_service = TwitterService()

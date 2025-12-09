import os
import tweepy
import hashlib
import base64
import requests
import httpx
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
from app.analysis.emotion_engine import analyze_emotion
from app.analysis.slang_normalizer import SlangNormalizer






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
        
        # RapidAPI Configuration
        self.rapidapi_key = settings.RAPIDAPI_KEY
        self.rapidapi_host = settings.RAPIDAPI_TWITTER_HOST
        self.rapidapi_base_url = f"https://{self.rapidapi_host}"
        
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
        max_results: int = 50
    ) -> Dict[str, int]:
        """Fetch user's tweets using RapidAPI and store in database"""
        
        try:
            # Check rate limits before making the request
            if not self._check_tweet_rate_limit():
                wait_time = (self.last_tweet_request + timedelta(seconds=self.rate_limit_window) - datetime.now()).total_seconds()
                wait_minutes = round(wait_time / 60, 1)
                return {"posts_created": 0, "error": f"Rate limit reached for fetching tweets. Please wait {wait_minutes} minutes before trying again."}

            # Use RapidAPI to fetch user timeline
            headers = {
                "x-rapidapi-key": self.rapidapi_key,
                "x-rapidapi-host": self.rapidapi_host
            }
            
            params = {
                "screenname": social_account.platform_username,
                "count": str(min(max_results, 40))  # RapidAPI supports up to 40 per request
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rapidapi_base_url}/timeline.php",
                    headers=headers,
                    params=params,
                    timeout=30.0
                )
            
            if response.status_code != 200:
                error_msg = f"RapidAPI request failed: {response.status_code} - {response.text}"
                print(error_msg)
                return {"posts_created": 0, "error": error_msg}
            
            data = response.json()
            
            if data.get("status") != "ok":
                error_msg = f"RapidAPI returned error status: {data.get('status')}"
                print(error_msg)
                return {"posts_created": 0, "error": error_msg}
            
        except httpx.HTTPError as e:
            error_msg = f"HTTP error occurred: {str(e)}"
            print(error_msg)
            return {"posts_created": 0, "error": error_msg}
        except Exception as e:
            error_msg = f"Error fetching tweets: {str(e)}"
            print(error_msg)
            return {"posts_created": 0, "error": error_msg}
        
        posts_created = 0
        timeline = data.get("timeline", [])

        if timeline:
            for tweet_data in timeline:
                tweet_id = tweet_data.get("tweet_id")
                
                if not tweet_id:
                    continue

                # Check if post already exists
                existing_post = db.query(Post).filter(
                    Post.platform_post_id == tweet_id
                ).first()

                if existing_post:
                    # Update existing post metrics
                    existing_post.likes_count = tweet_data.get("favorites", 0)
                    existing_post.retweets_count = tweet_data.get("retweets", 0)
                    existing_post.replies_count = tweet_data.get("replies", 0)
                    existing_post.updated_at = datetime.now()
                    continue

                # Get tweet content
                content = tweet_data.get("text", "")
                
                # Preprocess content
                preprocessed_text, language = text_preprocessor.preprocess(content)

                # Module 2 & 3: Analyze Emotion and Slang
                emotion_result = analyze_emotion(content)
                normalizer = SlangNormalizer.get_instance()
                detected_slang = normalizer.detect_slang(content)
                slang_result = [{"term": s["text"], "meaning": s["normalized"]} for s in detected_slang]

                # Parse created_at timestamp
                created_at = self._parse_twitter_date(tweet_data.get("created_at"))

                # Create post
                post = Post(
                    social_account_id=social_account.id,
                    platform_post_id=tweet_id,
                    content=content,
                    raw_data=tweet_data,
                    preprocessed_content=preprocessed_text,
                    language=language or tweet_data.get("lang", "en"),
                    created_at_platform=created_at,
                    likes_count=tweet_data.get("favorites", 0),
                    retweets_count=tweet_data.get("retweets", 0),
                    replies_count=tweet_data.get("replies", 0),
                    is_preprocessed=True,
                    # Emotion and Slang fields
                    emotion_scores=emotion_result["scores"],
                    dominant_emotion=emotion_result["dominant"],
                    sentiment_score=emotion_result["sentiment_score"],
                    detected_slang=slang_result
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
            print("No tweets found in timeline")

        return {"posts_created": posts_created}
    
    async def fetch_tweet_replies(
        self,
        post: Post,
        social_account: SocialAccount,
        db: Session,
        max_results: int = 20
    ) -> int:
        """Fetch replies to a specific tweet using RapidAPI"""
        
        try:
            # Check rate limits before making the request
            if not self._check_reply_rate_limit():
                wait_time = (self.last_reply_request + timedelta(seconds=self.rate_limit_window) - datetime.now()).total_seconds()
                wait_minutes = round(wait_time / 60, 1)
                raise ValueError(f"Rate limit reached for searching replies. Please wait {wait_minutes} minutes before trying again.")

            # Use RapidAPI to fetch tweet thread (includes replies)
            headers = {
                "x-rapidapi-key": self.rapidapi_key,
                "x-rapidapi-host": self.rapidapi_host
            }
            
            params = {
                "id": post.platform_post_id
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rapidapi_base_url}/tweet_thread.php",
                    headers=headers,
                    params=params,
                    timeout=30.0
                )
            
            if response.status_code != 200:
                error_msg = f"RapidAPI request failed: {response.status_code} - {response.text}"
                print(error_msg)
                raise ValueError(error_msg)
            
            data = response.json()
            
            # Check if thread data exists
            thread = data.get("thread", [])
            
        except httpx.HTTPError as e:
            error_msg = f"HTTP error occurred: {str(e)}"
            print(error_msg)
            raise ValueError(error_msg)
        except Exception as e:
            error_msg = f"Error fetching replies: {str(e)}"
            print(error_msg)
            raise ValueError(error_msg)
        
        comments_created = 0
        
        try:
            if thread:
                for reply_data in thread:
                    reply_id = reply_data.get("id")
                    
                    if not reply_id:
                        continue
                    
                    # Skip if it's the original tweet
                    if reply_id == post.platform_post_id:
                        continue

                    # Only process if it's in the same conversation thread
                    if str(reply_data.get("conversation_id")) != post.platform_post_id:
                        continue

                    # Check if comment already exists
                    existing_comment = db.query(Comment).filter(
                        Comment.platform_comment_id == reply_id
                    ).first()

                    if existing_comment:
                        # Update existing comment metrics
                        existing_comment.likes_count = reply_data.get("likes", 0)
                        existing_comment.updated_at = datetime.now()
                        continue

                    # Get content
                    content = reply_data.get("text", "")
                    display_text = reply_data.get("display_text", content)
                    
                    # Preprocess content
                    preprocessed_text, language = text_preprocessor.preprocess(content)

                    # Module 2 & 3: Analyze Emotion and Slang
                    emotion_result = analyze_emotion(content)
                    normalizer = SlangNormalizer.get_instance()
                    detected_slang = normalizer.detect_slang(content)
                    slang_result = [{"term": s["text"], "meaning": s["normalized"]} for s in detected_slang]

                    # Get author information
                    author = reply_data.get("author", {})
                    author_username = author.get("screen_name", f"user_{author.get('rest_id', 'unknown')}")

                    # Parse created_at timestamp
                    created_at = self._parse_twitter_date(reply_data.get("created_at"))

                    # Create comment
                    comment = Comment(
                        post_id=post.id,
                        platform_comment_id=reply_id,
                        author_username=author_username,
                        content=content,
                        raw_data=reply_data,
                        preprocessed_content=preprocessed_text,
                        language=language or reply_data.get("lang", "en"),
                        created_at_platform=created_at,
                        likes_count=reply_data.get("likes", 0),
                        is_preprocessed=True,
                        # Emotion and Slang fields
                        emotion_scores=emotion_result["scores"],
                        dominant_emotion=emotion_result["dominant"],
                        sentiment_score=emotion_result["sentiment_score"],
                        detected_slang=slang_result
                    )

                    db.add(comment)
                    comments_created += 1

                db.commit()
                print(f"Successfully created {comments_created} comments for post {post.id}")
            else:
                print("No replies found in thread")

        except Exception as e:
            db.rollback()
            print(f"Error processing replies: {e}")
            return 0

        return comments_created
    
    def _parse_twitter_date(self, date_str: str) -> datetime:
        """Parse Twitter date string to datetime object"""
        try:
            # Twitter format: "Sat Nov 29 11:10:21 +0000 2025"
            return datetime.strptime(date_str, "%a %b %d %H:%M:%S %z %Y")
        except Exception as e:
            print(f"Error parsing date {date_str}: {e}")
            return datetime.now()


# Global instance
twitter_service = TwitterService()

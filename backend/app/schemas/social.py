from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class SocialAccountBase(BaseModel):
    """Base social account schema"""
    platform: str
    platform_username: str


class SocialAccountResponse(SocialAccountBase):
    """Schema for social account response"""
    id: int
    platform_user_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class PostBase(BaseModel):
    """Base post schema"""
    content: str
    platform_post_id: str


class PostResponse(PostBase):
    """Schema for post response"""
    id: int
    social_account_id: int
    preprocessed_content: Optional[str] = None
    language: Optional[str] = None
    likes_count: int
    retweets_count: int
    replies_count: int
    is_preprocessed: bool
    created_at: datetime
    created_at_platform: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PostWithComments(PostResponse):
    """Schema for post with comments"""
    comments: List['CommentResponse'] = []


class CommentResponse(BaseModel):
    """Schema for comment response"""
    id: int
    post_id: int
    platform_comment_id: str
    author_username: str
    content: str
    preprocessed_content: Optional[str] = None
    language: Optional[str] = None
    likes_count: int
    is_preprocessed: bool
    created_at: datetime
    created_at_platform: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class OAuthCallback(BaseModel):
    """Schema for OAuth callback response"""
    code: str
    state: Optional[str] = None


class IngestionStatus(BaseModel):
    """Schema for data ingestion status"""
    status: str
    posts_fetched: int
    comments_fetched: int
    message: str

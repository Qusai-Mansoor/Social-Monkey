from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    social_accounts = relationship("SocialAccount", back_populates="user", cascade="all, delete-orphan")


class SocialAccount(Base):
    """Social media account connections"""
    __tablename__ = "social_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform = Column(String, nullable=False)  # 'twitter' or 'instagram'
    platform_user_id = Column(String, nullable=False)
    platform_username = Column(String, nullable=False)
    access_token = Column(Text, nullable=False)  # Encrypted
    refresh_token = Column(Text, nullable=True)  # Encrypted
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="social_accounts")
    posts = relationship("Post", back_populates="social_account", cascade="all, delete-orphan")


class Post(Base):
    """Social media posts"""
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id"), nullable=False)
    platform_post_id = Column(String, unique=True, nullable=False)
    content = Column(Text, nullable=False)
    raw_data = Column(JSON, nullable=False)  # Original API response
    preprocessed_content = Column(Text, nullable=True)  # Cleaned content
    language = Column(String, nullable=True)
    created_at_platform = Column(DateTime(timezone=True), nullable=True)
    likes_count = Column(Integer, default=0)
    retweets_count = Column(Integer, default=0)
    replies_count = Column(Integer, default=0)
    is_preprocessed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    social_account = relationship("SocialAccount", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    """Comments/replies on posts"""
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    platform_comment_id = Column(String, unique=True, nullable=False)
    author_username = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    raw_data = Column(JSON, nullable=False)
    preprocessed_content = Column(Text, nullable=True)
    language = Column(String, nullable=True)
    created_at_platform = Column(DateTime(timezone=True), nullable=True)
    likes_count = Column(Integer, default=0)
    is_preprocessed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    post = relationship("Post", back_populates="comments")


class OAuthState(Base):
    """Temporary storage for OAuth state"""
    __tablename__ = "oauth_states"
    
    state = Column(String, primary_key=True)
    code_verifier = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
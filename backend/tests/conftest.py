"""
Pytest configuration and shared fixtures for Social Monkey tests.

This module provides reusable fixtures for database sessions, test clients,
authentication tokens, and mock data.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Generator, Dict
import os
from datetime import datetime, timedelta

# Set testing environment variable to disable rate limiting
os.environ["TESTING"] = "true"

from main import app
from app.db.session import get_db, Base
from app.core.security import create_access_token, get_password_hash
from app.models.models import User, SocialAccount, Post, Comment, OAuthState
from app.core.config import settings


# Test database URL (in-memory SQLite for fast testing)
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def test_db_engine():
    """Create a test database engine with in-memory SQLite."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def test_db(test_db_engine):
    """Create a test database session."""
    TestingSessionLocal = sessionmaker(
        autocommit=False, 
        autoflush=False, 
        bind=test_db_engine
    )
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(test_db):
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(test_db) -> User:
    """Create a test user in the database."""
    user = User(
        email="testuser@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword123"),
        is_active=True,
        created_at=datetime.now()
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_user_token(test_user) -> str:
    """Generate a JWT access token for the test user."""
    return create_access_token(data={"sub": str(test_user.id)})


@pytest.fixture
def auth_headers(test_user_token) -> Dict[str, str]:
    """Create authorization headers with JWT token."""
    return {"Authorization": f"Bearer {test_user_token}"}


@pytest.fixture
def second_test_user(test_db) -> User:
    """Create a second test user for multi-user scenarios."""
    user = User(
        email="seconduser@example.com",
        username="seconduser",
        hashed_password=get_password_hash("password456"),
        is_active=True,
        created_at=datetime.now()
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_social_account(test_db, test_user) -> SocialAccount:
    """Create a test social media account linked to test user."""
    # Note: In real tests, we'd use encrypted tokens
    # For testing, we use placeholder values
    social_account = SocialAccount(
        user_id=test_user.id,
        platform="twitter",
        platform_user_id="123456789",
        platform_username="test_twitter_user",
        access_token="encrypted_access_token_placeholder",
        refresh_token="encrypted_refresh_token_placeholder",
        token_expires_at=datetime.now() + timedelta(days=30),
        is_active=True,
        created_at=datetime.now()
    )
    test_db.add(social_account)
    test_db.commit()
    test_db.refresh(social_account)
    return social_account


@pytest.fixture
def test_post(test_db, test_social_account) -> Post:
    """Create a test social media post."""
    post = Post(
        social_account_id=test_social_account.id,
        platform_post_id="tweet_123456",
        content="This is a test tweet with great content! 😊",
        preprocessed_content="This is a test tweet with great content smiling_face",
        language="en",
        created_at_platform=datetime.now(),
        likes_count=10,
        retweets_count=5,
        replies_count=3,
        is_preprocessed=True,
        emotion_scores={
            "joy": 0.85,
            "optimism": 0.65,
            "neutral": 0.15,
            "admiration": 0.45
        },
        dominant_emotion="joy",
        sentiment_score=0.75,
        detected_slang=[]
    )
    test_db.add(post)
    test_db.commit()
    test_db.refresh(post)
    return post


@pytest.fixture
def test_comment(test_db, test_post) -> Comment:
    """Create a test comment/reply."""
    comment = Comment(
        post_id=test_post.id,
        platform_comment_id="reply_789",
        author_username="commenter123",
        content="Great post! This slaps fr fr 🔥",
        preprocessed_content="Great post This slaps fr fr fire",
        language="en",
        created_at_platform=datetime.now(),
        likes_count=2,
        is_preprocessed=True,
        emotion_scores={
            "admiration": 0.75,
            "excitement": 0.60,
            "joy": 0.55
        },
        dominant_emotion="admiration",
        sentiment_score=0.65,
        detected_slang=[
            {"term": "slaps", "meaning": "really good (usually music/food)"},
            {"term": "fr", "meaning": "for real"}
        ]
    )
    test_db.add(comment)
    test_db.commit()
    test_db.refresh(comment)
    return comment


@pytest.fixture
def test_oauth_state(test_db, test_user) -> OAuthState:
    """Create a test OAuth state record."""
    oauth_state = OAuthState(
        state="test_state_12345",
        code_verifier="test_code_verifier_67890",
        user_id=test_user.id,
        created_at=datetime.now()
    )
    test_db.add(oauth_state)
    test_db.commit()
    test_db.refresh(oauth_state)
    return oauth_state


@pytest.fixture
def sample_tweet_text() -> str:
    """Sample tweet text for preprocessing tests."""
    return "Hey @user check out https://example.com this is amazing! 😊 #trending"


@pytest.fixture
def sample_slang_text() -> str:
    """Sample text with Gen-Z slang for detection tests."""
    return "no cap this song slaps fr fr, it's bussin and giving main character energy"


@pytest.fixture
def positive_emotion_text() -> str:
    """Sample text with positive emotions."""
    return "I'm so happy and grateful for this amazing opportunity! This is the best day ever!"


@pytest.fixture
def negative_emotion_text() -> str:
    """Sample text with negative emotions."""
    return "This is terrible and disappointing. I'm really upset and frustrated about this situation."


@pytest.fixture
def mock_env_vars(monkeypatch):
    """Set up mock environment variables for testing."""
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    monkeypatch.setenv("SECRET_KEY", "test_secret_key_for_jwt_tokens_12345")
    monkeypatch.setenv("ALGORITHM", "HS256")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    monkeypatch.setenv("ENCRYPTION_KEY", "test_encryption_key_32_bytes_long!")

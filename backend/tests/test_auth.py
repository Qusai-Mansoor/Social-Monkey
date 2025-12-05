"""
Unit tests for authentication endpoints and security functions.

Tests cover user registration, login, JWT token generation/validation,
password hashing, and authorization.
"""

import pytest
from fastapi import status
from datetime import datetime, timedelta

from app.core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    verify_token
)
from app.models.models import User


@pytest.mark.unit
@pytest.mark.auth
class TestPasswordHashing:
    """Test password hashing and verification functions."""
    
    def test_password_hashing(self):
        """Test that passwords are properly hashed."""
        password = "securePassword123!"
        hashed = get_password_hash(password)
        
        # Hashed password should not equal plain password
        assert hashed != password
        # Hashed password should be a string
        assert isinstance(hashed, str)
        # Bcrypt hashes start with $2b$
        assert hashed.startswith("$2b$")
    
    def test_password_verification_correct(self):
        """Test password verification with correct password."""
        password = "testPassword456"
        hashed = get_password_hash(password)
        
        # Verification should succeed
        assert verify_password(password, hashed) is True
    
    def test_password_verification_incorrect(self):
        """Test password verification with wrong password."""
        password = "correctPassword"
        wrong_password = "wrongPassword"
        hashed = get_password_hash(password)
        
        # Verification should fail
        assert verify_password(wrong_password, hashed) is False
    
    def test_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt)."""
        password = "samePassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Hashes should be different due to random salt
        assert hash1 != hash2
        # But both should verify correctly
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


@pytest.mark.unit
@pytest.mark.auth
class TestJWTTokens:
    """Test JWT token creation and decoding."""
    
    def test_create_access_token(self):
        """Test JWT token creation."""
        user_id = 123
        token = create_access_token(data={"sub": str(user_id)})
        
        # Token should be a string
        assert isinstance(token, str)
        # Token should have three parts separated by dots (JWT structure)
        assert len(token.split('.')) == 3
    
    def test_decode_access_token_valid(self):
        """Test decoding a valid JWT token."""
        user_id = 456
        token = create_access_token(data={"sub": str(user_id)})
        
        # Decode the token
        payload = verify_token(token)
        
        # Payload should contain user ID
        assert payload is not None
        assert payload.get("sub") == str(user_id)
        assert "exp" in payload  # Expiration time
    
    def test_decode_access_token_invalid(self):
        """Test decoding an invalid JWT token."""
        invalid_token = "invalid.jwt.token"
        
        # Should return None for invalid token
        payload = verify_token(invalid_token)
        assert payload is None
    
    def test_token_expiration_time(self):
        """Test that token has correct expiration time."""
        user_id = 789
        token = create_access_token(data={"sub": str(user_id)})
        payload = verify_token(token)
        
        # Check expiration exists and is in the future
        assert "exp" in payload
        exp_timestamp = payload["exp"]
        assert exp_timestamp > datetime.now().timestamp()


@pytest.mark.integration
@pytest.mark.auth
class TestUserRegistration:
    """Test user registration endpoint."""
    
    def test_register_new_user_success(self, client, test_db):
        """Test successful user registration."""
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "securePass123!"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        
        # Should return 201 CREATED
        assert response.status_code == status.HTTP_201_CREATED
        
        # Response should contain user data
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert "id" in data
        assert "hashed_password" not in data  # Password should not be exposed
        
        # Verify user exists in database
        user = test_db.query(User).filter(User.email == user_data["email"]).first()
        assert user is not None
        assert user.email == user_data["email"]
        assert user.username == user_data["username"]
        # Password should be hashed
        assert user.hashed_password != user_data["password"]
        assert verify_password(user_data["password"], user.hashed_password)
    
    def test_register_duplicate_email(self, client, test_user):
        """Test registration with existing email."""
        user_data = {
            "email": test_user.email,  # Already exists
            "username": "differentusername",
            "password": "password123"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        
        # Should return 400 Bad Request
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"].lower()
    
    def test_register_duplicate_username(self, client, test_user):
        """Test registration with existing username."""
        user_data = {
            "email": "different@example.com",
            "username": test_user.username,  # Already exists
            "password": "password123"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        
        # Should return 400 Bad Request
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email format."""
        user_data = {
            "email": "notanemail",
            "username": "validuser",
            "password": "password123"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        
        # Should return 422 Unprocessable Entity (validation error)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_register_missing_fields(self, client):
        """Test registration with missing required fields."""
        user_data = {
            "email": "user@example.com"
            # Missing username and password
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        
        # Should return 422 Unprocessable Entity
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.integration
@pytest.mark.auth
class TestUserLogin:
    """Test user login endpoint."""
    
    def test_login_success(self, client, test_user):
        """Test successful login with correct credentials."""
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"  # From test_user fixture
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        # Should return 200 OK
        assert response.status_code == status.HTTP_200_OK
        
        # Response should contain access token
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        
        # Token should be valid
        token = data["access_token"]
        payload = verify_token(token)
        assert payload is not None
        assert payload.get("sub") == str(test_user.id)
    
    def test_login_wrong_password(self, client, test_user):
        """Test login with incorrect password."""
        login_data = {
            "email": test_user.email,
            "password": "wrongpassword"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        # Should return 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        # Should return 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_inactive_user(self, client, test_db):
        """Test login with inactive user account."""
        # Create inactive user
        inactive_user = User(
            email="inactive@example.com",
            username="inactiveuser",
            hashed_password=get_password_hash("password123"),
            is_active=False
        )
        test_db.add(inactive_user)
        test_db.commit()
        
        login_data = {
            "email": inactive_user.email,
            "password": "password123"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        # Should return 400 Bad Request
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "inactive" in response.json()["detail"].lower()


@pytest.mark.integration
@pytest.mark.auth
class TestAuthenticationRequired:
    """Test endpoints that require authentication."""
    
    def test_access_protected_endpoint_without_token(self, client):
        """Test accessing protected endpoint without authentication."""
        response = client.get("/api/v1/ingestion/accounts")
        
        # Should return 403 Forbidden (FastAPI default for missing auth)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_access_protected_endpoint_with_invalid_token(self, client):
        """Test accessing protected endpoint with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/v1/ingestion/accounts", headers=headers)
        
        # Should return 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_access_protected_endpoint_with_valid_token(self, client, auth_headers, test_social_account):
        """Test accessing protected endpoint with valid authentication."""
        response = client.get("/api/v1/ingestion/accounts", headers=auth_headers)
        
        # Should return 200 OK
        assert response.status_code == status.HTTP_200_OK
        
        # Should return list of accounts
        data = response.json()
        assert isinstance(data, list)
    
    def test_access_other_users_resource(self, client, test_user, second_test_user, test_db, test_social_account):
        """Test that users cannot access other users' resources."""
        # Create token for second user
        second_user_token = create_access_token(data={"sub": str(second_test_user.id)})
        headers = {"Authorization": f"Bearer {second_user_token}"}
        
        # Try to access first user's social account
        response = client.post(
            f"/api/v1/ingestion/ingest/{test_social_account.id}",
            headers=headers
        )
        
        # Should return 404 Not Found (account doesn't belong to second user)
        assert response.status_code == status.HTTP_404_NOT_FOUND

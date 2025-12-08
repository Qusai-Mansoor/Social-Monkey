"""
SQL Injection Prevention Utilities
Additional layer of protection beyond ORM
"""

import re
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status


class SQLInjectionProtection:
    """
    SQL Injection prevention utilities
    Used in conjunction with SQLAlchemy ORM for defense in depth
    """
    
    # Dangerous SQL patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)",
        r"(--|#|\/\*|\*\/)",  # SQL comments
        r"(\bOR\b.*=.*)",  # OR 1=1 type attacks
        r"(\bAND\b.*=.*)",  # AND 1=1 type attacks
        r"(;.*)",  # Multiple statements
        r"(xp_|sp_)",  # SQL Server stored procedures
        r"(\bINTO\b.*\bOUTFILE\b)",  # File operations
        r"(\bLOAD_FILE\b)",  # File operations
        r"('.*(\bOR\b|\bAND\b).*')",  # Quote-based injection
    ]
    
    @classmethod
    def is_sql_injection_attempt(cls, value: str) -> bool:
        """
        Check if string contains SQL injection patterns
        Returns True if suspicious patterns detected
        """
        if not isinstance(value, str):
            return False
        
        # Check against all patterns
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                return True
        
        return False
    
    @classmethod
    def validate_string(cls, value: str, field_name: str = "input") -> str:
        """
        Validate string input for SQL injection attempts
        Raises HTTPException if suspicious patterns found
        """
        if cls.is_sql_injection_attempt(value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid {field_name}: contains forbidden characters or patterns"
            )
        return value
    
    @classmethod
    def sanitize_string(cls, value: str) -> str:
        """
        Sanitize string by removing dangerous characters
        Use only when you can't reject the input entirely
        """
        if not isinstance(value, str):
            return str(value)
        
        # Remove SQL comments
        value = re.sub(r'(--|#|\/\*|\*\/)', '', value)
        
        # Remove semicolons (statement separators)
        value = value.replace(';', '')
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        return value.strip()
    
    @classmethod
    def validate_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate all string values in a dictionary
        """
        for key, value in data.items():
            if isinstance(value, str):
                cls.validate_string(value, field_name=key)
            elif isinstance(value, dict):
                cls.validate_dict(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, str):
                        cls.validate_string(item, field_name=f"{key}[]")
                    elif isinstance(item, dict):
                        cls.validate_dict(item)
        return data
    
    @classmethod
    def validate_email(cls, email: str) -> str:
        """
        Validate email format and check for injection attempts
        """
        # Basic email format
        email_pattern = r'^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
        
        if not re.match(email_pattern, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        if cls.is_sql_injection_attempt(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email: contains forbidden characters"
            )
        
        return email.lower().strip()
    
    @classmethod
    def validate_username(cls, username: str) -> str:
        """
        Validate username format (alphanumeric + underscore only)
        """
        # Only allow alphanumeric and underscore
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be 3-20 characters and contain only letters, numbers, and underscores"
            )
        
        return username.strip()
    
    @classmethod
    def validate_search_query(cls, query: str, max_length: int = 100) -> str:
        """
        Validate search query input
        """
        if len(query) > max_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Search query too long (max {max_length} characters)"
            )
        
        # Check for SQL injection
        if cls.is_sql_injection_attempt(query):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid search query: contains forbidden characters"
            )
        
        return query.strip()
    
    @classmethod
    def validate_integer_id(cls, id_value: Any, field_name: str = "id") -> int:
        """
        Validate that ID is a positive integer
        Prevents SQL injection through ID parameters
        """
        try:
            id_int = int(id_value)
            if id_int < 1:
                raise ValueError("ID must be positive")
            return id_int
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid {field_name}: must be a positive integer"
            )
    
    @classmethod
    def validate_limit_offset(cls, limit: int = 10, offset: int = 0) -> tuple:
        """
        Validate pagination parameters
        """
        try:
            limit = int(limit)
            offset = int(offset)
            
            if limit < 1 or limit > 100:
                raise ValueError("Limit must be between 1 and 100")
            
            if offset < 0:
                raise ValueError("Offset must be non-negative")
            
            return limit, offset
            
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid pagination parameters: {str(e)}"
            )


# Dependency function for FastAPI
def validate_request_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    FastAPI dependency to validate request data
    Usage: data: dict = Depends(validate_request_data)
    """
    return SQLInjectionProtection.validate_dict(data)

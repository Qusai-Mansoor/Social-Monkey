"""
Security middleware for FastAPI application
Implements various security headers and protections
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
from collections import defaultdict
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses
    Protects against XSS, clickjacking, MIME sniffing, etc.
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Content Security Policy - Prevents XSS attacks while allowing necessary CDNs
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            # Allow scripts from self, Chart.js CDN, and inline scripts (needed for some components)
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            # Allow styles from self, Google Fonts, Font Awesome CDN, and inline styles
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
            # Allow images from self, data URIs, and HTTPS sources
            "img-src 'self' data: https:; "
            # Allow fonts from self, Google Fonts, Font Awesome CDN, and data URIs
            "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
            # Allow connections to self, social media APIs, and CDN source maps
            "connect-src 'self' https://api.twitter.com https://graph.instagram.com https://cdn.jsdelivr.net; "
            # Prevent framing
            "frame-ancestors 'none';"
        )
        
        # Prevent clickjacking attacks
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Enable XSS protection in browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Force HTTPS in production (HSTS)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy (formerly Feature Policy)
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent brute force and DoS attacks
    Implements token bucket algorithm
    """
    
    def __init__(self, app: ASGIApp, requests_per_minute: int = 1000):  # Increased for development
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        self.blocked_ips = {}  # IP: unblock_time
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting during testing
        import os
        if os.getenv("TESTING") == "true":
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host
        
        # Check if IP is currently blocked
        if client_ip in self.blocked_ips:
            if datetime.now() < self.blocked_ips[client_ip]:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please try again later.",
                        "retry_after": int((self.blocked_ips[client_ip] - datetime.now()).total_seconds())
                    }
                )
            else:
                # Unblock IP
                del self.blocked_ips[client_ip]
        
        # Clean old requests (older than 1 minute)
        current_time = datetime.now()
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if current_time - req_time < timedelta(minutes=1)
        ]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            # Block IP for 5 minutes
            self.blocked_ips[client_ip] = current_time + timedelta(minutes=5)
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. You have been temporarily blocked.",
                    "retry_after": 300  # 5 minutes in seconds
                }
            )
        
        # Add current request
        self.requests[client_ip].append(current_time)
        
        # Add rate limit headers
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            self.requests_per_minute - len(self.requests[client_ip])
        )
        response.headers["X-RateLimit-Reset"] = str(
            int((current_time + timedelta(minutes=1)).timestamp())
        )
        
        return response


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Stricter rate limiting for authentication endpoints
    Prevents brute force attacks on login/register
    """
    
    def __init__(self, app: ASGIApp, auth_attempts_per_minute: int = 30):
        super().__init__(app)
        self.auth_attempts_per_minute = auth_attempts_per_minute
        self.auth_attempts = defaultdict(list)
        self.blocked_ips = {}
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting during testing
        import os
        if os.getenv("TESTING") == "true":
            return await call_next(request)
        
        # Only apply to auth endpoints
        if not (request.url.path.startswith("/api/v1/auth/")):
            return await call_next(request)
        
        client_ip = request.client.host
        
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            if datetime.now() < self.blocked_ips[client_ip]:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many authentication attempts. Please try again later.",
                        "retry_after": int((self.blocked_ips[client_ip] - datetime.now()).total_seconds())
                    }
                )
            else:
                del self.blocked_ips[client_ip]
        
        # Clean old attempts
        current_time = datetime.now()
        self.auth_attempts[client_ip] = [
            attempt_time for attempt_time in self.auth_attempts[client_ip]
            if current_time - attempt_time < timedelta(minutes=1)
        ]
        
        # Check rate limit
        if len(self.auth_attempts[client_ip]) >= self.auth_attempts_per_minute:
            # Block for 15 minutes
            self.blocked_ips[client_ip] = current_time + timedelta(minutes=15)
            logger.warning(f"Auth rate limit exceeded for IP: {client_ip}")
            
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many authentication attempts. You have been blocked for 15 minutes.",
                    "retry_after": 900
                }
            )
        
        # Add current attempt
        self.auth_attempts[client_ip].append(current_time)
        
        response = await call_next(request)
        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Limit request body size to prevent memory exhaustion attacks
    """
    
    def __init__(self, app: ASGIApp, max_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_size = max_size
    
    async def dispatch(self, request: Request, call_next):
        # Check Content-Length header
        content_length = request.headers.get("content-length")
        
        if content_length and int(content_length) > self.max_size:
            return JSONResponse(
                status_code=413,
                content={
                    "detail": f"Request body too large. Maximum size is {self.max_size / (1024 * 1024):.1f}MB"
                }
            )
        
        return await call_next(request)


class SecureSessionMiddleware(BaseHTTPMiddleware):
    """
    Enhanced session security
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Set secure cookie attributes
        if "set-cookie" in response.headers:
            # Add SameSite and Secure flags to all cookies
            cookie_value = response.headers["set-cookie"]
            if "SameSite" not in cookie_value:
                cookie_value += "; SameSite=Strict"
            if "Secure" not in cookie_value:
                cookie_value += "; Secure"
            if "HttpOnly" not in cookie_value:
                cookie_value += "; HttpOnly"
            
            response.headers["set-cookie"] = cookie_value
        
        return response

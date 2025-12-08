# Security Implementation Guide

## How to Use the New Security Features

---

## 1. Security Middleware (Backend)

### Already Implemented ✅

The security middleware is automatically applied to all API requests in `backend/main.py`:

```python
# Security features active:
1. Request Size Limiting (10MB max)
2. Rate Limiting (60 requests/minute per IP)
3. Auth Rate Limiting (5 login attempts/minute per IP)
4. Security Headers (XSS, Clickjacking protection)
5. Secure Session Cookies
```

### Configuration

Edit `backend/main.py` to adjust limits:

```python
# Change rate limits
app.add_middleware(RateLimitMiddleware, requests_per_minute=120)  # Increase to 120

# Change auth rate limits
app.add_middleware(AuthRateLimitMiddleware, auth_attempts_per_minute=10)  # Increase to 10

# Change max request size
app.add_middleware(RequestSizeLimitMiddleware, max_size=20 * 1024 * 1024)  # 20MB
```

---

## 2. XSS Protection (Frontend)

### Usage in JavaScript

Import the XSS protection utility:

```html
<script src="/js/utils/xss-protection.js"></script>
```

### Safe Text Display

**❌ UNSAFE - Don't do this:**

```javascript
element.innerHTML = userInput; // XSS vulnerability!
```

**✅ SAFE - Do this instead:**

```javascript
// Option 1: Use textContent (recommended)
XSSProtection.setTextContent(element, userInput);

// Option 2: Escape HTML entities
element.innerHTML = XSSProtection.escapeHtml(userInput);

// Option 3: Create text node
const textNode = XSSProtection.createSafeTextNode(userInput);
element.appendChild(textNode);
```

### Sanitize User Input

```javascript
// Sanitize before sending to API
const sanitizedData = {
  username: XSSProtection.sanitizeText(username),
  email: email.trim().toLowerCase(),
  content: XSSProtection.sanitizeText(content),
};

// Validate email
if (!XSSProtection.isValidEmail(email)) {
  showError("Invalid email format");
  return;
}

// Validate username
if (!XSSProtection.isValidUsername(username)) {
  showError("Username can only contain letters, numbers, and underscores");
  return;
}
```

### Sanitize Search Queries

```javascript
const searchQuery = XSSProtection.sanitizeSearchQuery(userQuery);
```

### Validate URLs

```javascript
const safeUrl = XSSProtection.sanitizeUrl(userProvidedUrl);
if (safeUrl) {
  window.location.href = safeUrl;
}
```

---

## 3. SQL Injection Protection (Backend)

### Using the SQL Protection Utility

Import in your endpoint files:

```python
from app.utils.sql_protection import SQLInjectionProtection
```

### Validate Individual Fields

```python
from app.utils.sql_protection import SQLInjectionProtection

@router.post("/search")
def search_posts(query: str, db: Session = Depends(get_db)):
    # Validate search query
    safe_query = SQLInjectionProtection.validate_search_query(query)

    # Now safe to use in query
    posts = db.query(Post).filter(Post.content.contains(safe_query)).all()
    return posts
```

### Validate Request Data

```python
@router.post("/create")
def create_post(data: dict):
    # Validate entire dictionary
    safe_data = SQLInjectionProtection.validate_dict(data)

    # Use safe_data in database operations
    ...
```

### Validate IDs

```python
@router.get("/post/{post_id}")
def get_post(post_id: str, db: Session = Depends(get_db)):
    # Validate ID is positive integer
    safe_id = SQLInjectionProtection.validate_integer_id(post_id)

    post = db.query(Post).filter(Post.id == safe_id).first()
    return post
```

### Validate Email and Username

```python
from app.utils.sql_protection import SQLInjectionProtection

@router.post("/register")
def register(email: str, username: str, password: str):
    # Validate email
    safe_email = SQLInjectionProtection.validate_email(email)

    # Validate username
    safe_username = SQLInjectionProtection.validate_username(username)

    # Now safe to create user
    ...
```

---

## 4. Environment Configuration

### Development vs Production

In `.env` file:

```env
# Development
ENVIRONMENT=development
BACKEND_CORS_ORIGINS=["*"]  # Allows all origins

# Production
ENVIRONMENT=production
BACKEND_CORS_ORIGINS=["https://yourdomain.com", "https://www.yourdomain.com"]
```

### Secure Secrets

Ensure these are set with strong random values:

```env
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-super-secret-jwt-key-here

# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-fernet-encryption-key-here
```

---

## 5. Database Security

### Already Secure ✅

All database queries use SQLAlchemy ORM with parameterized queries:

```python
# ✅ SAFE - Parameterized query
user = db.query(User).filter(User.email == email).first()

# ❌ NEVER DO THIS - SQL injection vulnerability!
# db.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

### Additional Validation

For extra security, wrap user inputs:

```python
from app.utils.sql_protection import SQLInjectionProtection

email = SQLInjectionProtection.validate_email(request_email)
user = db.query(User).filter(User.email == email).first()
```

---

## 6. API Request Examples

### With Rate Limiting

The API will return rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1702034400
```

If rate limit exceeded:

```json
{
  "detail": "Rate limit exceeded. You have been temporarily blocked.",
  "retry_after": 300
}
```

### With Authentication

```javascript
// Add token to requests
const response = await fetch("/api/v1/analytics/overview", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});
```

---

## 7. Security Headers Explained

Headers automatically added to all responses:

| Header                      | Purpose                | Value                           |
| --------------------------- | ---------------------- | ------------------------------- |
| `Content-Security-Policy`   | Prevents XSS attacks   | Restricts script sources        |
| `X-Frame-Options`           | Prevents clickjacking  | DENY                            |
| `X-Content-Type-Options`    | Prevents MIME sniffing | nosniff                         |
| `X-XSS-Protection`          | Browser XSS filter     | 1; mode=block                   |
| `Strict-Transport-Security` | Forces HTTPS           | max-age=31536000                |
| `Referrer-Policy`           | Controls referrer info | strict-origin-when-cross-origin |

---

## 8. Testing Security Features

### Test Rate Limiting

```bash
# Send multiple requests quickly
for i in {1..70}; do
    curl http://localhost:8000/api/v1/analytics/overview
done
# Should get 429 error after 60 requests
```

### Test Auth Rate Limiting

```bash
# Try multiple login attempts
for i in {1..10}; do
    curl -X POST http://localhost:8000/api/v1/auth/login \
         -H "Content-Type: application/json" \
         -d '{"email":"test@test.com","password":"wrong"}'
done
# Should get blocked after 5 attempts
```

### Test Request Size Limit

```bash
# Send large payload (> 10MB)
dd if=/dev/zero of=large.json bs=1M count=15
curl -X POST http://localhost:8000/api/v1/test \
     -H "Content-Type: application/json" \
     --data-binary @large.json
# Should get 413 error
```

### Test SQL Injection Protection

```python
# Try to inject SQL in search
response = requests.post("/api/v1/search", json={
    "query": "test' OR '1'='1"
})
# Should get 400 error: "Invalid search query: contains forbidden characters"
```

---

## 9. Frontend Security Checklist

When creating new UI components:

- [ ] Use `XSSProtection.escapeHtml()` for user-generated content
- [ ] Use `textContent` instead of `innerHTML` when possible
- [ ] Validate all form inputs before submission
- [ ] Sanitize URLs before redirecting
- [ ] Use `XSSProtection.sanitizeObject()` before sending to API
- [ ] Check file types for uploads
- [ ] Display error messages safely (no HTML injection)

---

## 10. Backend Security Checklist

When creating new endpoints:

- [ ] Use SQLAlchemy ORM (never raw SQL strings)
- [ ] Validate user inputs with `SQLInjectionProtection`
- [ ] Require authentication with `Depends(get_current_user)`
- [ ] Validate IDs are positive integers
- [ ] Limit result set sizes (pagination)
- [ ] Use Pydantic models for request validation
- [ ] Return generic error messages (don't leak info)
- [ ] Log security events

---

## 11. Production Deployment Checklist

Before deploying to production:

- [ ] Set `ENVIRONMENT=production` in .env
- [ ] Configure specific CORS origins (no wildcard)
- [ ] Use HTTPS only (SSL/TLS certificate)
- [ ] Rotate SECRET_KEY and ENCRYPTION_KEY
- [ ] Enable database SSL connections
- [ ] Set up monitoring and logging
- [ ] Configure firewall rules
- [ ] Run security audit/penetration test
- [ ] Set up automated backups (encrypted)
- [ ] Configure rate limiting for production traffic
- [ ] Review and test all error handlers
- [ ] Ensure .env file is not in version control

---

## 12. Common Security Mistakes to Avoid

### ❌ DON'T:

```javascript
// Direct innerHTML with user data
element.innerHTML = userData;

// String concatenation in URLs
fetch(`/api/user/${userId}`)  // If userId is not validated

// Storing sensitive data in localStorage without encryption
localStorage.setItem('password', password);

// Exposing detailed error messages
catch (error) {
    return { error: error.stack };  // Leaks system info
}
```

### ✅ DO:

```javascript
// Safe text content
XSSProtection.setTextContent(element, userData);

// Validated parameters
const safeId = parseInt(userId);
if (safeId > 0) {
    fetch(`/api/user/${safeId}`)
}

// Only store tokens (encrypted)
localStorage.setItem('access_token', token);

// Generic error messages
catch (error) {
    return { error: "An error occurred. Please try again." };
}
```

---

## 13. Monitoring and Logging

### Security Events to Log

1. Failed login attempts
2. Rate limit violations
3. SQL injection attempts
4. XSS attempts
5. Unauthorized access attempts
6. Large payload rejections

### Implementation Example

```python
import logging

logger = logging.getLogger(__name__)

# Log security events
logger.warning(f"Rate limit exceeded for IP: {client_ip}")
logger.warning(f"SQL injection attempt detected: {query}")
logger.error(f"Failed login for user: {email}")
```

---

## Need Help?

For questions about security implementation:

1. Check this guide first
2. Review SECURITY_ASSESSMENT.md
3. Consult the code comments
4. Test in development environment first

**Remember: Security is a continuous process, not a one-time implementation!**

# Social Monkey Backend - Module 1: Data Ingestion & Preprocessing

FastAPI backend for Social Monkey - An emotion-aware social media helper.

## 📁 Project Structure

```
backend/
├── main.py                    # FastAPI application entry point
├── pyproject.toml            # Project dependencies (uv)
├── .env                      # Environment variables (create from .env.example)
├── alembic/                  # Database migrations (future)
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── api.py        # API router aggregator
│   │       └── endpoints/
│   │           ├── auth.py   # User authentication endpoints
│   │           ├── oauth.py  # OAuth flow endpoints
│   │           └── ingestion.py  # Data ingestion endpoints
│   ├── core/
│   │   ├── config.py         # Application configuration
│   │   └── security.py       # JWT and password utilities
│   ├── db/
│   │   └── session.py        # Database session management
│   ├── models/
│   │   └── models.py         # SQLAlchemy models
│   ├── schemas/
│   │   ├── user.py           # User Pydantic schemas
│   │   └── social.py         # Social media Pydantic schemas
│   ├── services/
│   │   └── twitter_service.py  # Twitter OAuth & data fetching
│   ├── utils/
│   │   ├── encryption.py     # Token encryption utilities
│   │   └── preprocessing.py  # Text preprocessing utilities
└── tests/                    # Unit tests (future)
```

## 🚀 Setup Instructions

### 1. Prerequisites

- Python 3.11+
- PostgreSQL database
- Twitter Developer Account with OAuth 2.0 credentials
- `uv` package manager

Install uv if you haven't:
```bash
pip install uv
```

### 2. Install Dependencies

```bash
cd backend
uv sync
```

### 3. Configure Environment Variables

Create a `.env` file from the example:
```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

#### Database Configuration
Set up your PostgreSQL database and update:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/socialmonkey_db
```

#### Generate Secret Keys

```bash
# Generate JWT secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate Fernet encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

#### Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use existing one
3. Enable OAuth 2.0
4. Set callback URL: `http://localhost:8000/api/v1/oauth/twitter/callback`
5. Copy the following credentials to `.env`:
   - `TWITTER_CLIENT_ID`
   - `TWITTER_CLIENT_SECRET`
   - `TWITTER_BEARER_TOKEN`

### 4. Set Up Database

Create PostgreSQL database:
```bash
psql -U postgres
CREATE DATABASE socialmonkey_db;
\q
```

The tables will be created automatically when you run the application.

### 5. Run the Application

```bash
# Using uv
uv run python main.py

# Or using uvicorn directly
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📖 API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user info

### OAuth Integration

- `GET /api/v1/oauth/twitter/authorize` - Get Twitter authorization URL
- `GET /api/v1/oauth/twitter/callback` - Handle Twitter OAuth callback
- `GET /api/v1/oauth/instagram/authorize` - Instagram OAuth (TODO)
- `GET /api/v1/oauth/instagram/callback` - Instagram callback (TODO)

### Data Ingestion

- `GET /api/v1/data/accounts` - Get connected social accounts
- `POST /api/v1/data/ingest/{account_id}` - Ingest posts and comments
- `GET /api/v1/data/posts` - Get all posts
- `GET /api/v1/data/posts/{post_id}` - Get post with comments
- `GET /api/v1/data/stats` - Get ingestion statistics

## 🔄 Twitter OAuth Flow

### Step-by-Step Guide

1. **Register a user**:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "securepassword"
  }'
```

2. **Login to get JWT token**:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

3. **Get Twitter authorization URL**:
```bash
curl "http://localhost:8000/api/v1/oauth/twitter/authorize"
```

4. **Redirect user to authorization URL** - User will authorize your app

5. **Twitter redirects back to callback** - Automatically handled at:
   `http://localhost:8000/api/v1/oauth/twitter/callback?code=...`

6. **Ingest Twitter data**:
```bash
curl -X POST "http://localhost:8000/api/v1/data/ingest/1?max_posts=100"
```

## 🧪 Testing the API

### Using the Interactive Docs

Navigate to http://localhost:8000/docs to use the Swagger UI interface.

### Using curl

Check health:
```bash
curl http://localhost:8000/health
```

Get API stats:
```bash
curl http://localhost:8000/api/v1/data/stats
```

## 🔧 Text Preprocessing Features

The preprocessing pipeline includes:

1. **Emoji Normalization**: Converts emojis to text (e.g., 😊 → "smiling face")
2. **Language Detection**: Detects post language using langdetect
3. **Text Cleaning**: Removes URLs, normalizes mentions/hashtags
4. **Slang Expansion**: Expands common abbreviations (lol → laughing out loud)

Example:
```
Input:  "omg this is amazing! 😍 #blessed @friend https://example.com"
Output: "oh my god this is amazing smiling face with heart-eyes blessed"
```

## 📊 Database Models

### User
- User authentication and profile information

### SocialAccount
- Connected social media accounts with encrypted OAuth tokens

### Post
- Social media posts with raw data and preprocessed content

### Comment
- Comments/replies on posts with preprocessing

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Token Encryption**: Fernet symmetric encryption for OAuth tokens
- **CORS Protection**: Configurable CORS origins

## 📝 TODO / Future Improvements

- [ ] Implement proper user authentication middleware
- [ ] Add Instagram OAuth integration
- [ ] Implement Alembic migrations
- [ ] Add comprehensive unit tests
- [ ] Add rate limiting
- [ ] Implement token refresh logic
- [ ] Add CSV import for demo data
- [ ] Add background tasks for data ingestion
- [ ] Implement pagination for large datasets
- [ ] Add logging and monitoring

## 🐛 Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Verify DATABASE_URL in `.env`
- Check database user permissions

### Twitter API Errors
- Verify Twitter API credentials
- Check callback URL matches in Twitter Developer Portal
- Ensure your app has required permissions (tweet.read, users.read)

### Import Errors
- Run `uv sync` to ensure all dependencies are installed
- Verify Python version >= 3.11

## 📚 Key Technologies

- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **Pydantic**: Data validation using Python type hints
- **Tweepy**: Twitter API v2 client
- **python-jose**: JWT token handling
- **Cryptography**: Token encryption
- **emoji**: Emoji handling and normalization
- **langdetect**: Language detection

## 🤝 Contributing

Module 1 focuses on data ingestion and preprocessing. Future modules will add:
- Emotional analysis (Module 2)
- Visualization (Module 3)
- Forecasting (Module 4)
- Optimization (Module 5)

---

**Module 1 - Data Ingestion & Preprocessing** ✅

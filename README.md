# Social-Monkey

An emotion-aware social media helper that analyzes user-authorized comments and social media posts to provide emotional insights, engagement forecasting, and emotion-driven post optimization.

## 🚀 Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL
- **Frontend**: React + Vite
- **Authentication**: OAuth 2.0 (Twitter & Instagram)
- **State Management**: Zustand
- **Styling**: Tailwind CSS

## 📁 Project Structure

```
Social-Monkey/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # API endpoints
│   │   ├── core/                # Config & security
│   │   ├── db/                  # Database setup
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   └── main.py              # FastAPI app
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Backend tests
│   └── pyproject.toml           # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API clients
│   │   └── App.jsx              # Main app
│   └── package.json             # Node dependencies
├── config/                      # Shared configuration
├── docs/                        # Documentation
└── scripts/                     # Utility scripts
```

## 🛠️ Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for caching)

### Backend Setup

1. Create and activate virtual environment:
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -e .
```

3. Create `.env` file from `.env.example` and configure:
```bash
copy .env.example .env
```

4. Setup database:
```bash
# Create database in PostgreSQL
createdb socialmonkey_db

# Run migrations
alembic upgrade head
```

5. Run development server:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create `.env` file:
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

3. Run development server:
```bash
npm run dev
```

## 🔐 OAuth Setup

### Twitter (X)
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Add callback URL: `http://localhost:8000/api/v1/oauth/twitter/callback`
4. Copy Client ID and Secret to `.env`

### Instagram
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app with Instagram Basic Display
3. Add callback URL: `http://localhost:8000/api/v1/oauth/instagram/callback`
4. Copy Client ID and Secret to `.env`

## 📝 Project Scope

Social Monkey is a web application developed as an emotion-aware social media helper. It analyzes user-authorized comments and social media posts to provide fine-grained emotional insights, engagement forecasting, and emotion-driven post optimization.

### Scope Limitations
- Platforms: Twitter and Instagram
- Exclusions: Automated post scheduling, image/video generation, and multilingual support for emotional analysis
- Security: Basic OAuth and token encryption

By focusing on these core capabilities, the project will deliver a proof of concept showcasing feasibility and identifying future extensions.

## 📝 Module 1 - Data Ingestion & Preprocessing

### Description
This module securely connects to user-authorized social media accounts or accepts uploaded exports, fetches posts and comments, and normalizes the data for downstream analysis.

#### Features
1. Connect accounts via OAuth 2.0 (Twitter/Instagram) or accept CSV exports for demo.
2. Preprocessing: emoji normalization, slang lookup, language detection.
3. Store raw JSON + normalized data (Postgres/Mongo).
4. Provide REST endpoints for post retrieval and status.

#### Acceptance Criteria
- Successful OAuth-based ingestion for at least one platform
- Raw + cleaned records stored
- Demo dataset of ≥ 1000 posts

### Current Implementation
- ✅ OAuth 2.0 integration framework (Twitter & Instagram)
- ✅ User authentication with JWT
- ✅ Database models for users, social accounts, and posts
- ✅ REST API endpoints structure
- 🚧 OAuth token encryption
- 🚧 Data preprocessing pipeline
- 🚧 CSV import functionality

## 🧪 Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## 📄 License

[Add your license here]
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social Monkey is an emotion-aware social media analytics platform that analyzes user-authorized social media posts and comments to provide emotional insights, engagement forecasting, and comprehensive analytics dashboards. The project is built with:

- **Backend**: FastAPI (Python 3.8+) with SQLAlchemy ORM
- **Frontend**: Vanilla JavaScript ES6 modules (no framework)
- **Database**: PostgreSQL (via SQLAlchemy)
- **Authentication**: JWT + OAuth 2.0 (Twitter/Instagram)
- **Analysis**: Hugging Face Transformers (SamLowe/roberta-base-go_emotions)

## Common Commands

### Backend Development

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install dependencies (no requirements.txt exists, install manually)
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose passlib bcrypt python-multipart pydantic-settings transformers torch

# Start development server
python -m uvicorn main:app --reload --port 8000
# OR
python main.py

# Create database tables (no Alembic migrations exist)
python
>>> from app.db.session import engine, Base
>>> Base.metadata.create_all(bind=engine)
>>> exit()

# Create test user
python
>>> from app.db.session import SessionLocal
>>> from app.models.models import User
>>> from app.core.security import get_password_hash
>>> db = SessionLocal()
>>> user = User(
...     email="test@example.com",
...     username="testuser",
...     hashed_password=get_password_hash("password123")
... )
>>> db.add(user)
>>> db.commit()
>>> exit()
```

### Frontend Access

```bash
# Access dashboard via backend (recommended)
http://localhost:8000/dashboard

# Other routes
http://localhost:8000/          # Landing page
http://localhost:8000/login     # Login page
http://localhost:8000/register  # Registration page

# API Documentation
http://localhost:8000/docs      # Swagger UI
http://localhost:8000/redoc     # ReDoc
```

### Environment Setup

Create `backend/.env` from `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key
- `ENCRYPTION_KEY`: Fernet key for encrypting OAuth tokens
- `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`: Twitter OAuth credentials (optional)
- `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`: Instagram OAuth credentials (optional)

## Architecture

### Backend Structure

The backend follows a layered architecture pattern:

```
backend/app/
├── api/v1/endpoints/     # API route handlers
│   ├── auth.py           # JWT authentication (register, login)
│   ├── oauth.py          # Twitter/Instagram OAuth flows
│   ├── ingestion.py      # Social media data ingestion
│   └── analytics.py      # Analytics endpoints (emotion, slang, trends)
├── core/                 # Core configuration
│   ├── config.py         # Settings (pydantic-settings)
│   └── security.py       # JWT utilities, password hashing
├── db/                   # Database setup
│   └── session.py        # SQLAlchemy engine, SessionLocal, Base
├── models/               # SQLAlchemy ORM models
│   └── models.py         # User, SocialAccount, Post, Comment
├── schemas/              # Pydantic schemas for request/response
│   ├── user.py
│   └── social.py
├── services/             # Business logic
│   └── twitter_service.py
├── analysis/             # ML/NLP analysis engines
│   ├── emotion_engine.py # Singleton for HF transformers emotion analysis
│   └── slang_detector.py # Gen-Z slang detection
└── utils/                # Utility functions
    ├── encryption.py     # Fernet encryption for OAuth tokens
    └── preprocessing.py  # Text preprocessing
```

**Key Backend Patterns:**

1. **Database Models** (`app/models/models.py`):
   - `User`: Authentication and user data
   - `SocialAccount`: OAuth-connected social media accounts (Twitter/Instagram)
   - `Post`: Social media posts with emotion analysis results
   - `Comment`: Comments/replies with emotion analysis
   - Posts and Comments store: `emotion_scores` (JSON), `dominant_emotion`, `detected_slang` (JSON), `sentiment_score`

2. **Emotion Analysis** (`app/analysis/emotion_engine.py`):
   - Singleton pattern for loading HuggingFace model once
   - Uses `SamLowe/roberta-base-go_emotions` for multi-emotion classification
   - Returns: emotion scores dict, dominant emotion, sentiment score

3. **Authentication Flow**:
   - JWT tokens stored in localStorage on frontend
   - `get_current_user` dependency in protected routes
   - OAuth tokens encrypted with Fernet before database storage

4. **API Router Structure** (`app/api/v1/api.py`):
   - All routes prefixed with `/api/v1`
   - Routers: auth, oauth, data, analytics, terms, privacy

### Frontend Structure

The frontend is a Single Page Application (SPA) built with vanilla JavaScript ES6 modules:

```
frontend/
├── templates/
│   ├── dashboard.html    # Main SPA shell
│   ├── login.html
│   ├── register.html
│   └── landing.html
├── css/
│   ├── dashboard.css              # Main layout (960+ lines)
│   ├── dashboard-components.css   # Component library (1100+ lines)
│   └── sidebar.css
├── js/
│   ├── dashboard.js      # Main app controller, hash-based routing
│   ├── sidebar.js        # Navigation controller
│   ├── api.js            # API service wrapper
│   ├── config.js         # API endpoints configuration
│   ├── auth-login.js
│   ├── auth-register.js
│   ├── landing.js
│   ├── components/       # Reusable components
│   │   ├── data-loader.js      # Centralized API data fetching with caching
│   │   ├── chart-manager.js    # Chart.js wrapper
│   │   ├── stat-cards.js       # Stat card generator
│   │   ├── filter-manager.js   # Unified filtering system (450+ lines)
│   │   ├── auto-refresh.js     # Auto-refresh manager (300+ lines)
│   │   └── filter-panel.js     # Filter UI panel (600+ lines)
│   └── dashboards/       # Dashboard modules
│       ├── overview.js          # 6 stat cards, emotion pie, slang bar
│       ├── emotion-dashboard.js # Emotion trends, breakdown, posts table
│       ├── negative-triggers.js # Trigger detection and severity scoring
│       ├── heatmap-analysis.js  # 7x24 posting pattern heatmap
│       └── genz-insights.js     # Gen-Z slang usage tracking
```

**Key Frontend Patterns:**

1. **Component Architecture**:
   - Each component is a class with lifecycle methods (init, render, destroy)
   - Components are instantiated in `dashboard.js` and passed to dashboards
   - Dashboards extend a base pattern: load data → render cards → render charts

2. **Hash-Based Routing** (`dashboard.js`):
   - URL structure: `#overview`, `#emotion-analysis`, `#negative-triggers`, `#heatmap`, `#genz-insights`
   - Supports browser back/forward, deep linking
   - Valid routes whitelist with 404 error handling
   - Navigation with fade-in/fade-out transitions (300ms/200ms)

3. **State Management**:
   - localStorage for: auth token, last visited page, filter preferences
   - Global instances: `window.filterManager`, `window.autoRefreshManager`, `window.filterPanel`
   - No reactive framework - manual DOM updates

4. **Data Flow**:
   - `DataLoader` component handles all API calls with 5-minute caching
   - `FilterManager` manages filter state across all dashboards
   - `AutoRefreshManager` triggers data refresh every 5 minutes
   - Charts managed by `ChartManager` for consistent styling

5. **Filter System** (`components/filter-manager.js`):
   - 8 quick presets (last-7-days, high-engagement, negative-sentiment, etc.)
   - Custom date ranges, multi-platform, multi-emotion, severity, engagement range
   - localStorage persistence
   - Observer pattern for filter change notifications

## Development Workflow

### Adding a New Dashboard

1. Create `frontend/js/dashboards/your-dashboard.js`:
   - Export a class with `init(container, components)`, `render()`, `destroy()` methods
   - Use `components.dataLoader` for API calls
   - Use `components.chartManager` for charts
   - Use `components.filterManager.getAllFilters()` to respect filters

2. Register in `dashboard.js`:
   - Add route to `validRoutes` array
   - Import dashboard class
   - Add case in `loadPage()` switch statement

3. Add navigation item in `sidebar.js` or update HTML

### Adding a New API Endpoint

1. Create endpoint function in appropriate `app/api/v1/endpoints/*.py`
2. Add route to router with `@router.get/post/etc`
3. Use `Depends(get_current_user)` for protected routes
4. Add endpoint to `frontend/js/config.js` `API_ENDPOINTS`
5. Add method to `frontend/js/api.js` `ApiService` class

### Running Emotion Analysis on Posts

The emotion analysis engine is called automatically during data ingestion. To manually trigger analysis on existing posts:

```bash
# Via API
POST /api/v1/analytics/analyze-existing
```

The `analyze_emotion()` function in `app/analysis/emotion_engine.py` returns:
```python
{
    "scores": {"joy": 0.85, "anger": 0.02, ...},  # All emotions
    "dominant": "joy",                            # Top emotion
    "sentiment_score": 0.75                       # -1.0 to 1.0
}
```

## Important Implementation Details

### Frontend Static File Serving

The backend (`main.py`) mounts the entire `frontend/` directory as static files:
```python
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
```

This means frontend files are served at `/static/` but routes like `/dashboard`, `/login` return HTML directly.

### No Build Process

The frontend uses native ES6 modules with no build step. All JavaScript files are loaded via `<script type="module">` and use `import`/`export`.

### Database Tables Created Automatically

On startup, `main.py` calls `Base.metadata.create_all(bind=engine)` to create tables. There are no Alembic migrations in the codebase.

### OAuth Token Encryption

OAuth access/refresh tokens are encrypted using Fernet (symmetric encryption) before being stored in the `social_accounts` table. The encryption key must be set in `.env` as `ENCRYPTION_KEY`.

### Emotion Analysis Model Loading

The `EmotionEngine` class uses a singleton pattern to load the HuggingFace model only once on first use. This prevents reloading the model on every request.

### Filter Persistence

User filter preferences are saved to localStorage with key `dashboard_filters`. They persist across page reloads and apply to all dashboards that respect the filter manager.

### Auto-Refresh System

The `AutoRefreshManager` automatically refreshes data every 5 minutes (configurable). It clears the data cache in `DataLoader` and triggers a re-render of the current dashboard.

## Testing

No automated tests exist in the codebase. Testing is currently manual:

1. Register a new user via `/register`
2. Login via `/login`
3. Navigate between dashboards
4. Apply filters and verify data updates
5. Test CSV export functionality
6. Test auto-refresh toggle
7. Verify browser back/forward navigation
8. Check localStorage persistence (reload page)

## Recent Enhancements (Emotion Dashboard)

### All 28 Emotions Support

The emotion dashboard now properly displays all 28 emotions from the HuggingFace model:

**Backend Changes** ([backend/app/api/v1/endpoints/analytics.py:293](backend/app/api/v1/endpoints/analytics.py#L293)):
- `/api/v1/analytics/emotion-analysis` endpoint enhanced to return:
  - `breakdown`: All 28 emotions with counts
  - `avg_sentiment_score`: Real average from database (0-100 scale)
  - `emotion_trends`: Time-series data for each emotion (dates + counts per emotion per day)
- Accepts `days` parameter for date range filtering

**Frontend Changes** ([frontend/js/dashboards/emotion-dashboard.js](frontend/js/dashboards/emotion-dashboard.js)):
- **Emotion Display Strategy**: Top 10 emotions shown by default, rest collapsible
- **Emotion Metadata**: 28 emotions with unique icons and color-coded by category:
  - Positive (12): joy, love, admiration, approval, caring, excitement, gratitude, optimism, pride, relief, desire, amusement
  - Negative (11): anger, annoyance, disappointment, disapproval, disgust, embarrassment, fear, grief, nervousness, remorse, sadness
  - Neutral/Mixed (5): neutral, surprise, confusion, curiosity, realization
- **Emotion Trends Chart**: Now shows real emotion counts over time (top 8 emotions) instead of synthetic data
- **Posts by Emotion**: Groups posts by actual `dominant_emotion` from database

**Chart Manager** ([frontend/js/components/chart-manager.js:269](frontend/js/components/chart-manager.js#L269)):
- Updated to handle dynamic emotions with `{ labels: [], emotions: { emotion1: [], emotion2: [] } }` format
- Color mapping for all 28 emotions

### Date Field Fix for Trends

**Critical Fix** ([backend/app/api/v1/endpoints/analytics.py](backend/app/api/v1/endpoints/analytics.py)):
All analytics endpoints now use `created_at_platform` (actual post date on social media) instead of `created_at` (database insertion timestamp) for:
- `/api/v1/analytics/emotion-analysis` - Emotion trends over time
- `/api/v1/analytics/engagement-trends` - Engagement trends
- `/api/v1/analytics/post-frequency` - Posting frequency

**Why this matters**: When posts are imported from Twitter/Instagram, `created_at` reflects when the data was inserted into the database (all on the same day), while `created_at_platform` contains the actual original posting date. Using `created_at_platform` ensures trends show the real historical pattern.

**Fallback behavior**: If `created_at_platform` is null, the code falls back to `created_at`.

**Timezone handling**: All date comparisons now use timezone-aware datetime objects (`datetime.now(timezone.utc)`) to match the database's timezone-aware columns.

## Known Limitations

- Backend uses demo/mock data in some analytics endpoints when no real posts exist
- Twitter/Instagram OAuth requires valid API credentials in `.env`
- No automated tests (frontend or backend)
- Auto-refresh interval not configurable via UI (hardcoded to 5 minutes)
- No database migrations (using direct `create_all()`)
- No requirements.txt (dependencies must be installed manually)

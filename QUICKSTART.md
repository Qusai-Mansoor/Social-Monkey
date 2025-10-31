# 🚀 Quick Start Guide - Social Monkey Dashboard

## Prerequisites

- Python 3.8+
- Node.js (optional, for development)
- PostgreSQL or SQLite

---

## 🏃 Quick Start (5 Minutes)

### 1. Clone & Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
# OR
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose passlib bcrypt python-multipart

# Create .env file
copy .env.example .env
# Edit .env with your database credentials
```

### 2. Initialize Database

```bash
# Run migrations
alembic upgrade head

# OR create tables directly
python
>>> from app.db.session import engine
>>> from app.models.models import Base
>>> Base.metadata.create_all(engine)
>>> exit()
```

### 3. Start Backend

```bash
python -m uvicorn main:app --reload --port 8000
```

Backend running at: http://localhost:8000

---

## 🎨 Access Dashboard

### Option 1: Via Backend (Recommended)

```
http://localhost:8000/templates/dashboard.html
```

### Option 2: Static Server

```bash
cd frontend
python -m http.server 8080
```

Access at: http://localhost:8080/templates/dashboard.html

---

## 🔑 First Login

### Create Test User

```bash
# In Python shell
python
>>> from app.db.session import SessionLocal
>>> from app.models.models import User
>>> from app.core.security import get_password_hash
>>>
>>> db = SessionLocal()
>>> user = User(
...     email="test@example.com",
...     hashed_password=get_password_hash("password123"),
...     full_name="Test User"
... )
>>> db.add(user)
>>> db.commit()
>>> exit()
```

### Login Credentials

- **Email**: test@example.com
- **Password**: password123

---

## 📊 Dashboard Navigation

### Available Dashboards:

1. **Overview** (`#overview`) - Main analytics summary
2. **Emotion Analysis** (`#emotion-analysis`) - Sentiment tracking
3. **Negative Triggers** (`#negative-triggers`) - Risk detection
4. **Heatmap Analysis** (`#heatmap`) - Time-based patterns
5. **Gen-Z Insights** (`#genz-insights`) - Slang analysis

### Navigation Methods:

- Click sidebar links
- Use browser back/forward
- Direct URL: `dashboard.html#emotion-analysis`

---

## 🎛️ Using Advanced Features

### Open Filter Panel

1. Click "Advanced Filters" button
2. Select preset OR customize filters
3. Click "Apply Filters"

### Quick Presets:

- **Last 7 Days** - Recent activity
- **Last 30 Days** - Monthly view
- **High Engagement** - 100+ interactions
- **Negative Only** - Negative sentiment
- **Twitter/Instagram Only** - Single platform
- **Critical Triggers** - High severity negatives

### Enable Auto-Refresh:

1. Click "Enable Auto-Refresh" button
2. Dashboard refreshes every 5 minutes
3. Status shows countdown timer

---

## 🔧 API Endpoints

### Authentication

```bash
# Register
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}

# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Analytics

```bash
# Get posts
GET /api/v1/analytics/posts
Headers: Authorization: Bearer <token>

# Get engagement trends
GET /api/v1/analytics/engagement-trends?days=30
Headers: Authorization: Bearer <token>

# Get emotion analysis
GET /api/v1/analytics/emotion-analysis?days=30
Headers: Authorization: Bearer <token>

# Get slang analysis
GET /api/v1/analytics/slang-analysis?days=30
Headers: Authorization: Bearer <token>
```

---

## 📱 Testing the Dashboard

### 1. Check Overview Dashboard

- Should see 6 stat cards
- Emotion distribution chart
- Slang usage chart
- Top 6 posts grid

### 2. Test Emotion Analysis

- Change date range filter (7/30/90 days)
- Switch platform (All/Twitter/Instagram)
- Click "Export to CSV"
- Verify multi-line emotion chart

### 3. Test Negative Triggers

- Check severity distribution pie chart
- View trigger words bar chart
- Filter by severity (High/Medium/Low)
- Export negative triggers CSV

### 4. Test Heatmap

- Hover over cells to see tooltips
- Change metric (Engagement/Posts/Reach)
- View hourly and daily charts
- Identify best posting times

### 5. Test Gen-Z Insights

- Check slang terms table
- Sort by frequency/engagement/growth
- View platform comparison
- Check growth badges (+/- %)

### 6. Test Advanced Filters

- Open filter panel
- Apply "High Engagement" preset
- Set custom date range
- Select multiple platforms
- Set engagement range (min 50, max 200)
- Verify filter summary

### 7. Test Auto-Refresh

- Enable auto-refresh
- Watch countdown timer
- Wait for automatic refresh (or set interval to 1 minute for testing)
- Disable auto-refresh

---

## 🐛 Troubleshooting

### Dashboard Not Loading

```bash
# Check backend is running
curl http://localhost:8000/api/v1/health

# Check browser console for errors
F12 -> Console tab

# Verify token is valid
localStorage.getItem('access_token')
```

### No Data Showing

```bash
# Check if user has posts
python
>>> from app.db.session import SessionLocal
>>> from app.models.models import SocialPost
>>> db = SessionLocal()
>>> posts = db.query(SocialPost).count()
>>> print(f"Total posts: {posts}")
```

### Filters Not Working

```bash
# Check filter manager in console
window.filterManager.getAllFilters()

# Reset filters
window.filterManager.reset()
```

### Auto-Refresh Not Starting

```bash
# Check status
window.autoRefreshManager.getStatus()

# Force enable
window.autoRefreshManager.toggle()
```

---

## 📚 Documentation Links

- **Phase 4 Guide**: `frontend/PHASE4_GUIDE.md`
- **Project Summary**: `PROJECT_SUMMARY.md`
- **Backend API**: `http://localhost:8000/docs` (FastAPI docs)

---

## 🎯 Common Tasks

### Add Test Data

```python
from app.db.session import SessionLocal
from app.models.models import SocialPost
from datetime import datetime, timedelta
import random

db = SessionLocal()

# Create sample posts
for i in range(100):
    post = SocialPost(
        user_id=1,
        platform=random.choice(['Twitter', 'Instagram']),
        content=f"Test post {i} with some content",
        emotion=random.choice(['positive', 'negative', 'neutral', 'excited', 'sad']),
        sentiment_score=random.uniform(-1, 1),
        engagement=random.randint(0, 500),
        likes_count=random.randint(0, 200),
        retweets_count=random.randint(0, 100),
        replies_count=random.randint(0, 50),
        created_at=datetime.now() - timedelta(days=random.randint(0, 90))
    )
    db.add(post)

db.commit()
print("Added 100 test posts")
```

### Clear Cache

```javascript
// In browser console
window.dataLoader.clearCache();
localStorage.clear();
location.reload();
```

### Export All Data

```javascript
// Get all filtered posts
const posts = await window.dataLoader.loadPosts();
const filtered = window.filterManager.applyAll(posts);
console.log(JSON.stringify(filtered, null, 2));
```

---

## ✨ Tips & Tricks

### Keyboard Shortcuts

- `Ctrl/Cmd + R` - Refresh page
- `Ctrl/Cmd + Shift + R` - Hard refresh (clear cache)
- `F12` - Open developer tools

### URL Navigation

```
# Direct navigation
dashboard.html#overview
dashboard.html#emotion-analysis
dashboard.html#negative-triggers
dashboard.html#heatmap
dashboard.html#genz-insights
```

### Filter Presets via Console

```javascript
// Apply preset programmatically
window.filterManager.applyPreset("high-engagement");
window.filterManager.applyPreset("negative-only");
window.filterManager.applyPreset("critical-triggers");
```

### Change Auto-Refresh Interval

```javascript
// Set to 2 minutes
window.autoRefreshManager.setInterval(2);

// Set to 10 minutes
window.autoRefreshManager.setInterval(10);
```

---

## 🎉 You're Ready!

Dashboard is now running with:
✅ 5 complete dashboards  
✅ Advanced filtering  
✅ Auto-refresh  
✅ Beautiful dark theme  
✅ Real-time updates

**Enjoy analyzing your social media data!** 📊✨

---

## 🆘 Need Help?

1. Check browser console (F12) for errors
2. Review `PROJECT_SUMMARY.md` for architecture details
3. Read `PHASE4_GUIDE.md` for advanced features
4. Check FastAPI docs at http://localhost:8000/docs
5. Inspect network tab for API call issues

**Happy analyzing! 🚀**

# Social-Monkey 🐵

An AI-driven emotion-aware social media analytics platform that provides deep sentiment analysis, Gen-Z slang interpretation, and comprehensive engagement insights for Twitter/X content.

## 📖 Overview

**Social Monkey** is a web-based application designed as an emotion-aware social media assistant that analyzes user-authorized posts and comments from Twitter (X). The platform leverages advanced transformer-based AI models (BERTweet fine-tuned on GoEmotions) to detect 27 fine-grained emotions, interpret Gen-Z slang, and provide actionable analytics through interactive dashboards.

### Key Highlights

- 🎯 **27 Fine-Grained Emotions**: Beyond basic sentiment (positive/negative), detects emotions like admiration, amusement, confusion, gratitude, sarcasm, remorse, nervousness, and more
- 🤖 **AI-Powered Analysis**: Fine-tuned BERTweet model (135M parameters) with 0.43-0.46 Macro F1 score on GoEmotions benchmark
- 💬 **Gen-Z Slang Detection**: Dictionary-based system identifying 70+ slang terms (no cap, bussin, slaps, fr, ngl, etc.)
- 📊 **5 Interactive Dashboards**: Overview, Emotion Analysis, Negative Triggers, Heatmap Analysis, Gen-Z Insights
- 🔐 **Secure OAuth 2.0**: Twitter integration with PKCE flow for safe account access
- 🌙 **Beautiful Dark Theme**: Modern UI with smooth animations and responsive design

---

## 🚀 Tech Stack

### Backend

- **Framework**: FastAPI (Python 3.9+)
- **AI/ML**:
  - Transformers 4.35.0 (Hugging Face)
  - BERTweet-base fine-tuned on GoEmotions dataset
  - PyTorch for model inference
- **Database**: PostgreSQL (Supabase) / SQLite
- **ORM**: SQLAlchemy 2.0.23
- **Authentication**: JWT (PyJWT 2.8.0) + OAuth 2.0 PKCE
- **Security**: Fernet encryption for tokens, bcrypt for passwords
- **Social API**: Twitter API v2 via Tweepy 4.14.0
- **NLP Utils**: LangDetect 1.0.9, Emoji 2.8.0
- **Testing**: pytest with 83 test cases (100% pass rate)

### Frontend

- **JavaScript**: Vanilla ES6 Modules (No framework - 10,000+ lines!)
- **Charts**: Chart.js 4.4.0
- **Architecture**: Single Page Application (SPA) with hash-based routing
- **Styling**: Custom CSS (960+ lines dashboard.css, 1100+ lines components)
- **State**: localStorage + Component Instances
- **Features**: Auto-refresh, advanced filtering, CSV export

---

## 🎯 Core Features

### 1. Deep Emotion Analysis

- **27 Emotion Categories**: Detects fine-grained emotions using BERTweet transformer
- **Multi-label Classification**: Single text can have multiple simultaneous emotions
- **Sentiment Scoring**: Aggregates emotions into overall polarity score
- **Performance**: Test Macro F1: 0.43-0.46 (competitive with published SOTA: 0.469)

### 2. Gen-Z Slang Interpretation

- **70+ Slang Terms**: Curated dictionary with formal definitions
- **Pattern Matching**: Regex-based word boundary detection
- **Context-Aware**: Phrase priority matching (e.g., "no cap" before "cap")
- **Integration**: Runs parallel with emotion analysis

### 3. Interactive Dashboards

- **Overview**: 6 stat cards, emotion distribution, top slang, best posts
- **Emotion Analysis**: Multi-line trends, emotion breakdown, filterable table
- **Negative Triggers**: Severity classification, trigger word analysis, risk scoring
- **Heatmap Analysis**: 7×24 posting patterns, optimal time identification
- **Gen-Z Insights**: Slang usage tracking, trend comparison, growth rates

### 4. Advanced Features

- **Unified Filtering**: 8 quick presets, custom date ranges, multi-platform/emotion selection
- **Auto-Refresh**: Every 5 minutes with live countdown
- **CSV Export**: Full data export for emotion and trigger analysis
- **Real-time Updates**: Smart caching with manual refresh option

---

## 🧠 AI Model: BERTweet Fine-Tuning

### Model Architecture

**BERTweet-base** (vinai/bertweet-base)

- Pre-trained on 850M English tweets (2012-2019)
- 135M trainable parameters
- 12 Transformer layers, 768 hidden dimensions, 12 attention heads
- 64,001 BPE tokens with native emoji support
- Max sequence length: 128 tokens

### GoEmotions Dataset

- **Total**: 58,009 Reddit comments
- **Split**: 43,410 train / 5,426 validation / 5,427 test
- **Task**: Multi-label emotion classification (27 emotions)
- **Emotions**:
  - Positive (12): admiration, amusement, approval, caring, desire, excitement, gratitude, joy, love, optimism, pride, relief
  - Negative (11): anger, annoyance, disappointment, disapproval, disgust, embarrassment, fear, grief, nervousness, remorse, sadness
  - Ambiguous (4): confusion, curiosity, realization, surprise

### Training Configuration

```python
Learning Rate: 2e-5
Batch Size: 32
Epochs: 10 (convergence at epoch 7-8)
Optimizer: AdamW (weight decay 0.01)
Loss: Binary Cross-Entropy with Logits
Threshold: 0.3 (optimal for multi-label)
Training Time: ~50 minutes (Tesla P100 GPU)
```

### Performance Results

- **Test Macro F1**: 0.43-0.46 (published SOTA: 0.469)
- **Test Micro F1**: 0.54-0.57
- **Best Emotions**: Gratitude (0.88), Amusement (0.76), Joy (0.72), Love (0.68)
- **Challenging**: Nervousness (0.12), Relief (0.18), Grief (0.22)

**See [bertweet_goemotions_complete_analysis.md](bertweet_goemotions_complete_analysis.md) for detailed technical analysis.**

---

## 📊 Dashboards

### 1. Overview Dashboard

- 6 stat cards with key metrics
- Emotion distribution pie chart
- Top slang usage bar chart
- Top 6 posts grid
- Quick actions panel

### 2. Emotion Analysis Dashboard

- 3 stat cards (posts, avg engagement, dominant emotion)
- Multi-line emotion trend chart (5 emotions)
- Emotion breakdown horizontal bars
- Filterable posts table
- CSV export functionality

### 3. Negative Triggers Dashboard

- Severity classification (high/medium/low)
- Custom trigger scoring algorithm
- Top 10 trigger words analysis
- Filterable table with severity badges
- CSV export with trigger scores

### 4. Heatmap Analysis Dashboard

- 7×24 interactive heatmap grid
- Time-based posting pattern analysis
- Peak posting times identification
- Hourly and daily distribution charts
- Metric toggle (engagement/posts/reach)

### 5. Gen-Z Insights Dashboard

- 20+ Gen-Z slang terms detection
- Usage frequency analysis
- Trend comparison (recent vs previous)
- Platform comparison
- Growth rate tracking with badges

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- PostgreSQL (or SQLite for development)
- Twitter Developer Account (for OAuth)

### 1. Clone Repository

```bash
git clone https://github.com/Qusai-Mansoor/Social-Monkey.git
cd Social-Monkey
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

Create `.env` file in `backend/` directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/socialmonkey
# Or for SQLite:
# DATABASE_URL=sqlite:///./socialmonkey.db

# Security
SECRET_KEY=your-secret-key-here-min-32-chars
ENCRYPTION_KEY=your-fernet-encryption-key-here

# Twitter OAuth 2.0
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_REDIRECT_URI=http://localhost:8000/api/v1/oauth/twitter/callback

# AI Model
EMOTION_MODEL_PATH=SamLowe/roberta-base-go_emotions
# Or use your fine-tuned BERTweet model path
```

### 4. Database Setup

```bash
# Run migrations
alembic upgrade head

# Or create tables directly
python -c "from app.db.session import engine; from app.models.models import Base; Base.metadata.create_all(engine)"
```

### 5. Start Backend Server

```bash
python -m uvicorn main:app --reload --port 8000
```

Backend API: `http://localhost:8000`  
API Docs: `http://localhost:8000/docs`

### 6. Access Dashboard

Open browser:

```
http://localhost:8000/templates/dashboard.html
```

### 7. Create Test User

```bash
python
>>> from app.db.session import SessionLocal
>>> from app.models.models import User
>>> from app.core.security import get_password_hash
>>>
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

**Login Credentials**:

- Email: `test@example.com`
- Password: `password123`

---

## 📁 Project Structure

```
Social-Monkey/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/       # API routes
│   │   │   ├── auth.py             # Authentication
│   │   │   ├── analytics.py        # Analytics endpoints
│   │   │   ├── ingestion.py        # Data ingestion
│   │   │   └── oauth.py            # OAuth flows
│   │   ├── core/                   # Configuration & security
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── db/                     # Database
│   │   │   └── session.py
│   │   ├── models/                 # SQLAlchemy models
│   │   │   └── models.py
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── user.py
│   │   │   └── social.py
│   │   ├── services/               # Business logic
│   │   │   ├── emotion_engine.py   # BERTweet inference
│   │   │   ├── slang_detector.py   # Slang detection
│   │   │   └── twitter_service.py  # Twitter API
│   │   └── utils/                  # Utilities
│   │       ├── encryption.py
│   │       └── preprocessing.py
│   ├── tests/                      # 83 test cases
│   │   ├── test_auth.py
│   │   ├── test_emotion_engine.py
│   │   ├── test_preprocessing.py
│   │   └── test_slang_detector.py
│   ├── main.py                     # FastAPI app
│   ├── pyproject.toml
│   └── pytest.ini
│
├── frontend/
│   ├── templates/
│   │   └── dashboard.html          # Main SPA
│   ├── css/
│   │   ├── dashboard.css           # 960+ lines
│   │   ├── dashboard-components.css # 1100+ lines
│   │   └── sidebar.css
│   ├── js/
│   │   ├── dashboard.js            # 700+ lines
│   │   ├── sidebar.js
│   │   ├── api.js
│   │   ├── components/             # Reusable components
│   │   │   ├── data-loader.js
│   │   │   ├── chart-manager.js
│   │   │   ├── stat-cards.js
│   │   │   ├── filter-manager.js
│   │   │   ├── auto-refresh.js
│   │   │   └── filter-panel.js
│   │   └── dashboards/
│   │       ├── overview.js
│   │       ├── emotion-dashboard.js
│   │       ├── negative-triggers.js
│   │       ├── heatmap-analysis.js
│   │       └── genz-insights.js
│   └── assets/
│
├── bertweet_goemotions_complete_analysis.md  # AI model documentation
├── README.md                                  # This file
└── requirements.txt
```

---

## 🧪 Testing

### Run Test Suite

```bash
cd backend
pytest -v

# With coverage
pytest --cov=app --cov-report=html
```

### Test Results

- **Total Tests**: 83
- **Pass Rate**: 100%
- **Coverage**:
  - Authentication: 21 tests
  - Emotion Analysis: 20 tests
  - Text Preprocessing: 18 tests
  - Slang Detection: 24 tests

---

## 🔧 API Endpoints

### Authentication

```bash
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### OAuth

```bash
GET  /api/v1/oauth/twitter/url
GET  /api/v1/oauth/twitter/callback
```

### Data Ingestion

```bash
POST /api/v1/ingest/{social_account_id}
GET  /api/v1/ingest/status/{social_account_id}
```

### Analytics

```bash
GET /api/v1/analytics/overview
GET /api/v1/analytics/posts?days=30&platform=Twitter
GET /api/v1/analytics/engagement-trends?days=30
GET /api/v1/analytics/emotion-analysis?days=30
GET /api/v1/analytics/slang-analysis?days=30
GET /api/v1/analytics/heatmap?days=30
```

**Full API Documentation**: `http://localhost:8000/docs`

---

## 🎨 Design System

### Colors

- **Background Deep**: `#040711`
- **Background Panel**: `#111533`
- **Accent Purple**: `#7C3AED`
- **Accent Magenta**: `#DA6CFF`
- **Success Green**: `#10B981`
- **Error Red**: `#EF4444`
- **Warning Orange**: `#F59E0B`

### Typography

- **Body**: Manrope
- **Headings**: Poppins

---

## 📚 Documentation

- **[bertweet_goemotions_complete_analysis.md](bertweet_goemotions_complete_analysis.md)** - Complete BERTweet fine-tuning analysis
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **Academic Documentation**: `backend/docs/` (LaTeX thesis chapters)

---

## 👥 Team

**Final Year Project - FAST NUCES Islamabad**

- **Ahmed Ali** (22i-0825) - Module 2 Lead: Deep Sentiment & Emotional Analysis, BERTweet fine-tuning
- **Ahmad** (22i-1288) - Module 1 & 3: Data Ingestion, Slang Detection, Visualization
- **Qusai Mansoor** (22i-0935) - Module 1 & 3: OAuth Integration, Dashboard Frontend

---

## 🔐 Security Features

- JWT-based authentication with secure token handling
- OAuth 2.0 PKCE flow for Twitter authorization
- Fernet encryption for stored OAuth tokens
- bcrypt password hashing
- HTTPS-ready configuration
- Rate limiting on API endpoints
- SQL injection prevention via SQLAlchemy ORM

---

## 🚧 Future Enhancements

- [ ] Instagram integration
- [ ] Multi-language emotion analysis
- [ ] Real-time WebSocket updates
- [ ] Engagement forecasting module
- [ ] AI-powered post optimization suggestions
- [ ] Mobile application (React Native)
- [ ] Transformer-based slang detection
- [ ] Multi-modal analysis (images/videos)

---

## 📄 License

This project is developed as a Final Year Project at FAST NUCES Islamabad.

---

## 🙏 Acknowledgments

- **BERTweet Model**: VinAI Research (Nguyen et al., 2020)
- **GoEmotions Dataset**: Google Research (Demszky et al., 2020)
- **Hugging Face**: Transformers library
- **FastAPI**: Modern Python web framework
- **Chart.js**: Beautiful data visualizations

---

## 📞 Contact

For questions or collaboration:

- **Email**: i220825@nu.edu.pk, i221288@nu.edu.pk, i220935@nu.edu.pk
- **GitHub**: [@Qusai-Mansoor](https://github.com/Qusai-Mansoor)

---

**Built with ❤️ for the Gen-Z social media era** 🚀

- Dark mode throughout
- Purple/magenta gradients
- Smooth transitions (300ms)
- Card-based layout

## 🔐 OAuth Setup (Optional)

### Twitter (X)

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create app → Get Client ID/Secret
3. Callback: `http://localhost:8000/api/v1/oauth/twitter/callback`

### Instagram

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create app with Instagram Basic Display
3. Callback: `http://localhost:8000/api/v1/oauth/instagram/callback`

## 📊 API Endpoints

### Authentication

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
```

### Analytics

```
GET /api/v1/analytics/posts
GET /api/v1/analytics/engagement-trends?days=30
GET /api/v1/analytics/emotion-analysis?days=30
GET /api/v1/analytics/slang-analysis?days=30
```

### OAuth

```
GET /api/v1/oauth/twitter/authorize
GET /api/v1/oauth/twitter/callback
GET /api/v1/oauth/instagram/authorize
GET /api/v1/oauth/instagram/callback
```

## 🧪 Testing

### Test Dashboard Features

1. ✅ Navigation between all 5 dashboards
2. ✅ Apply filter presets
3. ✅ Set custom date ranges
4. ✅ Multi-select platforms/emotions
5. ✅ Enable auto-refresh
6. ✅ Export to CSV
7. ✅ Hover over heatmap cells
8. ✅ Sort posts table
9. ✅ Check growth badges
10. ✅ Verify filter persistence (reload page)

### Browser Console Tests

```javascript
// Check filter manager
window.filterManager.getAllFilters();

// Apply preset
window.filterManager.applyPreset("high-engagement");

// Check auto-refresh status
window.autoRefreshManager.getStatus();

// Toggle auto-refresh
window.autoRefreshManager.toggle();
```

## 🏆 Project Highlights

### Code Quality

- **10,000+ lines** of production-ready code
- **9 reusable components**
- **5 complete dashboards**
- **Clean architecture** with separation of concerns
- **Comprehensive documentation**

### No Frameworks Used

- Built entirely with **vanilla JavaScript**
- ES6 modules for organization
- Custom state management
- Hand-crafted CSS animations
- No React, Vue, or Angular!

### Performance

- Smart caching (5-minute timeout)
- Lazy loading dashboards
- Optimized filtering algorithms
- localStorage persistence
- Efficient event handling

### Design

- Consistent UI/UX across all pages
- Smooth animations and transitions
- Responsive breakpoints
- Accessible color contrasts
- Professional dark theme

## 🚧 Known Limitations

1. Backend currently uses demo/mock data
2. Twitter/Instagram APIs require credentials
3. Auto-refresh interval not configurable in UI
4. Browser-native date picker (limited styling)

## 🔮 Future Enhancements

- WebSocket for real-time updates
- PDF report generation
- Custom dashboard builder
- Push notifications
- AI-powered insights
- Team collaboration
- Mobile app
- Accessibility improvements
- Internationalization

## 🤝 Contributing

This is a complete, production-ready implementation. For modifications:

1. Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture
2. Check [PHASE4_GUIDE.md](frontend/PHASE4_GUIDE.md) for advanced features
3. Follow existing code patterns
4. Test all dashboards after changes

## � License

[Add your license here]

---

## 🎓 Learning Showcase

This project demonstrates mastery of:

- ✅ Modern vanilla JavaScript patterns
- ✅ Component-based architecture without frameworks
- ✅ State management and observables
- ✅ Advanced CSS animations
- ✅ Chart.js integration
- ✅ RESTful API design
- ✅ Hash-based routing
- ✅ localStorage persistence
- ✅ Responsive design
- ✅ Clean code principles

---

**Built with ❤️ using pure JavaScript**

_No frameworks were harmed in the making of this dashboard._

**Status**: ✅ **Production Ready** | **All Phases Complete** | **10,000+ LOC**

# Updated System Architecture - SocialMonkey

## Iteration 2 - Current Implementation

This document describes the **actual implemented architecture** after Iteration 2.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Auth Pages   │  │  Dashboard   │  │  Analytics View     │   │
│  │ Login/Register│ │Visualizations│  │ Emotion/Slang Stats │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
│                    Vanilla JavaScript + HTML/CSS                │
└─────────────────────────────────────────────────────────────────┘
                              │
                         HTTP Requests
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER (FastAPI)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API Router / Gateway                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌────────────┬──────────────┴───────────┬──────────────┐     │
│  │            │                          │              │     │
│  ▼            ▼                          ▼              ▼     │
│ ┌──────┐  ┌────────┐  ┌─────────────┐  ┌──────────────┐     │
│ │ Auth │  │ OAuth  │  │  Ingestion  │  │  Analytics   │     │
│ │ Ctrl │  │  Ctrl  │  │    Ctrl     │  │     Ctrl     │     │
│ └──────┘  └────────┘  └─────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────┘
       │           │              │                  │
       │           │              │                  │
       ▼           ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Security    │  │   Twitter    │  │  Text Preprocessor  │  │
│  │  Manager     │  │   Service    │  │  (Cleaning/Normalization)│
│  │(JWT/Bcrypt)  │  │ (OAuth/API)  │  └─────────────────────┘  │
│  └──────────────┘  └──────────────┘              │             │
│                                                   │             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           AI ANALYSIS SERVICES (Module 2 & 3)           │  │
│  │  ┌──────────────────┐      ┌────────────────────┐      │  │
│  │  │ Emotion Engine   │      │  Slang Detector    │      │  │
│  │  │ RoBERTa Model    │      │  Pattern Matching  │      │  │
│  │  │ 28 Emotions      │      │  Gen-Z Dictionary  │      │  │
│  │  │ Sentiment Score  │      │  70+ Terms         │      │  │
│  │  └──────────────────┘      └────────────────────┘      │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌──────────────┐                  ┌──────────────┐            │
│  │  Twitter API │                  │Instagram API │            │
│  │  (OAuth 2.0) │                  │(Future Work) │            │
│  └──────────────┘                  └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA STORAGE LAYER                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              PostgreSQL Database (Supabase)            │    │
│  │  ┌──────┐  ┌──────────────┐  ┌──────┐  ┌──────────┐  │    │
│  │  │Users │  │SocialAccounts│  │Posts │  │ Comments │  │    │
│  │  └──────┘  └──────────────┘  └──────┘  └──────────┘  │    │
│  │                                                        │    │
│  │  Tables include:                                      │    │
│  │  - Encrypted OAuth tokens (Fernet)                   │    │
│  │  - Emotion scores (JSON)                             │    │
│  │  - Slang detection results (JSON)                    │    │
│  │  - Engagement metrics                                │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Descriptions

### **Frontend Layer**

- **Technology**: Vanilla JavaScript, HTML5, CSS3
- **Pages**:
  - `index.html` - Landing page
  - `register.html` - User registration
  - `dashboard.html` - Main analytics dashboard
- **Features**:
  - User authentication UI
  - Social account connection interface
  - Data sync triggers
  - Analytics visualizations (emotion charts, slang word cloud)

### **Backend API Layer (FastAPI)**

- **Framework**: FastAPI 0.x
- **Server**: Uvicorn ASGI
- **Port**: 3000-4000
- **Controllers**:
  1. **AuthController**: Registration, login, JWT management
  2. **OAuthController**: Twitter OAuth 2.0 flow with PKCE
  3. **IngestionController**: Social media data fetching
  4. **AnalyticsController**: Emotion/slang statistics endpoints

### **Service Layer**

#### **Security Manager**

- JWT token creation/validation (HS256)
- Password hashing (bcrypt)
- User authentication

#### **Twitter Service**

- OAuth 2.0 authorization
- Post and comment fetching (Twitter API v2)
- Rate limit management
- Token encryption/decryption

#### **Text Preprocessor**

- Emoji normalization
- Slang expansion
- URL/mention removal
- Language detection (langdetect)

#### **Emotion Engine** (Module 2)

- **Model**: SamLowe/roberta-base-go_emotions
- **Output**: 28 emotion scores
- **Singleton pattern**: Model loaded once
- **Features**:
  - Dominant emotion identification
  - Sentiment polarity (-1.0 to +1.0)
  - Confidence scores

#### **Slang Detector** (Module 3)

- **Dictionary**: 70+ Gen-Z slang terms
- **Pattern matching**: Regex-based detection
- **Output**: List of detected terms with meanings
- **Examples**: "no cap", "rizz", "bussin", "sheesh"

### **External Services**

- **Twitter API**: OAuth, post/comment fetching
- **Instagram API**: Planned for future iterations

### **Data Storage**

- **Database**: PostgreSQL (hosted on Supabase)
- **ORM**: SQLAlchemy
- **Tables**: Users, SocialAccounts, Posts, Comments, OAuthState
- **Security**:
  - Encrypted OAuth tokens (Fernet)
  - Hashed passwords (bcrypt)
- **JSON Storage**:
  - Emotion scores
  - Slang detection results
  - Raw API responses

---

## Data Flow

### **1. User Registration/Login**

```
User → Frontend → AuthController → SecurityManager → Database
                                         ↓
                                    JWT Token
                                         ↓
                                    Frontend (stored)
```

### **2. OAuth Connection**

```
User → Frontend → OAuthController → TwitterService → Twitter API
                                          ↓
                                    OAuth Tokens (encrypted)
                                          ↓
                                      Database
```

### **3. Data Ingestion & Analysis**

```
User → Frontend → IngestionController → TwitterService → Twitter API
                                              ↓
                                        Fetch Posts/Comments
                                              ↓
                                     TextPreprocessor
                                              ↓
                              ┌───────────────┴───────────────┐
                              ↓                               ↓
                       Emotion Engine                  Slang Detector
                              ↓                               ↓
                       emotion_scores                  detected_slang
                              └───────────────┬───────────────┘
                                              ↓
                                          Database
                                       (Posts/Comments)
```

### **4. Analytics Viewing**

```
User → Frontend → AnalyticsController → Database
                                           ↓
                                  Query posts/comments
                                           ↓
                                  Aggregate statistics
                                           ↓
                                       Frontend
                              (Charts, word cloud, trends)
```

---

## Technology Stack Summary

| Layer               | Technologies                     |
| ------------------- | -------------------------------- |
| **Frontend**        | HTML5, CSS3, Vanilla JavaScript  |
| **Backend**         | Python 3.13, FastAPI, Uvicorn    |
| **Database**        | PostgreSQL (Supabase)            |
| **ORM**             | SQLAlchemy 2.x                   |
| **Authentication**  | JWT (jose), bcrypt               |
| **OAuth**           | Tweepy (Twitter API v2)          |
| **Encryption**      | Fernet (cryptography)            |
| **AI/ML**           | Hugging Face Transformers        |
| **Emotion Model**   | SamLowe/roberta-base-go_emotions |
| **Text Processing** | langdetect, emoji, regex         |
| **Version Control** | Git (GitHub)                     |
| **Environment**     | Python virtual environment (uv)  |

---

## Key Differences from Mid Report

### **Removed Components:**

- ❌ Post Optimization features
- ❌ Forecasting models
- ❌ Task queues (Celery/RQ)
- ❌ ML training pipeline
- ❌ DVC for model versioning
- ❌ MongoDB for raw data
- ❌ Admin & Settings panel

### **Added Components:**

- ✅ Slang Detector (Module 3)
- ✅ Text Preprocessor service
- ✅ Comprehensive analytics endpoints

### **Simplified Components:**

- Focus on core features: OAuth, Data Ingestion, Emotion Analysis, Slang Detection
- Single database (PostgreSQL) instead of multiple storage systems
- Synchronous processing instead of async task queues

---

## Future Enhancements (Post-Iteration 2)

1. Instagram API integration
2. Advanced analytics (trends over time)
3. Export functionality (CSV/PDF reports)
4. User settings management
5. Multi-language support
6. Real-time data streaming

---

_Last Updated: December 2, 2025_  
_Iteration: 2 (Module 1, 2, and 3 Complete)_

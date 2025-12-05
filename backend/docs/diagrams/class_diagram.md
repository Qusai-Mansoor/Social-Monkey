# Class Diagram - SocialMonkey Platform

## System Architecture Overview

This class diagram represents the complete architecture of the SocialMonkey platform across **Iteration 1** (OAuth, Data Ingestion, Text Preprocessing) and **Iteration 2** (Emotion Analysis, Slang Detection, Analytics).

---

## Mermaid Class Diagram

```mermaid
classDiagram
    %% ========================================
    %% CONTROLLERS (API Layer)
    %% ========================================
    class AuthController {
        <<Controller>>
        +register(user_data) Token
        +login(credentials) Token
        +get_current_user(token) User
    }

    class OAuthController {
        <<Controller>>
        +get_oauth_url(platform) OAuthURL
        +handle_callback(code, state) SocialAccount
    }

    class IngestionController {
        <<Controller>>
        +get_accounts(user_id) List~SocialAccount~
        +ingest_data(account_id) IngestionStatus
    }

    class AnalyticsController {
        <<Controller>>
        +get_emotion_trends(user_id) EmotionStats
        +get_slang_stats(user_id) SlangStats
        +get_top_posts(user_id, metric) List~Post~
    }

    %% ========================================
    %% SERVICES (Business Logic Layer)
    %% ========================================
    class TwitterService {
        <<Service>>
        -str client_id
        -str client_secret
        -str callback_url
        -str bearer_token
        -int rate_limit_window
        +get_oauth_url() str
        +handle_callback(code, state, db) SocialAccount
        +fetch_user_tweets(account, db) Dict
        +fetch_tweet_replies(tweet_id, username, client) List
        -_check_rate_limit(endpoint) bool
        -_save_rate_limits() void
    }

    class TextPreprocessor {
        <<Service>>
        -Dict SLANG_DICT
        +normalize_emoji(text) str
        +expand_slang(text) str
        +clean_text(text) str
        +detect_language(text) str
        +preprocess(text) Dict
    }

    class EmotionEngine {
        <<Service>>
        <<Singleton>>
        -classifier pipeline
        +get_instance() EmotionEngine
        +analyze(text) Dict
        -_calculate_sentiment_score(emotion_scores) float
    }

    class SlangDetector {
        <<Service>>
        -Dict GEN_Z_SLANG_DICT
        +detect(text) List~Dict~
    }

    %% ========================================
    %% UTILITIES (Helper Classes)
    %% ========================================
    class TokenEncryption {
        <<Utility>>
        -Fernet cipher
        +encrypt(token) str
        +decrypt(encrypted_token) str
    }

    class SecurityManager {
        <<Utility>>
        +create_access_token(data, expires_delta) str
        +verify_token(token) Dict
        +get_password_hash(password) str
        +verify_password(plain, hashed) bool
        +get_current_user(credentials, db) User
    }

    %% ========================================
    %% MODELS (Database Entities)
    %% ========================================
    class User {
        <<Entity>>
        +int id
        +str email
        +str username
        +str hashed_password
        +bool is_active
        +datetime created_at
        +datetime updated_at
    }

    class SocialAccount {
        <<Entity>>
        +int id
        +int user_id
        +str platform
        +str platform_user_id
        +str platform_username
        +str access_token
        +str refresh_token
        +datetime token_expires_at
        +bool is_active
        +datetime created_at
        +datetime updated_at
    }

    class Post {
        <<Entity>>
        +int id
        +int social_account_id
        +str platform_post_id
        +str content
        +json raw_data
        +str preprocessed_content
        +str language
        +datetime created_at_platform
        +int likes_count
        +int retweets_count
        +int replies_count
        +bool is_preprocessed
        +json emotion_scores
        +str dominant_emotion
        +json detected_slang
        +float sentiment_score
        +datetime created_at
        +datetime updated_at
    }

    class Comment {
        <<Entity>>
        +int id
        +int post_id
        +str platform_comment_id
        +str author_username
        +str content
        +json raw_data
        +str preprocessed_content
        +str language
        +datetime created_at_platform
        +int likes_count
        +bool is_preprocessed
        +json emotion_scores
        +str dominant_emotion
        +json detected_slang
        +float sentiment_score
        +datetime created_at
        +datetime updated_at
    }

    class OAuthState {
        <<Entity>>
        +str state
        +str code_verifier
        +int user_id
        +datetime created_at
    }

    %% ========================================
    %% RELATIONSHIPS
    %% ========================================

    %% Controller Dependencies (dashed arrows with "uses")
    AuthController ..> SecurityManager : uses
    AuthController ..> User : creates/reads

    OAuthController ..> TwitterService : uses
    OAuthController ..> OAuthState : creates/reads
    OAuthController ..> SocialAccount : creates

    IngestionController ..> TwitterService : uses
    IngestionController ..> SocialAccount : reads
    IngestionController ..> Post : creates/updates
    IngestionController ..> Comment : creates/updates

    AnalyticsController ..> Post : analyzes
    AnalyticsController ..> Comment : analyzes

    %% Service Dependencies
    TwitterService ..> TokenEncryption : uses
    TwitterService ..> TextPreprocessor : uses
    TwitterService ..> EmotionEngine : uses
    TwitterService ..> SlangDetector : uses
    TwitterService ..> Post : creates/updates
    TwitterService ..> Comment : creates

    SecurityManager ..> User : authenticates

    %% Entity Relationships (solid lines with multiplicity)
    User "1" o-- "0..*" SocialAccount : owns
    SocialAccount "1" o-- "0..*" Post : has
    Post "1" o-- "0..*" Comment : has
    User "1" o-- "0..*" OAuthState : has

    %% Composition (TokenEncryption is part of SocialAccount lifecycle)
    SocialAccount *-- TokenEncryption : encrypts tokens

```

---

## Legend

| Symbol           | Meaning                                     |
| ---------------- | ------------------------------------------- |
| `<<Controller>>` | API endpoint handlers (FastAPI routers)     |
| `<<Service>>`    | Business logic and external integrations    |
| `<<Utility>>`    | Helper classes and utilities                |
| `<<Entity>>`     | Database models (SQLAlchemy)                |
| `<<Singleton>>`  | Class instantiated only once                |
| `---\|>`         | Generalization (Inheritance)                |
| `o--`            | Aggregation (has-a, independent lifecycle)  |
| `*--`            | Composition (contains, dependent lifecycle) |
| `..>`            | Dependency (uses)                           |
| `-->`            | Association                                 |

---

## Class Descriptions

### Controllers (API Layer)

- **AuthController**: Handles user registration, login, and authentication
- **OAuthController**: Manages OAuth 2.0 flow for social platform connections
- **IngestionController**: Triggers data sync from connected social accounts
- **AnalyticsController**: Provides aggregated analytics and insights

### Services (Business Logic)

- **TwitterService**: OAuth and data fetching for Twitter platform
- **TextPreprocessor**: Cleans and normalizes social media text
- **EmotionEngine**: AI-powered emotion detection using RoBERTa transformer
- **SlangDetector**: Gen-Z slang term identification and interpretation

### Utilities

- **TokenEncryption**: Fernet symmetric encryption for OAuth tokens
- **SecurityManager**: JWT token management and password hashing (bcrypt)

### Entities (Database Models)

- **User**: Platform users with authentication credentials
- **SocialAccount**: Connected social media accounts (Twitter, Instagram)
- **Post**: Social media posts with emotion and slang analysis
- **Comment**: Replies/comments on posts with analysis
- **OAuthState**: Temporary storage for OAuth PKCE flow

---

## Module Breakdown

### Iteration 1 - Core Infrastructure

- **Controllers**: AuthController, OAuthController, IngestionController
- **Services**: TwitterService, TextPreprocessor
- **Utilities**: TokenEncryption, SecurityManager
- **Entities**: User, SocialAccount, Post, Comment, OAuthState

### Iteration 2 - AI & Analytics

- **Services**: EmotionEngine (Module 2), SlangDetector (Module 3)
- **Controllers**: AnalyticsController
- **Entity Extensions**: Added `emotion_scores`, `dominant_emotion`, `detected_slang`, `sentiment_score` to Post and Comment

---

## Key Design Patterns

1. **Singleton Pattern**: EmotionEngine loads ML model once for efficiency
2. **Service Layer Pattern**: Business logic separated from controllers
3. **Repository Pattern**: Database access abstracted through SQLAlchemy ORM
4. **Dependency Injection**: FastAPI `Depends()` for service and auth dependencies
5. **Encryption at Rest**: OAuth tokens encrypted before database storage

---

## Technology Stack

- **Backend Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT (jose library), bcrypt password hashing
- **OAuth**: Twitter OAuth 2.0 with PKCE (Tweepy library)
- **AI/ML**: Hugging Face Transformers (RoBERTa-base-go_emotions)
- **Encryption**: Fernet symmetric encryption (cryptography library)
- **Text Processing**: langdetect, emoji, regex

---

_Generated for SocialMonkey FYP - Iteration 1 & 2 Complete System_

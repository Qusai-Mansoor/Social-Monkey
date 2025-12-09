from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database Configuration
    DATABASE_URL: str
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    
    # JWT Configuration
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 300
        
    # Twitter OAuth Configuration
    TWITTER_CLIENT_ID: str
    TWITTER_CLIENT_SECRET: str
    TWITTER_CALLBACK_URL: str
    TWITTER_BEARER_TOKEN: str
    
    # RapidAPI Twitter Configuration
    RAPIDAPI_KEY: str
    RAPIDAPI_TWITTER_HOST: str = "twitter-api45.p.rapidapi.com"
    
    # Instagram OAuth Configuration
    INSTAGRAM_CLIENT_ID: str
    INSTAGRAM_CLIENT_SECRET: str
    INSTAGRAM_CALLBACK_URL: str
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Social Monkey"
    BACKEND_CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:5173"]'
    
    # Encryption Configuration
    ENCRYPTION_KEY: str
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # Emotion Analysis Model Configuration
    EMOTION_MODEL_PATH: str = "./models/bertweet_goemotions"
    EMOTION_MODEL_THRESHOLD: float = 0.3
    EMOTION_MODEL_MAX_LENGTH: int = 128
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from JSON string"""
        try:
            return json.loads(self.BACKEND_CORS_ORIGINS)
        except:
            return ["http://localhost:3000", "http://localhost:5173"]


settings = Settings()

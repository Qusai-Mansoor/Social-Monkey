"""
Analysis module for Social Monkey.

This module contains emotion analysis and slang detection components.
"""

from app.analysis.emotion_engine import EmotionEngine, analyze_emotion
from app.analysis.slang_detector import SlangDetector

__all__ = [
    "EmotionEngine",
    "analyze_emotion",
    "SlangDetector",
]

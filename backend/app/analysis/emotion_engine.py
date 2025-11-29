from transformers import pipeline
from typing import Dict, Any, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmotionEngine:
    """
    Singleton class for Emotion Analysis using Hugging Face Transformers.
    Loads the model once and reuses it for efficiency.
    """
    _instance = None
    _classifier = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = EmotionEngine()
        return cls._instance

    def __init__(self):
        if EmotionEngine._classifier is None:
            logger.info("Loading Emotion Analysis Model (SamLowe/roberta-base-go_emotions)...")
            try:
                # Load the pipeline
                # top_k=None returns scores for all labels
                EmotionEngine._classifier = pipeline(
                    "text-classification", 
                    model="SamLowe/roberta-base-go_emotions", 
                    top_k=None
                )
                logger.info("Emotion Model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load Emotion Model: {e}")
                raise e

    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyze the emotion of the given text.
        Returns a dictionary with 'scores' (all emotions) and 'dominant' (top emotion).
        """
        if not text or not text.strip():
            return {
                "scores": {},
                "dominant": "neutral",
                "sentiment_score": 0.0
            }

        try:
            # Truncate text to 512 chars to avoid model token limit issues
            # (RoBERTa limit is 512 tokens, approx 2000 chars, but we play safe)
            truncated_text = text[:1500]
            
            results = EmotionEngine._classifier(truncated_text)
            
            # Results is a list of lists of dicts: [[{'label': 'joy', 'score': 0.9}, ...]]
            # We want to flatten this to a simple dict: {'joy': 0.9, ...}
            scores = {item['label']: float(item['score']) for item in results[0]}
            
            # Find dominant emotion
            dominant = max(scores, key=scores.get)
            
            # Calculate a simplified sentiment score (-1 to 1)
            # This is an approximation based on emotion categories
            sentiment_score = self._calculate_sentiment_score(scores)
            
            return {
                "scores": scores,
                "dominant": dominant,
                "sentiment_score": sentiment_score
            }
            
        except Exception as e:
            logger.error(f"Error analyzing emotion: {e}")
            return {
                "scores": {},
                "dominant": "error",
                "sentiment_score": 0.0
            }

    def _calculate_sentiment_score(self, scores: Dict[str, float]) -> float:
        """
        Calculate a rough positive/negative sentiment score from emotion scores.
        """
        positive_emotions = {'admiration', 'amusement', 'approval', 'caring', 'desire', 'excitement', 'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief'}
        negative_emotions = {'anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'embarrassment', 'fear', 'grief', 'nervousness', 'remorse', 'sadness'}
        
        pos_score = sum(scores.get(e, 0) for e in positive_emotions)
        neg_score = sum(scores.get(e, 0) for e in negative_emotions)
        
        # Normalize to -1 to 1 range
        # If neutral is high, this will be close to 0
        return pos_score - neg_score

# Helper function for easy import
def analyze_emotion(text: str) -> Dict[str, Any]:
    engine = EmotionEngine.get_instance()
    return engine.analyze(text)

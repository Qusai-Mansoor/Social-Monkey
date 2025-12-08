from transformers import pipeline
from typing import Dict, Any, List, Optional
import logging
from app.core.config import settings
from app.analysis.slang_normalizer import SlangNormalizer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmotionEngine:
    """
    Singleton class for Emotion Analysis using Fine-tuned BERTweet on GoEmotions.
    Includes integrated slang normalization pipeline.
    
    Pipeline:
    1. Detect slang using NER model
    2. Normalize slang using dictionary lookup
    3. Analyze emotions using BERTweet
    """
    _instance = None
    _classifier = None
    _slang_normalizer = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = EmotionEngine()
        return cls._instance

    def __init__(self):
        if EmotionEngine._classifier is None:
            model_path = settings.EMOTION_MODEL_PATH
            logger.info(f"Loading Emotion Analysis Model ({model_path})...")
            try:
                # Load the fine-tuned BERTweet pipeline
                # top_k=None returns scores for all labels
                EmotionEngine._classifier = pipeline(
                    "text-classification", 
                    model=model_path, 
                    top_k=None
                )
                logger.info(f"✅ BERTweet Emotion Model loaded successfully from {model_path}")
            except Exception as e:
                logger.error(f"Failed to load Emotion Model: {e}")
                logger.error(f"Make sure model files exist at: {model_path}")
                raise e
        
        # Load slang normalizer (lazy loading)
        if EmotionEngine._slang_normalizer is None:
            try:
                EmotionEngine._slang_normalizer = SlangNormalizer.get_instance()
                logger.info("✅ Slang Normalizer loaded successfully")
            except Exception as e:
                logger.warning(f"⚠️  Slang Normalizer failed to load: {e}")
                logger.warning("Emotion analysis will continue without slang normalization")
                EmotionEngine._slang_normalizer = None

    def analyze(self, text: str, normalize_slang: bool = True) -> Dict[str, Any]:
        """
        Analyze the emotion of the given text using fine-tuned BERTweet.
        Optionally normalizes slang before analysis.
        
        Args:
            text: Input text to analyze
            normalize_slang: If True, detects and normalizes slang before emotion analysis
        
        Returns a dictionary with:
            - 'scores': All 28 emotion scores (for database storage)
            - 'dominant': Top emotion
            - 'sentiment_score': Overall sentiment (-1 to 1)
            - 'slang_detected': List of detected slang (if normalization enabled)
            - 'normalized_text': Text after slang normalization (if normalization enabled)
            - 'original_text': Original input text
        """
        if not text or not text.strip():
            return {
                "scores": {},
                "dominant": "neutral",
                "sentiment_score": 0.0,
                "slang_detected": [],
                "normalized_text": text,
                "original_text": text
            }

        try:
            original_text = text
            slang_detected = []
            
            # Step 1: Slang Detection & Normalization
            if normalize_slang and EmotionEngine._slang_normalizer:
                normalized_text, slang_detected = EmotionEngine._slang_normalizer.normalize_text(text)
                
                if slang_detected:
                    logger.info(f"🔍 Detected {len(slang_detected)} slang term(s): {[s['text'] for s in slang_detected]}")
                    text = normalized_text  # Use normalized text for emotion analysis
            else:
                normalized_text = text
            
            # Step 2: Truncate to 128 tokens (BERTweet max sequence length)
            # Roughly 500 characters ≈ 128 tokens
            truncated_text = text[:500]
            
            # Step 3: Emotion Analysis with BERTweet
            results = EmotionEngine._classifier(truncated_text)
            
            # Get ALL emotion scores (for database storage)
            all_scores = {
                item['label']: float(item['score'])
                for item in results[0]
            }
            
            # Apply threshold to find significant emotions
            threshold = settings.EMOTION_MODEL_THRESHOLD
            significant_scores = {
                label: score
                for label, score in all_scores.items()
                if score >= threshold
            }
            
            # Find dominant emotion (from significant scores or all scores)
            if significant_scores:
                dominant = max(significant_scores, key=significant_scores.get)
            else:
                # If nothing above threshold, use highest scoring emotion
                dominant = max(all_scores, key=all_scores.get)
            
            # Return ALL scores for database, but note which are significant
            scores = all_scores  # ← Now returns ALL 28 emotions!
            
            # Calculate a simplified sentiment score (-1 to 1)
            # This is an approximation based on emotion categories
            sentiment_score = self._calculate_sentiment_score(scores)
            
            return {
                "scores": scores,
                "dominant": dominant,
                "sentiment_score": sentiment_score,
                "slang_detected": slang_detected,
                "normalized_text": normalized_text,
                "original_text": original_text
            }
            
        except Exception as e:
            logger.error(f"Error analyzing emotion: {e}")
            return {
                "scores": {},
                "dominant": "error",
                "sentiment_score": 0.0,
                "slang_detected": [],
                "normalized_text": text,
                "original_text": text
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

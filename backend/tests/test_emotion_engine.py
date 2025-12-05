"""
Unit tests for emotion analysis engine.

Tests cover singleton pattern, emotion detection, sentiment calculation,
and handling of various text inputs.
"""

import pytest
from app.analysis.emotion_engine import EmotionEngine, analyze_emotion


@pytest.mark.unit
@pytest.mark.emotion
class TestEmotionEngine:
    """Test the EmotionEngine class."""
    
    @pytest.fixture(scope="class")
    def engine(self):
        """Load emotion model once for all tests (singleton pattern)."""
        return EmotionEngine.get_instance()
    
    def test_singleton_pattern(self, engine):
        """Test that EmotionEngine follows singleton pattern."""
        engine2 = EmotionEngine.get_instance()
        
        # Should return the same instance
        assert engine is engine2
        assert id(engine) == id(engine2)
    
    def test_analyze_empty_string(self, engine):
        """Test analysis of empty string."""
        result = engine.analyze("")
        
        assert result["scores"] == {}
        assert result["dominant"] == "neutral"
        assert result["sentiment_score"] == 0.0
    
    def test_analyze_none_input(self, engine):
        """Test analysis of None input."""
        result = engine.analyze(None)
        
        assert result["scores"] == {}
        assert result["dominant"] == "neutral"
        assert result["sentiment_score"] == 0.0
    
    def test_analyze_whitespace_only(self, engine):
        """Test analysis of whitespace-only string."""
        result = engine.analyze("   \n\t  ")
        
        assert result["scores"] == {}
        assert result["dominant"] == "neutral"
        assert result["sentiment_score"] == 0.0
    
    def test_analyze_positive_emotion(self, engine, positive_emotion_text):
        """Test detection of positive emotions."""
        # positive_emotion_text: "I'm so happy and grateful..."
        result = engine.analyze(positive_emotion_text)
        
        assert "scores" in result
        assert "dominant" in result
        assert "sentiment_score" in result
        
        # Should detect positive emotion
        positive_emotions = ["joy", "excitement", "optimism", "gratitude", "admiration"]
        assert result["dominant"] in positive_emotions
        
        # Sentiment score should be positive
        assert result["sentiment_score"] > 0
    
    def test_analyze_negative_emotion(self, engine, negative_emotion_text):
        """Test detection of negative emotions."""
        # negative_emotion_text: "This is terrible and disappointing..."
        result = engine.analyze(negative_emotion_text)
        
        # Should detect negative emotion
        negative_emotions = ["sadness", "anger", "disappointment", "annoyance", "disgust", "frustration"]
        assert result["dominant"] in negative_emotions
        
        # Sentiment score should be negative
        assert result["sentiment_score"] < 0
    
    def test_emotion_scores_structure(self, engine):
        """Test that all 28 emotion scores are returned."""
        text = "This is an interesting piece of content to analyze"
        result = engine.analyze(text)
        
        # Should have scores for all 28 emotions
        assert len(result["scores"]) == 28
        
        # All scores should be floats between 0 and 1
        for emotion, score in result["scores"].items():
            assert isinstance(score, float)
            assert 0 <= score <= 1
    
    def test_dominant_emotion_is_highest(self, engine):
        """Test that dominant emotion has the highest score."""
        text = "I absolutely love this wonderful amazing fantastic thing!"
        result = engine.analyze(text)
        
        dominant = result["dominant"]
        dominant_score = result["scores"][dominant]
        
        # Dominant emotion should have highest score
        for emotion, score in result["scores"].items():
            if emotion != dominant:
                assert score <= dominant_score
    
    def test_sentiment_score_range(self, engine):
        """Test that sentiment score is in valid range."""
        texts = [
            "This is great and wonderful!",
            "This is terrible and awful.",
            "This is neutral content."
        ]
        
        for text in texts:
            result = engine.analyze(text)
            
            # Sentiment should be approximately between -1 and 1 (allow small floating point overflow)
            assert -1.1 <= result["sentiment_score"] <= 1.1
    
    def test_joy_emotion_detection(self, engine):
        """Test specific detection of joy emotion."""
        text = "I'm so happy and joyful! This is the best day ever!"
        result = engine.analyze(text)
        
        # Joy should be among top emotions
        assert "joy" in result["scores"]
        assert result["scores"]["joy"] > 0.3  # Reasonable threshold
    
    def test_sadness_emotion_detection(self, engine):
        """Test specific detection of sadness emotion."""
        text = "I'm so sad and heartbroken. This is devastating."
        result = engine.analyze(text)
        
        # Sadness should be among top emotions
        assert "sadness" in result["scores"]
        assert result["scores"]["sadness"] > 0.3
    
    def test_anger_emotion_detection(self, engine):
        """Test specific detection of anger emotion."""
        text = "I'm furious and enraged! This is unacceptable and infuriating!"
        result = engine.analyze(text)
        
        # Anger should be detected
        assert "anger" in result["scores"]
        assert result["scores"]["anger"] > 0.2
    
    def test_analyze_function_wrapper(self, positive_emotion_text):
        """Test the analyze_emotion wrapper function."""
        result = analyze_emotion(positive_emotion_text)
        
        # Should return same structure as engine.analyze()
        assert "scores" in result
        assert "dominant" in result
        assert "sentiment_score" in result
        assert len(result["scores"]) == 28
    
    def test_long_text_truncation(self, engine):
        """Test that long text is properly truncated."""
        # Create text longer than 1500 characters
        long_text = "This is a test sentence. " * 100
        
        result = engine.analyze(long_text)
        
        # Should still return valid results
        assert "scores" in result
        assert len(result["scores"]) == 28
        assert result["dominant"] is not None
    
    def test_social_media_text_with_slang(self, engine, sample_slang_text):
        """Test emotion analysis on social media text with slang."""
        # sample_slang_text: "no cap this song slaps fr fr..."
        result = engine.analyze(sample_slang_text)
        
        # Should still detect emotions
        assert len(result["scores"]) == 28
        assert result["dominant"] is not None
        assert isinstance(result["sentiment_score"], float)
    
    def test_mixed_emotions(self, engine):
        """Test analysis of text with mixed emotions."""
        text = "I'm happy about the success but sad about the sacrifice it required."
        result = engine.analyze(text)
        
        # Should detect both positive and negative emotions
        assert result["scores"]["joy"] > 0 or result["scores"]["happiness"] > 0
        assert result["scores"]["sadness"] > 0
        
        # Sentiment might be slightly positive or negative
        assert -1 <= result["sentiment_score"] <= 1
    
    def test_neutral_text(self, engine):
        """Test analysis of neutral factual text."""
        text = "The weather report indicates 72 degrees Fahrenheit today."
        result = engine.analyze(text)
        
        # Sentiment should be close to neutral
        assert abs(result["sentiment_score"]) < 0.5
    
    def test_text_with_emojis(self, engine):
        """Test analysis of text containing emojis."""
        text = "This is amazing! 😊🎉👍"
        result = engine.analyze(text)
        
        # Should still analyze successfully
        assert len(result["scores"]) == 28
        assert result["dominant"] is not None
    
    def test_multiple_analyses_same_text(self, engine):
        """Test that analyzing same text multiple times gives consistent results."""
        text = "This is a wonderful and amazing experience!"
        
        result1 = engine.analyze(text)
        result2 = engine.analyze(text)
        
        # Results should be identical
        assert result1["dominant"] == result2["dominant"]
        assert result1["sentiment_score"] == result2["sentiment_score"]
        assert result1["scores"] == result2["scores"]
    
    def test_error_handling_graceful(self, engine):
        """Test that errors are handled gracefully."""
        # Test with potentially problematic input
        problematic_inputs = [
            "🔥" * 100,  # Many emojis
            "a" * 2000,  # Very long repeated character
            "!@#$%^&*()",  # Special characters only
        ]
        
        for text in problematic_inputs:
            result = engine.analyze(text)
            
            # Should not crash, should return valid structure
            assert "scores" in result
            assert "dominant" in result
            assert "sentiment_score" in result

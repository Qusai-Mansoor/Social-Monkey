"""
Unit tests for text preprocessing utilities.

Tests cover URL removal, mention removal, emoji normalization,
language detection, and whitespace cleaning.
"""

import pytest
from app.utils.preprocessing import TextPreprocessor


@pytest.mark.unit
@pytest.mark.preprocessing
class TestTextPreprocessor:
    """Test the TextPreprocessor class."""
    
    @pytest.fixture
    def preprocessor(self):
        """Create preprocessor instance for testing."""
        return TextPreprocessor()
    
    def test_preprocess_empty_string(self, preprocessor):
        """Test preprocessing of empty string."""
        result, language = preprocessor.preprocess("")
        
        assert result == ""
        assert language is None
    
    def test_preprocess_none_input(self, preprocessor):
        """Test preprocessing of None input."""
        result, language = preprocessor.preprocess(None)
        
        assert result == ""
        assert language is None
    
    def test_remove_urls_http(self, preprocessor):
        """Test removal of HTTP URLs."""
        input_text = "Check this out https://example.com awesome!"
        result, _ = preprocessor.preprocess(input_text)
        
        assert "https://example.com" not in result
        assert "check this out" in result.lower()
        assert "awesome" in result
    
    def test_remove_urls_www(self, preprocessor):
        """Test removal of www URLs."""
        input_text = "Visit www.example.com for more info"
        result, _ = preprocessor.preprocess(input_text)
        
        assert "www.example.com" not in result
        assert "visit" in result.lower()
        assert "for more info" in result
    
    def test_remove_multiple_urls(self, preprocessor):
        """Test removal of multiple URLs."""
        input_text = "Check https://site1.com and https://site2.com also www.site3.com"
        result, _ = preprocessor.preprocess(input_text)
        
        assert "https://site1.com" not in result
        assert "https://site2.com" not in result
        assert "www.site3.com" not in result
        assert "check" in result.lower()
        assert "and" in result
    
    def test_remove_mentions(self, preprocessor):
        """Test removal of @mentions."""
        input_text = "Hey @john_doe what's up?"
        result, _ = preprocessor.preprocess(input_text)
        
        assert "@john_doe" not in result
        assert "hey" in result.lower()
        assert "what's up" in result
    
    def test_remove_multiple_mentions(self, preprocessor):
        """Test removal of multiple @mentions."""
        input_text = "@user1 @user2 this is interesting @user3"
        result, _ = preprocessor.preprocess(input_text)
        
        assert "@user1" not in result
        assert "@user2" not in result
        assert "@user3" not in result
        assert "this is interesting" in result
    
    def test_remove_hashtag_symbol(self, preprocessor):
        """Test removal of # symbol from hashtags."""
        input_text = "This is #trending and #viral"
        result, _ = preprocessor.preprocess(input_text)
        
        assert "#" not in result
        assert "trending" in result
        assert "viral" in result
    
    def test_normalize_emoji(self, preprocessor):
        """Test emoji normalization to text."""
        input_text = "I'm so happy 😊🎉"
        result = preprocessor.normalize_emoji(input_text)
        
        # Emojis should be converted to text
        assert "😊" not in result
        assert "🎉" not in result
        # Should contain emoji descriptions
        assert any(word in result.lower() for word in ["smiling", "face", "party", "popper"])
    
    def test_normalize_multiple_emojis(self, preprocessor):
        """Test normalization of multiple emojis."""
        input_text = "Great work! 👍😊🎉🔥"
        result = preprocessor.normalize_emoji(input_text)
        
        # No emoji characters should remain
        assert "👍" not in result
        assert "😊" not in result
        assert "🎉" not in result
        assert "🔥" not in result
    
    def test_detect_language_english(self, preprocessor):
        """Test language detection for English text."""
        input_text = "This is an English sentence with enough text to detect language"
        _, language = preprocessor.preprocess(input_text)
        
        assert language == "en"
    
    def test_detect_language_short_text(self, preprocessor):
        """Test language detection with very short text."""
        input_text = "Hi"
        _, language = preprocessor.preprocess(input_text)
        
        # Short text may not be reliably detected
        assert language is None or isinstance(language, str)
    
    def test_remove_extra_whitespace(self, preprocessor):
        """Test removal of extra whitespace."""
        input_text = "This   has    multiple     spaces"
        result, _ = preprocessor.preprocess(input_text)
        
        # Should have single spaces and be lowercase
        assert "  " not in result
        assert result == "this has multiple spaces"
    
    def test_remove_leading_trailing_whitespace(self, preprocessor):
        """Test removal of leading and trailing whitespace."""
        input_text = "   text with spaces   "
        result, _ = preprocessor.preprocess(input_text)
        
        assert result == "text with spaces"
        assert not result.startswith(" ")
        assert not result.endswith(" ")
    
    def test_full_preprocessing_pipeline(self, preprocessor, sample_tweet_text):
        """Test complete preprocessing pipeline."""
        # sample_tweet_text from fixture:
        # "Hey @user check out https://example.com this is amazing! 😊 #trending"
        result, language = preprocessor.preprocess(sample_tweet_text)
        
        # Should remove URL
        assert "https://example.com" not in result
        
        # Should remove mention
        assert "@user" not in result
        
        # Should remove hashtag symbol
        assert "#trending" not in result
        assert "trending" in result
        
        # Should normalize emoji
        assert "😊" not in result
        
        # Should detect English
        assert language == "en"
        
        # Core content should remain (lowercase)
        assert "hey" in result.lower()
        assert "check out" in result
        assert "this is amazing" in result
    
    def test_preserve_text_content(self, preprocessor):
        """Test that actual text content is preserved."""
        input_text = "The quick brown fox jumps over the lazy dog"
        result, _ = preprocessor.preprocess(input_text)
        
        # Text should be lowercased after slang expansion
        assert result == "the quick brown fox jumps over the lazy dog"
    
    def test_handle_only_special_characters(self, preprocessor):
        """Test handling text with only special characters."""
        input_text = "@user #hashtag https://example.com"
        result, _ = preprocessor.preprocess(input_text)
        
        # Should result in empty or minimal text
        assert len(result.strip()) < len(input_text)
        assert "@user" not in result
        assert "#hashtag" not in result
        assert "https://example.com" not in result
    
    def test_mixed_content_preprocessing(self, preprocessor):
        """Test preprocessing of mixed content."""
        input_text = "RT @user: Check https://link.com #AI is amazing! 😊🤖 cc @friend"
        result, language = preprocessor.preprocess(input_text)
        
        # All special elements should be removed/normalized
        assert "@user" not in result
        assert "@friend" not in result
        assert "https://link.com" not in result
        assert "#" not in result
        assert "😊" not in result
        assert "🤖" not in result
        
        # Core message should remain (lowercase after slang expansion)
        assert "retweet" in result.lower() or "rt" in result  # RT might be expanded
        assert "check" in result.lower()
        assert "ai" in result.lower()
        assert "amazing" in result

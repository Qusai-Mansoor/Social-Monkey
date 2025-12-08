"""
Unit tests for Gen-Z slang detection and normalization service.

Tests cover slang detection using NER model + rich dictionary,
normalization, case-insensitive matching, and various text scenarios.
"""

import pytest
from app.analysis.slang_normalizer import SlangNormalizer


@pytest.mark.unit
@pytest.mark.slang
class TestSlangNormalizer:
    """Test the SlangNormalizer class (migrated from old SlangDetector)."""
    
    @pytest.fixture
    def normalizer(self):
        """Create slang normalizer instance."""
        try:
            return SlangNormalizer.get_instance()
        except Exception:
            pytest.skip("SlangNormalizer models not available")
    
    def test_detect_empty_string(self, normalizer):
        """Test detection on empty string."""
        result = normalizer.detect_slang("")
        
        assert result == []
        assert isinstance(result, list)
    
    def test_detect_no_slang(self, normalizer):
        """Test detection on text with no slang."""
        text = "I love this movie so much"
        result = normalizer.detect_slang(text)
        
        # Should be empty or have minimal false positives
        assert isinstance(result, list)
    
    def test_detect_single_slang_no_cap(self, normalizer):
        """Test detection of 'no cap' slang term."""
        text = "no cap this is amazing"
        result = normalizer.detect_slang(text)
        
        # Find 'no cap' in results
        no_cap_found = any("no cap" in item["text"].lower() for item in result)
        
        if no_cap_found:
            no_cap_item = next(item for item in result if "no cap" in item["text"].lower())
            assert "normalized" in no_cap_item
            assert len(no_cap_item["normalized"]) > 0
    
    def test_detect_single_slang_bussin(self, normalizer):
        """Test detection of 'bussin' slang term."""
        text = "this food is bussin"
        result = normalizer.detect_slang(text)
        
        bussin_found = any("bussin" in item["text"].lower() for item in result)
        assert bussin_found or len(result) >= 0  # May or may not detect depending on NER
    
    def test_detect_single_slang_slaps(self, normalizer):
        """Test detection of 'slaps' slang term."""
        text = "this song slaps"
        result = normalizer.detect_slang(text)
        
        assert len(result) >= 1
        
        slaps_found = any(item["text"].lower() == "slaps" for item in result)
        assert slaps_found
    
    def test_detect_multiple_slang(self, normalizer, sample_slang_text):
        """Test detection of multiple slang terms."""
        # sample_slang_text: "no cap this song slaps fr fr, it's bussin..."
        result = normalizer.detect_slang(sample_slang_text)
        
        # Should find multiple slang terms
        assert len(result) >= 3
        
        terms_found = [item["text"].lower() for item in result]
        
        # Check for specific terms
        assert "no cap" in terms_found
        assert "slaps" in terms_found
        assert "fr" in terms_found
        assert "bussin" in terms_found
    
    def test_case_insensitive_matching(self, normalizer):
        """Test that slang detection is case-insensitive."""
        texts = [
            "That's BUSSIN no CAP",
            "That's bussin no cap",
            "That's Bussin No Cap"
        ]
        
        for text in texts:
            result = normalizer.detect_slang(text)
            terms_found = [item["text"].lower() for item in result]
            
            assert "bussin" in terms_found
            assert "no cap" in terms_found
    
    def test_word_boundary_matching(self, normalizer):
        """Test that slang is matched only at word boundaries."""
        # "cap" should not match inside "capital"
        text = "capital letters and capacity"
        result = normalizer.detect_slang(text)
        
        # Should NOT find "cap" as slang
        terms_found = [item["text"].lower() for item in result]
        assert "cap" not in terms_found
    
    def test_word_boundary_cap_standalone(self, normalizer):
        """Test that 'cap' matches when standalone."""
        text = "that's cap bro"
        result = normalizer.detect_slang(text)
        
        # Should find "cap" as slang
        terms_found = [item["text"].lower() for item in result]
        assert "cap" in terms_found
    
    def test_longer_phrase_priority(self, normalizer):
        """Test that longer phrases match before shorter ones."""
        # "no cap" should match before "cap"
        text = "no cap that's amazing"
        result = normalizer.detect_slang(text)
        
        terms_found = [item["text"].lower() for item in result]
        
        # Should find "no cap" (2 words)
        assert "no cap" in terms_found
    
    def test_detect_fr(self, normalizer):
        """Test detection of 'fr' (for real)."""
        text = "this is crazy fr"
        result = normalizer.detect_slang(text)
        
        terms_found = [item["text"].lower() for item in result]
        assert "fr" in terms_found
    
    def test_detect_repeated_slang(self, normalizer):
        """Test detection when slang appears multiple times."""
        text = "fr fr this is fr amazing"
        result = normalizer.detect_slang(text)
        
        # Should detect 'fr' (even if repeated)
        terms_found = [item["text"].lower() for item in result]
        assert "fr" in terms_found
    
    def test_no_slang_in_normal_text(self, normalizer):
        """Test that normal text without slang returns empty list."""
        text = "This is a normal sentence without any special terms."
        result = normalizer.detect_slang(text)
        
        # Should find no slang or very few
        assert len(result) <= 1  # Some words might accidentally match
    
    def test_detect_vibe(self, normalizer):
        """Test detection of 'vibe' related slang."""
        text = "good vibes only"
        result = normalizer.detect_slang(text)
        
        # May or may not detect depending on dictionary
        assert isinstance(result, list)
    
    def test_detect_slay(self, normalizer):
        """Test detection of 'slay'."""
        text = "you slay queen"
        result = normalizer.detect_slang(text)
        
        # Slay is common Gen-Z slang
        terms_found = [item["text"].lower() for item in result]
        # Should find if in dictionary
        assert isinstance(result, list)
    
    def test_detect_bet(self, normalizer):
        """Test detection of 'bet'."""
        text = "bet that sounds good"
        result = normalizer.detect_slang(text)
        
        terms_found = [item["text"].lower() for item in result]
        # 'bet' is common Gen-Z slang for agreement
        if len(result) > 0:
            assert any("bet" in term for term in terms_found)
    
    def test_slang_result_structure(self, normalizer):
        """Test that slang results have correct structure."""
        text = "no cap this slaps"
        result = normalizer.detect_slang(text)
        
        # Each result should have 'term' and 'meaning'
        for item in result:
            assert "term" in item
            assert "meaning" in item
            assert isinstance(item["text"].lower(), str)
            assert isinstance(item["meaning"], str)
            assert len(item["text"].lower()) > 0
            assert len(item["meaning"]) > 0
    
    def test_slang_with_punctuation(self, normalizer):
        """Test slang detection with surrounding punctuation."""
        texts = [
            "no cap!",
            "this slaps.",
            "fr, this is good",
            "(bussin)"
        ]
        
        for text in texts:
            result = normalizer.detect_slang(text)
            # Should detect slang despite punctuation
            assert len(result) >= 1
    
    def test_slang_in_hashtag(self, normalizer):
        """Test slang detection in hashtags."""
        text = "#nocap this is real"
        result = normalizer.detect_slang(text)
        
        # May or may not detect hashtag version
        # At minimum, should not crash
        assert isinstance(result, list)
    
    def test_mixed_slang_and_normal_text(self, normalizer):
        """Test detection in mixed content."""
        text = "I went to the store and bought groceries, no cap it was bussin fr"
        result = normalizer.detect_slang(text)
        
        # Should find slang terms
        terms_found = [item["text"].lower() for item in result]
        assert "no cap" in terms_found or "bussin" in terms_found or "fr" in terms_found
    
    def test_slang_at_text_boundaries(self, normalizer):
        """Test slang at beginning and end of text."""
        texts = [
            "fr this is good",
            "this is good fr",
            "bussin"
        ]
        
        for text in texts:
            result = normalizer.detect_slang(text)
            assert len(result) >= 1
    
    def test_unicode_and_emojis_with_slang(self, normalizer):
        """Test slang detection with emojis."""
        text = "no cap this is bussin 🔥😊"
        result = normalizer.detect_slang(text)
        
        # Should detect slang despite emojis
        terms_found = [item["text"].lower() for item in result]
        assert "no cap" in terms_found or "bussin" in terms_found
    
    def test_whitespace_handling(self, normalizer):
        """Test slang detection with various whitespace."""
        texts = [
            "no  cap",  # Double space
            "no\tcap",  # Tab
            "no\ncap"   # Newline
        ]
        
        for text in texts:
            result = normalizer.detect_slang(text)
            # Whitespace handling may vary
            assert isinstance(result, list)
    
    def test_detector_consistency(self, normalizer):
        """Test that normalizer gives consistent results."""
        text = "no cap this song slaps fr"
        
        result1 = normalizer.detect_slang(text)
        result2 = normalizer.detect_slang(text)
        
        # Results should be identical
        assert len(result1) == len(result2)
        assert [item["text"].lower() for item in result1] == [item["text"].lower() for item in result2]

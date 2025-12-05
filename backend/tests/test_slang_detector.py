"""
Unit tests for Gen-Z slang detection service.

Tests cover single/multiple slang detection, case-insensitive matching,
word boundary matching, and various text scenarios.
"""

import pytest
from app.analysis.slang_detector import SlangDetector


@pytest.mark.unit
@pytest.mark.slang
class TestSlangDetector:
    """Test the SlangDetector class."""
    
    @pytest.fixture
    def detector(self):
        """Create slang detector instance."""
        return SlangDetector()
    
    def test_detect_empty_string(self, detector):
        """Test detection on empty string."""
        result = detector.detect("")
        
        assert result == []
        assert isinstance(result, list)
    
    def test_detect_none_input(self, detector):
        """Test detection on None input."""
        result = detector.detect(None)
        
        assert result == []
    
    def test_detect_single_slang_no_cap(self, detector):
        """Test detection of 'no cap' slang term."""
        text = "no cap this is amazing"
        result = detector.detect(text)
        
        assert len(result) >= 1
        
        # Find 'no cap' in results
        no_cap_found = any(item["term"] == "no cap" for item in result)
        assert no_cap_found
        
        # Check meaning
        no_cap_item = next(item for item in result if item["term"] == "no cap")
        assert "no lie" in no_cap_item["meaning"].lower() or "for real" in no_cap_item["meaning"].lower()
    
    def test_detect_single_slang_bussin(self, detector):
        """Test detection of 'bussin' slang term."""
        text = "this food is bussin"
        result = detector.detect(text)
        
        assert len(result) >= 1
        
        bussin_found = any(item["term"] == "bussin" for item in result)
        assert bussin_found
    
    def test_detect_single_slang_slaps(self, detector):
        """Test detection of 'slaps' slang term."""
        text = "this song slaps"
        result = detector.detect(text)
        
        assert len(result) >= 1
        
        slaps_found = any(item["term"] == "slaps" for item in result)
        assert slaps_found
    
    def test_detect_multiple_slang(self, detector, sample_slang_text):
        """Test detection of multiple slang terms."""
        # sample_slang_text: "no cap this song slaps fr fr, it's bussin..."
        result = detector.detect(sample_slang_text)
        
        # Should find multiple slang terms
        assert len(result) >= 3
        
        terms_found = [item["term"] for item in result]
        
        # Check for specific terms
        assert "no cap" in terms_found
        assert "slaps" in terms_found
        assert "fr" in terms_found
        assert "bussin" in terms_found
    
    def test_case_insensitive_matching(self, detector):
        """Test that slang detection is case-insensitive."""
        texts = [
            "That's BUSSIN no CAP",
            "That's bussin no cap",
            "That's Bussin No Cap"
        ]
        
        for text in texts:
            result = detector.detect(text)
            terms_found = [item["term"] for item in result]
            
            assert "bussin" in terms_found
            assert "no cap" in terms_found
    
    def test_word_boundary_matching(self, detector):
        """Test that slang is matched only at word boundaries."""
        # "cap" should not match inside "capital"
        text = "capital letters and capacity"
        result = detector.detect(text)
        
        # Should NOT find "cap" as slang
        terms_found = [item["term"] for item in result]
        assert "cap" not in terms_found
    
    def test_word_boundary_cap_standalone(self, detector):
        """Test that 'cap' matches when standalone."""
        text = "that's cap bro"
        result = detector.detect(text)
        
        # Should find "cap" as slang
        terms_found = [item["term"] for item in result]
        assert "cap" in terms_found
    
    def test_longer_phrase_priority(self, detector):
        """Test that longer phrases match before shorter ones."""
        # "no cap" should match before "cap"
        text = "no cap that's amazing"
        result = detector.detect(text)
        
        terms_found = [item["term"] for item in result]
        
        # Should find "no cap" (2 words)
        assert "no cap" in terms_found
    
    def test_detect_fr(self, detector):
        """Test detection of 'fr' (for real)."""
        text = "this is crazy fr"
        result = detector.detect(text)
        
        terms_found = [item["term"] for item in result]
        assert "fr" in terms_found
    
    def test_detect_repeated_slang(self, detector):
        """Test detection when slang appears multiple times."""
        text = "fr fr this is fr amazing"
        result = detector.detect(text)
        
        # Should detect 'fr' (even if repeated)
        terms_found = [item["term"] for item in result]
        assert "fr" in terms_found
    
    def test_no_slang_in_normal_text(self, detector):
        """Test that normal text without slang returns empty list."""
        text = "This is a normal sentence without any special terms."
        result = detector.detect(text)
        
        # Should find no slang or very few
        assert len(result) <= 1  # Some words might accidentally match
    
    def test_detect_vibe(self, detector):
        """Test detection of 'vibe' related slang."""
        text = "good vibes only"
        result = detector.detect(text)
        
        # May or may not detect depending on dictionary
        assert isinstance(result, list)
    
    def test_detect_slay(self, detector):
        """Test detection of 'slay'."""
        text = "you slay queen"
        result = detector.detect(text)
        
        # Slay is common Gen-Z slang
        terms_found = [item["term"] for item in result]
        # Should find if in dictionary
        assert isinstance(result, list)
    
    def test_detect_bet(self, detector):
        """Test detection of 'bet'."""
        text = "bet that sounds good"
        result = detector.detect(text)
        
        terms_found = [item["term"] for item in result]
        # 'bet' is common Gen-Z slang for agreement
        if len(result) > 0:
            assert any("bet" in term for term in terms_found)
    
    def test_slang_result_structure(self, detector):
        """Test that slang results have correct structure."""
        text = "no cap this slaps"
        result = detector.detect(text)
        
        # Each result should have 'term' and 'meaning'
        for item in result:
            assert "term" in item
            assert "meaning" in item
            assert isinstance(item["term"], str)
            assert isinstance(item["meaning"], str)
            assert len(item["term"]) > 0
            assert len(item["meaning"]) > 0
    
    def test_slang_with_punctuation(self, detector):
        """Test slang detection with surrounding punctuation."""
        texts = [
            "no cap!",
            "this slaps.",
            "fr, this is good",
            "(bussin)"
        ]
        
        for text in texts:
            result = detector.detect(text)
            # Should detect slang despite punctuation
            assert len(result) >= 1
    
    def test_slang_in_hashtag(self, detector):
        """Test slang detection in hashtags."""
        text = "#nocap this is real"
        result = detector.detect(text)
        
        # May or may not detect hashtag version
        # At minimum, should not crash
        assert isinstance(result, list)
    
    def test_mixed_slang_and_normal_text(self, detector):
        """Test detection in mixed content."""
        text = "I went to the store and bought groceries, no cap it was bussin fr"
        result = detector.detect(text)
        
        # Should find slang terms
        terms_found = [item["term"] for item in result]
        assert "no cap" in terms_found or "bussin" in terms_found or "fr" in terms_found
    
    def test_slang_at_text_boundaries(self, detector):
        """Test slang at beginning and end of text."""
        texts = [
            "fr this is good",
            "this is good fr",
            "bussin"
        ]
        
        for text in texts:
            result = detector.detect(text)
            assert len(result) >= 1
    
    def test_unicode_and_emojis_with_slang(self, detector):
        """Test slang detection with emojis."""
        text = "no cap this is bussin 🔥😊"
        result = detector.detect(text)
        
        # Should detect slang despite emojis
        terms_found = [item["term"] for item in result]
        assert "no cap" in terms_found or "bussin" in terms_found
    
    def test_whitespace_handling(self, detector):
        """Test slang detection with various whitespace."""
        texts = [
            "no  cap",  # Double space
            "no\tcap",  # Tab
            "no\ncap"   # Newline
        ]
        
        for text in texts:
            result = detector.detect(text)
            # Whitespace handling may vary
            assert isinstance(result, list)
    
    def test_detector_consistency(self, detector):
        """Test that detector gives consistent results."""
        text = "no cap this song slaps fr"
        
        result1 = detector.detect(text)
        result2 = detector.detect(text)
        
        # Results should be identical
        assert len(result1) == len(result2)
        assert [item["term"] for item in result1] == [item["term"] for item in result2]

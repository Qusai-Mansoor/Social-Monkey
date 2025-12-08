"""
Slang Detection and Normalization Pipeline
Uses spaCy NER model + slang dictionary to normalize Gen-Z slang
"""

import spacy
import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)


class SlangNormalizer:
    """
    Detects and normalizes slang using NER model + dictionary lookup
    
    Pipeline:
    1. Detect slang terms using spaCy NER model
    2. Look up slang in rich dictionary
    3. Replace slang with normalized descriptive form
    """
    
    _instance = None
    _nlp = None
    _slang_dict = None
    
    @classmethod
    def get_instance(cls):
        """Singleton pattern to load models once"""
        if cls._instance is None:
            cls._instance = SlangNormalizer()
        return cls._instance
    
    def __init__(self):
        if SlangNormalizer._nlp is None:
            self._load_models()
    
    def _load_models(self):
        """Load spaCy NER model and slang dictionary"""
        try:
            # Load spaCy NER model (backend/models/slang_ner_model)
            backend_dir = Path(__file__).parent.parent.parent
            model_path = backend_dir / "models" / "slang_ner_model"
            logger.info(f"📥 Loading Slang NER model from {model_path}...")
            SlangNormalizer._nlp = spacy.load(model_path)
            logger.info("✅ Slang NER model loaded successfully")
            
            # Load slang dictionary (backend/slang_rich_dictionary.json)
            dict_path = backend_dir / "slang_rich_dictionary.json"
            logger.info(f"📥 Loading slang dictionary from {dict_path}...")
            with open(dict_path, 'r', encoding='utf-8') as f:
                SlangNormalizer._slang_dict = json.load(f)
            logger.info(f"✅ Loaded {len(SlangNormalizer._slang_dict)} slang terms")
            
        except Exception as e:
            logger.error(f"❌ Failed to load slang models: {e}")
            # Fallback: create empty models
            SlangNormalizer._nlp = None
            SlangNormalizer._slang_dict = {}
            raise e
    
    def _is_valid_slang(self, text: str) -> bool:
        """
        Check if detected entity is actually valid slang (not @mention, #hashtag, URL, etc.)
        
        Args:
            text: The detected entity text
            
        Returns:
            True if valid slang, False otherwise
        """
        # Remove whitespace
        text = text.strip()
        
        if not text:
            return False
        
        # Filter out @mentions (Twitter usernames)
        if text.startswith('@'):
            return False
        
        # Filter out #hashtags
        if text.startswith('#'):
            return False
        
        # Filter out URLs
        url_pattern = r'https?://|www\.|\.(com|org|net|io|co|edu|gov)'
        if re.search(url_pattern, text, re.IGNORECASE):
            return False
        
        # Filter out email addresses
        if '@' in text and '.' in text:
            return False
        
        # Filter out pure numbers or dates
        if re.match(r'^[\d\s/\-:.,]+$', text):
            return False
        
        # Filter out single punctuation or symbols
        if re.match(r'^[^a-zA-Z0-9]+$', text):
            return False
        
        # Filter out tokens that are too long (likely not slang)
        if len(text) > 50:
            return False
        
        return True
    
    def detect_slang(self, text: str) -> List[Dict]:
        """
        Detect all slang terms in text using NER model
        
        Args:
            text: Input text to analyze
        
        Returns:
            List of detected slang with positions:
            [
                {
                    "text": "bussin",
                    "start": 13,
                    "end": 19,
                    "normalized": "really good/awesome"
                }
            ]
        """
        if not SlangNormalizer._nlp:
            return []
        
        try:
            doc = SlangNormalizer._nlp(text)
            detected = []
            
            for ent in doc.ents:
                if ent.label_ == "SLANG":
                    # Pre-filter: Skip invalid slang patterns
                    if not self._is_valid_slang(ent.text):
                        continue
                    
                    slang_term = ent.text.lower()
                    
                    # Look up in dictionary
                    normalized = self._lookup_slang(slang_term)
                    
                    detected.append({
                        "text": ent.text,
                        "start": ent.start_char,
                        "end": ent.end_char,
                        "normalized": normalized,
                        "original": slang_term
                    })
            
            return detected
            
        except Exception as e:
            logger.error(f"Error detecting slang: {e}")
            return []
    
    def _lookup_slang(self, slang: str) -> str:
        """
        Look up slang in dictionary and return normalized form
        
        Priority:
        1. description (most descriptive)
        2. normalized_text
        3. full_form
        4. original slang (if not found)
        """
        slang_lower = slang.lower()
        
        # Direct lookup
        if slang_lower in SlangNormalizer._slang_dict:
            entry = SlangNormalizer._slang_dict[slang_lower]
            
            # Priority: description > normalized_text > full_form
            if entry.get('description'):
                return entry['description']
            elif entry.get('normalized_text'):
                return entry['normalized_text']
            elif entry.get('full_form'):
                return entry['full_form']
        
        # Check variations
        for key, entry in SlangNormalizer._slang_dict.items():
            variations = entry.get('variations', [])
            if slang_lower in [v.lower() for v in variations]:
                if entry.get('description'):
                    return entry['description']
                elif entry.get('normalized_text'):
                    return entry['normalized_text']
                elif entry.get('full_form'):
                    return entry['full_form']
        
        # Not found in dictionary
        return slang
    
    def normalize_text(self, text: str, keep_original: bool = False) -> Tuple[str, List[Dict]]:
        """
        Normalize slang in text
        
        Args:
            text: Input text with slang
            keep_original: If True, adds normalized form in parentheses
                          If False, replaces slang entirely
        
        Returns:
            (normalized_text, detected_slang_list)
        
        Examples:
            "ngl this is bussin fr" →
            "not gonna lie this is really good/awesome for real"
            
            With keep_original=True:
            "ngl (not gonna lie) this is bussin (really good) fr (for real)"
        """
        detected = self.detect_slang(text)
        
        if not detected:
            return text, []
        
        # Sort by position (reverse order to avoid offset issues)
        detected_sorted = sorted(detected, key=lambda x: x['start'], reverse=True)
        
        normalized_text = text
        for slang in detected_sorted:
            original = slang['text']
            replacement = slang['normalized']
            start = slang['start']
            end = slang['end']
            
            if keep_original:
                # Format: "slang (normalized)"
                new_text = f"{original} ({replacement})"
            else:
                # Replace entirely
                new_text = replacement
            
            # Replace in text
            normalized_text = normalized_text[:start] + new_text + normalized_text[end:]
        
        return normalized_text, detected
    
    def get_slang_metrics(self, text: str) -> Dict:
        """
        Get slang usage statistics for text
        
        Returns:
            {
                "total_slang": 3,
                "unique_slang": 3,
                "slang_density": 0.15,  # slang_count / word_count
                "detected_terms": ["ngl", "bussin", "fr"],
                "normalized_forms": ["not gonna lie", "really good", "for real"]
            }
        """
        detected = self.detect_slang(text)
        words = text.split()
        
        return {
            "total_slang": len(detected),
            "unique_slang": len(set(s['original'] for s in detected)),
            "slang_density": len(detected) / len(words) if words else 0,
            "detected_terms": [s['text'] for s in detected],
            "normalized_forms": [s['normalized'] for s in detected]
        }


# Convenience function
def normalize_slang(text: str, keep_original: bool = False) -> Tuple[str, List[Dict]]:
    """
    Normalize slang in text
    
    Args:
        text: Input text with slang
        keep_original: If True, keeps original slang with normalized form
    
    Returns:
        (normalized_text, detected_slang_list)
    """
    normalizer = SlangNormalizer.get_instance()
    return normalizer.normalize_text(text, keep_original)

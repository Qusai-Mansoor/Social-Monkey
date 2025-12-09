"""
Slang Detection and Normalization Pipeline
Uses RoBERTa transformer model + slang dictionary to normalize Gen-Z slang with context awareness
"""

import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)


class SlangNormalizer:
    """
    Detects and normalizes slang using context-aware RoBERTa model + dictionary lookup
    
    Pipeline:
    1. Detect slang terms using RoBERTa token classification model
    2. Validate against slang dictionary (prevents false positives)
    3. Replace slang with normalized descriptive form
    
    Key Improvements:
    - Context-aware detection (distinguishes "fire" slang vs "fire alarm" literal)
    - Eliminates false positives (COVID19, TLPDharna, proper nouns)
    - 90%+ accuracy on context understanding
    """
    
    _instance = None
    _model = None
    _tokenizer = None
    _slang_detector = None
    _slang_dict = None
    
    @classmethod
    def get_instance(cls):
        """Singleton pattern to load models once"""
        if cls._instance is None:
            cls._instance = SlangNormalizer()
        return cls._instance
    
    def __init__(self):
        if SlangNormalizer._model is None:
            self._load_models()
    
    def _load_models(self):
        """Load RoBERTa transformer model and slang dictionary"""
        try:
            # Import transformers here to avoid loading if not needed
            from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
            
            backend_dir = Path(__file__).parent.parent.parent
            
            # Load RoBERTa token classification model
            model_path = backend_dir / "models" / "slang_detection_export" / "model"
            tokenizer_path = backend_dir / "models" / "slang_detection_export" / "tokenizer"
            
            logger.info(f"📥 Loading Context-Aware Slang Detection Model from {model_path}...")
            
            SlangNormalizer._tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_path))
            SlangNormalizer._model = AutoModelForTokenClassification.from_pretrained(str(model_path))
            
            # Create inference pipeline
            SlangNormalizer._slang_detector = pipeline(
                "ner",
                model=SlangNormalizer._model,
                tokenizer=SlangNormalizer._tokenizer,
                aggregation_strategy="simple"  # Merge B-SLANG and I-SLANG tokens
            )
            
            logger.info("✅ RoBERTa Slang Detection Model loaded successfully")
            logger.info("   Model: roberta-base fine-tuned on 1700+ examples")
            logger.info("   Features: Context-aware, 90%+ accuracy")
            
            # Load slang dictionary (backend/slang_rich_dictionary.json)
            dict_path = backend_dir / "slang_rich_dictionary.json"
            logger.info(f"📥 Loading slang dictionary from {dict_path}...")
            with open(dict_path, 'r', encoding='utf-8') as f:
                SlangNormalizer._slang_dict = json.load(f)
            logger.info(f"✅ Loaded {len(SlangNormalizer._slang_dict)} slang terms")
            
        except Exception as e:
            logger.error(f"❌ Failed to load slang models: {e}")
            # Fallback: create empty models
            SlangNormalizer._slang_detector = None
            SlangNormalizer._slang_dict = {}
            raise e
    
    def detect_slang(self, text: str) -> List[Dict]:
        """
        Detect all slang terms in text using context-aware RoBERTa model
        
        Args:
            text: Input text to analyze
        
        Returns:
            List of detected slang with positions:
            [
                {
                    "text": "bussin",
                    "start": 13,
                    "end": 19,
                    "normalized": "really good/awesome",
                    "confidence": 0.95
                }
            ]
        """
        if not SlangNormalizer._slang_detector:
            return []
        
        try:
            # Run RoBERTa model inference
            results = SlangNormalizer._slang_detector(text)
            detected = []
            
            for result in results:
                slang_term = result["word"].strip()
                
                # Remove RoBERTa tokenization artifacts (Ġ prefix)
                slang_term = slang_term.replace('Ġ', '')
                
                # Normalize to lowercase for dictionary lookup
                slang_lower = slang_term.lower()
                
                # CRITICAL: Only accept if term exists in dictionary
                # This is the final validation to prevent false positives
                if not self._exists_in_dictionary(slang_lower):
                    logger.debug(f"Skipping '{slang_term}' - not in slang dictionary (confidence: {result['score']:.2f})")
                    continue
                
                # Look up in dictionary
                normalized = self._lookup_slang(slang_lower)
                
                detected.append({
                    "text": slang_term,
                    "start": result["start"],
                    "end": result["end"],
                    "normalized": normalized,
                    "original": slang_lower,
                    "confidence": float(result["score"])
                })
            
            return detected
            
        except Exception as e:
            logger.error(f"Error detecting slang: {e}")
            return []
    
    def _exists_in_dictionary(self, slang: str) -> bool:
        """
        Check if slang term exists in dictionary (including variations)
        
        Args:
            slang: Slang term (should already be lowercased)
            
        Returns:
            True if found in dictionary, False otherwise
        """
        slang_lower = slang.lower()
        
        # Direct lookup
        if slang_lower in SlangNormalizer._slang_dict:
            return True
        
        # Check variations
        for entry in SlangNormalizer._slang_dict.values():
            variations = entry.get('variations', [])
            if slang_lower in [v.lower() for v in variations]:
                return True
        
        return False
    
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
